use crate::ssh::SshClient;
use crate::types::ComposeProject;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Cache entry for a single server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeCacheEntry {
    pub projects: Vec<CachedComposeProject>,
    pub last_scan: u64,
    pub scan_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedComposeProject {
    pub name: String,
    pub path: String,
    pub compose_file: String,
}

/// Global cache for compose file discoveries
pub struct ComposeDiscoveryCache {
    cache: Arc<Mutex<HashMap<String, ComposeCacheEntry>>>,
    cache_dir: PathBuf,
}

impl ComposeDiscoveryCache {
    pub fn new() -> Self {
        let cache_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("dpanel");

        // Create cache directory if it doesn't exist
        if let Err(e) = fs::create_dir_all(&cache_dir) {
            log::warn!("Failed to create cache directory: {}", e);
        }

        ComposeDiscoveryCache {
            cache: Arc::new(Mutex::new(HashMap::new())),
            cache_dir,
        }
    }

    fn cache_file_path(&self, server_id: &str) -> PathBuf {
        self.cache_dir.join(format!("compose_cache_{}.json", server_id))
    }

    pub async fn get(&self, server_id: &str) -> Option<ComposeCacheEntry> {
        // Try in-memory cache first
        {
            let cache = self.cache.lock().await;
            if let Some(entry) = cache.get(server_id) {
                return Some(entry.clone());
            }
        }

        // Try disk cache
        let cache_path = self.cache_file_path(server_id);
        if cache_path.exists() {
            if let Ok(content) = fs::read_to_string(&cache_path) {
                if let Ok(entry) = serde_json::from_str::<ComposeCacheEntry>(&content) {
                    // Load into memory
                    let mut cache = self.cache.lock().await;
                    cache.insert(server_id.to_string(), entry.clone());
                    return Some(entry);
                }
            }
        }

        None
    }

    pub async fn set(&self, server_id: &str, entry: ComposeCacheEntry) -> Result<(), String> {
        // Save to in-memory cache
        {
            let mut cache = self.cache.lock().await;
            cache.insert(server_id.to_string(), entry.clone());
        }

        // Save to disk
        let cache_path = self.cache_file_path(server_id);
        let content = serde_json::to_string_pretty(&entry)
            .map_err(|e| format!("Failed to serialize cache: {}", e))?;

        fs::write(&cache_path, content)
            .map_err(|e| format!("Failed to write cache file: {}", e))?;

        Ok(())
    }

    pub async fn invalidate(&self, server_id: &str) {
        let mut cache = self.cache.lock().await;
        cache.remove(server_id);

        let cache_path = self.cache_file_path(server_id);
        let _ = fs::remove_file(cache_path);
    }
}

impl Default for ComposeDiscoveryCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Scan for Docker Compose files on the remote server
pub async fn scan_compose_files(
    client: &SshClient,
    cache: &ComposeDiscoveryCache,
    server_id: &str,
) -> Result<Vec<ComposeProject>, String> {
    // Check cache first (valid for 24 hours)
    if let Some(entry) = cache.get(server_id).await {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Cache valid for 24 hours (86400 seconds)
        if now - entry.last_scan < 86400 {
            log::info!("Using cached compose files for server {}", server_id);
            return compose_projects_from_cache(client, &entry).await;
        }
    }

    // Perform fresh scan
    log::info!("Scanning for compose files on server {}", server_id);
    scan_and_cache(client, cache, server_id).await
}

async fn compose_projects_from_cache(
    client: &SshClient,
    entry: &ComposeCacheEntry,
) -> Result<Vec<ComposeProject>, String> {
    let mut projects = Vec::new();

    for cached in &entry.projects {
        let content = client
            .execute_command(&format!("cat '{}'", cached.path))
            .unwrap_or_else(|_| "Unable to read file".to_string());

        // Extract services from compose file
        let services = extract_services_from_content(&content);

        projects.push(ComposeProject {
            name: cached.name.clone(),
            path: cached.path.clone(),
            services,
            content,
        });
    }

    Ok(projects)
}

async fn scan_and_cache(
    client: &SshClient,
    cache: &ComposeDiscoveryCache,
    server_id: &str,
) -> Result<Vec<ComposeProject>, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Scan common locations with limited depth
    let scan_paths = vec![
        "/home/*/",
        "/opt/",
        "/srv/",
    ];

    let mut all_projects = Vec::new();
    let mut cached_projects = Vec::new();

    for base_path in &scan_paths {
        // Find compose files with limited depth (3 levels)
        let find_command = format!(
            "find {} -maxdepth 3 -type f \\( -name 'docker-compose.yml' -o -name 'docker-compose.yaml' -o -name 'compose.yml' -o -name 'compose.yaml' \\) 2>/dev/null",
            base_path
        );

        let output = client.execute_command(&find_command).unwrap_or_default();

        for path in output.lines() {
            if path.is_empty() {
                continue;
            }

            let path = path.trim();

            // Extract project name from parent directory
            let name = std::path::Path::new(path)
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();

            // Read compose file content
            let content = client
                .execute_command(&format!("cat '{}'", path))
                .unwrap_or_else(|_| "Unable to read file".to_string());

            // Extract services from compose file
            let services = extract_services_from_content(&content);

            all_projects.push(ComposeProject {
                name: name.clone(),
                path: path.to_string(),
                services: services.clone(),
                content: content.clone(),
            });

            cached_projects.push(CachedComposeProject {
                name,
                path: path.to_string(),
                compose_file: path.to_string(),
            });
        }
    }

    // Update cache
    let cache_entry = ComposeCacheEntry {
        projects: cached_projects,
        last_scan: now,
        scan_paths: scan_paths.into_iter().map(|s| s.to_string()).collect(),
    };

    if let Err(e) = cache.set(server_id, cache_entry).await {
        log::warn!("Failed to cache compose files: {}", e);
    }

    Ok(all_projects)
}

