use crate::types::*;
use serde_json::{json, Value as JsonValue};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

// Configuration files to scan
const CONFIG_PATTERNS: &[&str] = &[
    "package.json",
    "tauri.conf.json",
    "Cargo.toml",
    "vite.config.ts",
    "tailwind.config.js",
    "tsconfig.json",
    "tsconfig.node.json",
    ".eslintrc.json",
    ".prettierrc",
    "postcss.config.js",
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
];

// File extensions to scan
const CONFIG_EXTENSIONS: &[&str] = &["json", "toml", "yaml", "yml", "ts", "js", "mts", "cts"];

pub struct ConfigGraphState {
    pub project_root: PathBuf,
}

impl Default for ConfigGraphState {
    fn default() -> Self {
        // Get the project root (parent of src-tauri)
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
        let project_root = PathBuf::from(manifest_dir)
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));
        
        ConfigGraphState { project_root }
    }
}

#[tauri::command]
pub async fn scan_config_files(state: State<'_, ConfigGraphState>) -> Result<Vec<ConfigFile>, String> {
    let mut config_files = Vec::new();
    
    scan_directory(&state.project_root, &mut config_files, 0, 4)?;
    
    Ok(config_files)
}

fn scan_directory(
    dir: &Path,
    config_files: &mut Vec<ConfigFile>,
    depth: usize,
    max_depth: usize,
) -> Result<(), String> {
    if depth > max_depth {
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        
        // Skip hidden directories and node_modules, target, dist, etc.
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') && name != ".github" && name != ".vscode" && name != ".qwen" {
                continue;
            }
            if name == "node_modules" || name == "target" || name == "dist" || name == ".git" {
                continue;
            }
        }

        if path.is_dir() {
            scan_directory(&path, config_files, depth + 1, max_depth)?;
        } else if path.is_file() {
            if let Some(config_file) = parse_config_file(&path) {
                config_files.push(config_file);
            }
        }
    }

    Ok(())
}

fn parse_config_file(path: &Path) -> Option<ConfigFile> {
    let _file_name = path.file_name()?.to_str()?;
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    let file_type = match extension {
        "json" => ConfigFileType::Json,
        "toml" => ConfigFileType::Toml,
        "yaml" => ConfigFileType::Yaml,
        "yml" => ConfigFileType::Yml,
        "ts" | "mts" | "cts" => ConfigFileType::Ts,
        "js" | "mjs" | "cjs" => ConfigFileType::Js,
        _ => ConfigFileType::Other,
    };

    // Skip if not a config file type
    if matches!(file_type, ConfigFileType::Other) {
        return None;
    }

    // Get file metadata
    let metadata = fs::metadata(path).ok()?;
    let size = metadata.len();
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Extract keys from config files
    let keys = extract_keys(path, &file_type);

    Some(ConfigFile {
        path: path.to_string_lossy().to_string(),
        file_type,
        size,
        modified,
        keys,
    })
}

fn extract_keys(path: &Path, file_type: &ConfigFileType) -> Vec<String> {
    let content = fs::read_to_string(path).unwrap_or_default();
    
    match file_type {
        ConfigFileType::Json => extract_json_keys(&content),
        ConfigFileType::Toml => extract_toml_keys(&content),
        ConfigFileType::Yaml | ConfigFileType::Yml => extract_yaml_keys(&content),
        ConfigFileType::Ts | ConfigFileType::Js => extract_ts_js_keys(&content, path),
        ConfigFileType::Other => Vec::new(),
    }
}

fn extract_json_keys(content: &str) -> Vec<String> {
    let mut keys = Vec::new();
    
    if let Ok(value) = serde_json::from_str::<JsonValue>(content) {
        extract_json_keys_recursive(&value, &mut keys, "");
    }
    
    keys
}

fn extract_json_keys_recursive(value: &JsonValue, keys: &mut Vec<String>, prefix: &str) {
    match value {
        JsonValue::Object(obj) => {
            for (key, val) in obj {
                let full_key = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", prefix, key)
                };
                keys.push(full_key.clone());
                extract_json_keys_recursive(val, keys, &full_key);
            }
        }
        JsonValue::Array(arr) => {
            for (i, val) in arr.iter().enumerate() {
                extract_json_keys_recursive(val, keys, &format!("{}[{}]", prefix, i));
            }
        }
        _ => {}
    }
}

fn extract_toml_keys(content: &str) -> Vec<String> {
    let mut keys = Vec::new();
    
    for line in content.lines() {
        let line = line.trim();
        
        // Skip comments and empty lines
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        
        // Table headers [section]
        if line.starts_with('[') && line.ends_with(']') {
            let section = line[1..line.len()-1].trim();
            keys.push(section.to_string());
            continue;
        }
        
        // Key-value pairs
        if let Some(eq_pos) = line.find('=') {
            let key = line[..eq_pos].trim();
            if !key.is_empty() {
                keys.push(key.to_string());
            }
        }
    }
    
    keys
}

fn extract_yaml_keys(content: &str) -> Vec<String> {
    let mut keys = Vec::new();
    
    for line in content.lines() {
        // Skip comments and empty lines
        if line.trim().starts_with('#') || line.trim().is_empty() {
            continue;
        }
        
        // Look for key: value patterns
        if let Some(colon_pos) = line.find(':') {
            let key = line[..colon_pos].trim();
            if !key.is_empty() && !key.starts_with('-') {
                keys.push(key.to_string());
            }
        }
    }
    
    keys
}

fn extract_ts_js_keys(content: &str, path: &Path) -> Vec<String> {
    let mut keys = Vec::new();
    
    // Check for export default config
    if content.contains("export default") {
        keys.push("export default".to_string());
    }
    
    // Check for module.exports
    if content.contains("module.exports") {
        keys.push("module.exports".to_string());
    }
    
    // Check for common config patterns
    if content.contains("defineConfig") {
        keys.push("defineConfig".to_string());
    }
    
    // Check for const exports
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("export const ") || line.starts_with("const ") {
            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim();
                let key = key.replace("export const ", "").replace("const ", "");
                if !key.is_empty() {
                    keys.push(key.to_string());
                }
            }
        }
    }
    
    // Add file-specific keys based on filename
    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
        if file_name.contains("vite") {
            keys.extend_from_slice(&["server".to_string(), "build".to_string(), "plugins".to_string(), "resolve".to_string()]);
        } else if file_name.contains("tailwind") {
            keys.extend_from_slice(&["content".to_string(), "theme".to_string(), "plugins".to_string(), "darkMode".to_string()]);
        } else if file_name.contains("tsconfig") {
            keys.extend_from_slice(&["compilerOptions".to_string(), "include".to_string(), "exclude".to_string()]);
        }
    }
    
    keys
}