/// Extract service names from docker-compose file content
fn extract_services_from_content(content: &str) -> Vec<String> {
    let mut services = Vec::new();
    let mut in_services = false;
    let mut indent_level = 0;

    for line in content.lines() {
        let trimmed = line.trim_start();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Check for services: section
        if trimmed.starts_with("services:") {
            in_services = true;
            // Calculate the indent level of the services key
            indent_level = line.len() - trimmed.len();
            continue;
        }

        if in_services {
            // Check if we've exited the services section
            let current_indent = line.len() - trimmed.len();

            // If we're at or before the services indent level and it's a top-level key, exit
            if current_indent <= indent_level && trimmed.contains(':') && !trimmed.starts_with('-') {
                // Check if it's not a service definition (no proper indentation for service)
                if !trimmed.starts_with(|c: char| c.is_alphabetic()) || current_indent < indent_level {
                    in_services = false;
                    continue;
                }
            }

            // Look for service names (keys at services indent + 2 spaces typically)
            if current_indent > indent_level && trimmed.contains(':') {
                let service_name = trimmed.split(':').next().unwrap_or("").trim();
                if !service_name.is_empty() && !service_name.starts_with('-') {
                    services.push(service_name.to_string());
                }
            }
        }
    }

    services
}

/// Force refresh the compose file scan
pub async fn refresh_compose_scan(
    client: &SshClient,
    cache: &ComposeDiscoveryCache,
    server_id: &str,
) -> Result<Vec<ComposeProject>, String> {
    // Invalidate cache first
    cache.invalidate(server_id).await;

    // Perform fresh scan
    scan_and_cache(client, cache, server_id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_services_simple() {
        let content = r#"
version: '3'
services:
  web:
    image: nginx
  db:
    image: postgres
"#;
        let services = extract_services_from_content(content);
        assert_eq!(services, vec!["web", "db"]);
    }

    #[test]
    fn test_extract_services_with_config() {
        let content = r#"
version: '3'
services:
  web:
    image: nginx
    ports:
      - "80:80"
  db:
    image: postgres
    environment:
      - POSTGRES_PASSWORD=secret
volumes:
  db_data:
"#;
        let services = extract_services_from_content(content);
        assert_eq!(services, vec!["web", "db"]);
    }
}