#[tauri::command]
pub async fn get_config_dependencies(state: State<'_, ConfigGraphState>) -> Result<GraphData, String> {
    let config_files = scan_config_files(state.clone()).await?;
    
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    
    // Add environment node
    nodes.push(GraphNode {
        id: "env:development".to_string(),
        label: "Development".to_string(),
        node_type: GraphNodeType::Environment,
        metadata: json!({
            "description": "Development environment configuration"
        }),
    });
    
    nodes.push(GraphNode {
        id: "env:production".to_string(),
        label: "Production".to_string(),
        node_type: GraphNodeType::Environment,
        metadata: json!({
            "description": "Production environment configuration"
        }),
    });
    
    // Add config file nodes
    for config in &config_files {
        let node_id = format!("file:{}", config.path);
        let file_name = Path::new(&config.path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
        
        let file_type_str = match &config.file_type {
            ConfigFileType::Json => "JSON",
            ConfigFileType::Toml => "TOML",
            ConfigFileType::Yaml => "YAML",
            ConfigFileType::Yml => "YML",
            ConfigFileType::Ts => "TypeScript",
            ConfigFileType::Js => "JavaScript",
            ConfigFileType::Other => "Other",
        };
        
        nodes.push(GraphNode {
            id: node_id.clone(),
            label: file_name.to_string(),
            node_type: GraphNodeType::File,
            metadata: json!({
                "path": config.path,
                "fileType": file_type_str,
                "size": config.size,
                "keys": config.keys,
                "modified": config.modified
            }),
        });
        
        // Connect files to environments based on patterns
        if config.path.contains("vite") || config.path.contains("tsconfig") {
            edges.push(GraphEdge {
                source: "env:development".to_string(),
                target: node_id.clone(),
                edge_type: "uses".to_string(),
                label: Some("dev".to_string()),
            });
        }
        
        if config.path.contains("package") || config.path.contains("Cargo") {
            edges.push(GraphEdge {
                source: "env:production".to_string(),
                target: node_id.clone(),
                edge_type: "uses".to_string(),
                label: Some("build".to_string()),
            });
        }
    }
    
    // Add edges between related files
    let file_pairs: Vec<(&str, &str)> = vec![
        ("package.json", "tsconfig.json"),
        ("vite.config.ts", "package.json"),
        ("tailwind.config.js", "package.json"),
        ("Cargo.toml", "tauri.conf.json"),
        ("vite.config.ts", "tauri.conf.json"),
    ];
    
    for (file1, file2) in file_pairs {
        let node1_id = config_files
            .iter()
            .find(|c| c.path.ends_with(file1))
            .map(|c| format!("file:{}", c.path));
        let node2_id = config_files
            .iter()
            .find(|c| c.path.ends_with(file2))
            .map(|c| format!("file:{}", c.path));
        
        if let (Some(id1), Some(id2)) = (node1_id, node2_id) {
            edges.push(GraphEdge {
                source: id1,
                target: id2,
                edge_type: "relates".to_string(),
                label: Some("references".to_string()),
            });
        }
    }
    
    Ok(GraphData { nodes, edges })
}

#[tauri::command]
pub fn get_config_content(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn search_config_usage(
    key: String,
    state: State<'_, ConfigGraphState>,
) -> Result<Vec<ConfigSearchResult>, String> {
    let config_files = scan_config_files(state).await?;
    let mut results = Vec::new();
    
    for config in config_files {
        // Check if key matches any in this file
        let matching_keys: Vec<&String> = config
            .keys
            .iter()
            .filter(|k| k.contains(&key) || key.contains(k.as_str()))
            .collect();
        
        if !matching_keys.is_empty() {
            let content = fs::read_to_string(&config.path).unwrap_or_default();
            let usages = find_key_usages(&content, &key, &config.path);
            
            for matching_key in matching_keys {
                let value = extract_value_for_key(&content, matching_key);
                
                results.push(ConfigSearchResult {
                    key: matching_key.clone(),
                    file: config.path.clone(),
                    value,
                    usages: usages.clone(),
                });
            }
        }
    }
    
    Ok(results)
}

fn find_key_usages(content: &str, key: &str, file: &str) -> Vec<UsageLocation> {
    let mut usages = Vec::new();
    
    for (line_num, line) in content.lines().enumerate() {
        if line.contains(key) {
            if let Some(col) = line.find(key) {
                usages.push(UsageLocation {
                    file: file.to_string(),
                    line: Some(line_num + 1),
                    column: Some(col + 1),
                    context: line.trim().to_string(),
                });
            }
        }
    }
    
    usages
}

fn extract_value_for_key(content: &str, key: &str) -> Option<String> {
    // Try to extract value from JSON
    if let Ok(json) = serde_json::from_str::<JsonValue>(content) {
        return extract_json_value(&json, key);
    }
    
    // Try simple key=value extraction
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with(&format!("\"{}\"", key)) || line.starts_with(&format!("{}:", key)) {
            if let Some(eq_pos) = line.find(':') {
                let value = line[eq_pos + 1..].trim();
                return Some(value.trim_matches('"').trim_matches(',').to_string());
            }
        }
    }
    
    None
}

fn extract_json_value(json: &JsonValue, key: &str) -> Option<String> {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = json;
    
    for part in parts {
        match current {
            JsonValue::Object(obj) => {
                current = obj.get(part)?;
            }
            JsonValue::Array(arr) => {
                let index: usize = part.trim_matches(|c| c == '[' || c == ']').parse().ok()?;
                current = arr.get(index)?;
            }
            _ => return None,
        }
    }
    
    Some(current.to_string())
}
