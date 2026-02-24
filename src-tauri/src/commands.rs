use crate::compose_discovery::{ComposeDiscoveryCache, scan_compose_files, refresh_compose_scan};
use crate::ssh::SshClient;
use crate::types::*;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;

const STORE_FILENAME: &str = "server_profiles.json";
const PROFILES_KEY: &str = "server_profiles";
const MAX_HISTORY_POINTS: usize = 10; // Optimized: reduced for better performance

fn profiles_from_json(value: Option<JsonValue>) -> HashMap<String, SavedServerProfile> {
    match value {
        Some(JsonValue::Object(obj)) => {
            obj.into_iter()
                .filter_map(|(k, v)| {
                    serde_json::from_value::<SavedServerProfile>(v)
                        .ok()
                        .map(|profile| (k, profile))
                })
                .collect()
        }
        _ => HashMap::new(),
    }
}

fn profiles_to_json(profiles: &HashMap<String, SavedServerProfile>) -> JsonValue {
    let obj: serde_json::Map<String, JsonValue> = profiles
        .iter()
        .filter_map(|(k, v)| {
            serde_json::to_value(v).ok().map(|value| (k.clone(), value))
        })
        .collect();
    JsonValue::Object(obj)
}

pub struct AppState {
    pub ssh_client: Mutex<Option<Arc<SshClient>>>,
    pub server_profiles: Mutex<HashMap<String, ServerProfile>>,
    pub cpu_history: Mutex<Vec<f64>>,
    pub memory_history: Mutex<Vec<f64>>,
    pub network_history: Mutex<Vec<NetworkHistoryPoint>>,
    pub last_network_stats: Mutex<Option<NetworkStats>>,
    pub compose_cache: Arc<ComposeDiscoveryCache>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            ssh_client: Mutex::new(None),
            server_profiles: Mutex::new(HashMap::new()),
            cpu_history: Mutex::new(Vec::with_capacity(30)),
            memory_history: Mutex::new(Vec::with_capacity(30)),
            network_history: Mutex::new(Vec::with_capacity(30)),
            last_network_stats: Mutex::new(None),
            compose_cache: Arc::new(ComposeDiscoveryCache::new()),
        }
    }
}

#[tauri::command]
pub fn test_connection(
    host: String,
    port: u16,
    username: String,
    auth_method: AuthMethod,
) -> Result<ConnectionResult, String> {
    let profile = ServerProfile {
        id: "test".to_string(),
        name: "test".to_string(),
        host,
        port,
        username,
        auth_method,
    };

    let client = SshClient::new(profile);
    match client.connect() {
        Ok(_) => {
            client.disconnect();
            Ok(ConnectionResult {
                success: true,
                message: "Connection successful".to_string(),
            })
        }
        Err(e) => Ok(ConnectionResult {
            success: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn connect_to_server(
    profile: ServerProfile,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<ConnectionResult, String> {
    let client = Arc::new(SshClient::new(profile.clone()));
    match client.connect() {
        Ok(_) => {
            // Save to in-memory state
            let mut profiles = state.server_profiles.lock().await;
            profiles.insert(profile.id.clone(), profile.clone());

            // Save to persistent storage
            let mut saved_profile: SavedServerProfile = SavedServerProfile::from(profile.clone());
            if let Ok(store) = app.store(STORE_FILENAME) {
                let mut profiles_map = profiles_from_json(store.get(PROFILES_KEY));
                
                // Preserve existing metadata if profile already exists
                if let Some(existing) = profiles_map.get(&profile.id) {
                    let mut updated = saved_profile;
                    updated.created_at = existing.created_at;
                    updated.connect_on_startup = existing.connect_on_startup;
                    saved_profile = updated;
                }
                
                // Update last_connected timestamp
                let mut final_profile = saved_profile;
                final_profile.last_connected = Some(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64
                );
                
                profiles_map.insert(profile.id.clone(), final_profile);
                store.set(PROFILES_KEY, profiles_to_json(&profiles_map));
                store.save().map_err(|e| format!("Failed to save profile: {}", e))?;
            }

            let mut ssh_client = state.ssh_client.lock().await;
            *ssh_client = Some(client);
            Ok(ConnectionResult {
                success: true,
                message: "Connected successfully".to_string(),
            })
        }
        Err(e) => Ok(ConnectionResult {
            success: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn disconnect_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut ssh_client = state.ssh_client.lock().await;
    if let Some(client) = ssh_client.take() {
        client.disconnect();
    }
    Ok(())
}

#[tauri::command]
pub async fn get_system_metrics(state: State<'_, AppState>) -> Result<SystemMetrics, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Execute independent commands in parallel using threads
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let cpu_handle = std::thread::spawn(move || {
        client_clone.execute_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let mem_handle = std::thread::spawn(move || {
        client_clone.execute_command("free -b | grep Mem | awk '{print $3,$2}'")
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let disk_handle = std::thread::spawn(move || {
        client_clone.execute_command("df -B1 | tail -n +2 | awk '{print $6,$3,$2,$5}' | grep -E '^/'")
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let load_handle = std::thread::spawn(move || {
        client_clone.execute_command("cat /proc/loadavg | awk '{print $1,$2,$3}'")
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let uptime_handle = std::thread::spawn(move || {
        client_clone.execute_command("cat /proc/uptime | awk '{print int($1)}'")
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let proc_handle = std::thread::spawn(move || {
        client_clone.execute_command("ps aux | wc -l")
    });

    let cpu_output = cpu_handle.join().unwrap().map_err(|e| e.message)?;
    let cpu_percent: f64 = cpu_output.trim().parse().unwrap_or(0.0);

    let mem_output = mem_handle.join().unwrap().map_err(|e| e.message)?;
    let mem_parts: Vec<&str> = mem_output.trim().split_whitespace().collect();
    let memory_used: u64 = mem_parts.get(0).and_then(|s: &&str| s.parse().ok()).unwrap_or(0);
    let memory_total: u64 = mem_parts.get(1).and_then(|s: &&str| s.parse().ok()).unwrap_or(0);

    let disk_output = disk_handle.join().unwrap().map_err(|e| e.message)?;
    let mut disk_usage = Vec::new();
    for line in disk_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let mount_point = parts[0].to_string();
            let used: u64 = parts[1].parse().unwrap_or(0);
            let total: u64 = parts[2].parse().unwrap_or(0);
            let percent_str = parts[3].trim_end_matches('%');
            let percent: f64 = percent_str.parse().unwrap_or(0.0);
            disk_usage.push(DiskUsage {
                mount_point,
                used,
                total,
                percent,
            });
        }
    }

    let load_output = load_handle.join().unwrap().map_err(|e| e.message)?;
    let load_parts: Vec<f64> = load_output
        .trim()
        .split_whitespace()
        .filter_map(|s: &str| s.parse().ok())
        .collect();
    let load_avg = [
        load_parts.get(0).copied().unwrap_or(0.0),
        load_parts.get(1).copied().unwrap_or(0.0),
        load_parts.get(2).copied().unwrap_or(0.0),
    ];

    let uptime_output = uptime_handle.join().unwrap().map_err(|e| e.message)?;
    let uptime: u64 = uptime_output.trim().parse().unwrap_or(0);

    let proc_output = proc_handle.join().unwrap().map_err(|e| e.message)?;
    let process_count: u32 = proc_output.trim().parse().unwrap_or(0);

    // Fetch network stats - use more robust parsing
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let network_handle = std::thread::spawn(move || {
        // Parse /proc/net/dev more reliably - get the primary interface
        client_clone.execute_command("cat /proc/net/dev | grep -E '^\\s*(eth|en|wl)' | head -n 1 | awk -F: '{print $2}' | awk '{print $1,$2,$9,$10}'")
    });

    let network_output = network_handle.join().unwrap().map_err(|e| e.message)?;
    let net_parts: Vec<&str> = network_output.trim().split_whitespace().collect();
    let bytes_recv: u64 = net_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0);
    let packets_recv: u64 = net_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    let bytes_sent: u64 = net_parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
    let packets_sent: u64 = net_parts.get(3).and_then(|s| s.parse().ok()).unwrap_or(0);

    // Get primary interface name
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let iface_handle = std::thread::spawn(move || {
        client_clone.execute_command("ip route | grep default | awk '{print $5}' | head -n 1")
    });
    let iface_output = iface_handle.join().unwrap().unwrap_or_else(|_| "eth0".to_string());
    let interface = iface_output.trim().to_string();

    let network = NetworkStats {
        bytes_sent,
        bytes_recv,
        packets_sent,
        packets_recv,
        interface,
    };

    // Update history
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    // CPU History
    {
        let mut cpu_hist = state.cpu_history.lock().await;
        cpu_hist.push(cpu_percent);
        if cpu_hist.len() > MAX_HISTORY_POINTS {
            cpu_hist.remove(0);
        }
    }

    // Memory History
    {
        let mem_percent = if memory_total > 0 {
            (memory_used as f64 / memory_total as f64) * 100.0
        } else {
            0.0
        };
        let mut mem_hist = state.memory_history.lock().await;
        mem_hist.push(mem_percent);
        if mem_hist.len() > MAX_HISTORY_POINTS {
            mem_hist.remove(0);
        }
    }

    // Network History - calculate delta from last reading
    let network_history_point = {
        let mut last_net = state.last_network_stats.lock().await;
        let point = if let Some(ref last) = *last_net {
            NetworkHistoryPoint {
                timestamp,
                bytes_sent: bytes_sent.saturating_sub(last.bytes_sent),
                bytes_recv: bytes_recv.saturating_sub(last.bytes_recv),
            }
        } else {
            NetworkHistoryPoint {
                timestamp,
                bytes_sent: 0,
                bytes_recv: 0,
            }
        };
        *last_net = Some(network.clone());
        point
    };

    {
        let mut net_hist = state.network_history.lock().await;
        net_hist.push(network_history_point);
        if net_hist.len() > MAX_HISTORY_POINTS {
            net_hist.remove(0);
        }
    }

    // Get history snapshots
    let cpu_history = state.cpu_history.lock().await.clone();
    let memory_history = state.memory_history.lock().await.clone();
    let network_history = state.network_history.lock().await.clone();

    Ok(SystemMetrics {
        cpu_percent,
        memory_used,
        memory_total,
        disk_usage,
        load_avg,
        uptime,
        process_count,
        network,
        cpu_history,
        memory_history,
        network_history,
    })
}

#[tauri::command]
pub async fn get_docker_containers(state: State<'_, AppState>) -> Result<Vec<DockerContainer>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Execute both commands using threads
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let ps_handle = std::thread::spawn(move || {
        client_clone.execute_command(
            "docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}' --no-trunc",
        )
    });
    
    let client_clone: Arc<SshClient> = Arc::clone(client);
    let stats_handle = std::thread::spawn(move || {
        client_clone.execute_command(
            "docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}'"
        )
    });

    let ps_output = ps_handle.join().unwrap().map_err(|e| e.message)?;
    let mut containers = Vec::new();
    for line in ps_output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 {
            containers.push(DockerContainer {
                id: parts[0].to_string(),
                name: parts[1].to_string(),
                image: parts[2].to_string(),
                status: parts[3].to_string(),
                state: parts[4].to_string(),
                cpu_percent: 0.0,
                memory_usage: 0,
                memory_limit: 0,
                ports: Vec::new(),
            });
        }
    }

    let stats_output = stats_handle.join().unwrap().map_err(|e| e.message)?;
    for line in stats_output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            if let Some(container) = containers.iter_mut().find(|c| c.name == parts[0]) {
                container.cpu_percent = parts[1].trim_end_matches('%').parse().unwrap_or(0.0);
                let mem_parts: Vec<&str> = parts[2].split('/').collect();
                if mem_parts.len() >= 2 {
                    container.memory_usage = parse_memory(mem_parts[0]);
                    container.memory_limit = parse_memory(mem_parts[1]);
                }
            }
        }
    }

    Ok(containers)
}

fn parse_memory(mem_str: &str) -> u64 {
    let mem_str = mem_str.trim().to_uppercase();
    
    // Handle various memory formats: "1.5GiB", "1.5GB", "100MiB", "100MB", "100 MiB", "100 MB"
    if mem_str.contains("GIB") || mem_str.contains("GB") {
        let value_str = mem_str.replace("GIB", " ").replace("GB", " ");
        let value: f64 = value_str.trim().parse().unwrap_or(0.0);
        (value * 1024.0 * 1024.0 * 1024.0) as u64
    } else if mem_str.contains("MIB") || mem_str.contains("MB") {
        let value_str = mem_str.replace("MIB", " ").replace("MB", " ");
        let value: f64 = value_str.trim().parse().unwrap_or(0.0);
        (value * 1024.0 * 1024.0) as u64
    } else if mem_str.contains("KIB") || mem_str.contains("KB") {
        let value_str = mem_str.replace("KIB", " ").replace("KB", " ");
        let value: f64 = value_str.trim().parse().unwrap_or(0.0);
        (value * 1024.0) as u64
    } else {
        // Assume bytes if no unit
        let value_str = mem_str.replace("B", " ");
        let value: f64 = value_str.trim().parse().unwrap_or(0.0);
        value as u64
    }
}

#[tauri::command]
pub async fn docker_container_action(
    action: String,
    container_name: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("docker {} {}", action, container_name);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_container_logs(
    container_name: String,
    lines: Option<u32>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let lines = lines.unwrap_or(100);
    let command = format!("docker logs --tail {} {}", lines, container_name);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_services(state: State<'_, AppState>) -> Result<Vec<ServiceInfo>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let output = client
        .execute_command("systemctl list-units --type=service --all --no-pager --no-legend --plain")
        .map_err(|e| e.message)?;

    let mut services = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            services.push(ServiceInfo {
                name: parts[0].to_string(),
                state: parts.get(1).map(|s: &&str| s.to_string()).unwrap_or_default(),
                sub_state: parts.get(2).map(|s: &&str| s.to_string()).unwrap_or_default(),
                description: parts[3..].join(" "),
            });
        }
    }

    Ok(services)
}

#[tauri::command]
pub async fn service_action(
    action: String,
    service_name: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("sudo systemctl {} {}", action, service_name);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_service_logs(
    service_name: String,
    lines: Option<u32>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let lines = lines.unwrap_or(100);
    
    // Try journalctl first (for systemd services with journald)
    let journalctl_cmd = format!("journalctl -u {} -n {} --no-pager 2>&1", service_name, lines);
    let journalctl_result = client.execute_command(&journalctl_cmd);
    
    // If journalctl succeeds and returns content, use it
    if let Ok(output) = journalctl_result {
        if !output.is_empty() && !output.contains("No entries") && !output.contains("cannot open") {
            return Ok(output);
        }
    }
    
    // Fallback: Try common log file locations
    let log_paths = vec![
        format!("/var/log/{}.log", service_name),
        format!("/var/log/{}.log", service_name.replace('-', "")),
        format!("/var/log/{}/{}.log", service_name, service_name),
        format!("/var/log/syslog"),
        format!("/var/log/messages"),
    ];
    
    for log_path in log_paths {
        let tail_cmd = format!("test -f {} && tail -n {} {} 2>&1", log_path, lines, log_path);
        if let Ok(output) = client.execute_command(&tail_cmd) {
            if !output.is_empty() && !output.contains("No such file") {
                return Ok(format!("(From file: {})\n{}", log_path, output));
            }
        }
    }
    
    // Try to find service-specific log directory
    let find_cmd = format!("find /var/log -name '*{}*' -type f 2>/dev/null | head -5", service_name);
    if let Ok(found_files) = client.execute_command(&find_cmd) {
        for file in found_files.lines() {
            if !file.is_empty() {
                let tail_cmd = format!("tail -n {} {} 2>&1", lines, file);
                if let Ok(output) = client.execute_command(&tail_cmd) {
                    if !output.is_empty() {
                        return Ok(format!("(From file: {})\n{}", file, output));
                    }
                }
            }
        }
    }
    
    Err(format!("No logs found for service '{}'. Service may not log to journal or standard log locations.", service_name))
}

#[tauri::command]
pub async fn execute_command(
    command: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn save_server_profile(
    profile: ServerProfile,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Save to in-memory state
    let mut profiles = state.server_profiles.lock().await;
    profiles.insert(profile.id.clone(), profile.clone());

    // Save to persistent storage
    let mut saved_profile: SavedServerProfile = SavedServerProfile::from(profile);
    if let Ok(store) = app.store(STORE_FILENAME) {
        let mut profiles_map = profiles_from_json(store.get(PROFILES_KEY));
        
        // Preserve existing metadata if profile already exists
        if let Some(existing) = profiles_map.get(&saved_profile.id) {
            let mut updated = saved_profile;
            updated.created_at = existing.created_at;
            updated.last_connected = existing.last_connected;
            updated.connect_on_startup = existing.connect_on_startup;
            saved_profile = updated;
        }
        
        profiles_map.insert(saved_profile.id.clone(), saved_profile);
        store.set(PROFILES_KEY, profiles_to_json(&profiles_map));
        store.save().map_err(|e| format!("Failed to save profile: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_server_profiles(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<SavedServerProfile>, String> {
    // Try to load from persistent storage first
    if let Ok(store) = app.store(STORE_FILENAME) {
        let profiles_map = profiles_from_json(store.get(PROFILES_KEY));
        if !profiles_map.is_empty() {
            let profiles: Vec<SavedServerProfile> = profiles_map.values().cloned().collect();
            return Ok(profiles);
        }
    }
    
    // Fallback to in-memory profiles
    let profiles = state.server_profiles.lock().await;
    Ok(profiles.values().map(|p| SavedServerProfile::from(p.clone())).collect())
}

#[tauri::command]
pub async fn delete_server_profile(
    profile_id: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Remove from in-memory state
    let mut profiles = state.server_profiles.lock().await;
    profiles.remove(&profile_id);

    // Remove from persistent storage
    if let Ok(store) = app.store(STORE_FILENAME) {
        let mut profiles_map = profiles_from_json(store.get(PROFILES_KEY));
        if profiles_map.remove(&profile_id).is_some() {
            store.set(PROFILES_KEY, profiles_to_json(&profiles_map));
            store.save().map_err(|e| format!("Failed to delete profile: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn update_server_profile_metadata(
    profile_id: String,
    connect_on_startup: Option<bool>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Ok(store) = app.store(STORE_FILENAME) {
        let mut profiles_map = profiles_from_json(store.get(PROFILES_KEY));
        if let Some(profile) = profiles_map.get_mut(&profile_id) {
            if let Some(value) = connect_on_startup {
                profile.connect_on_startup = value;
            }
            store.set(PROFILES_KEY, profiles_to_json(&profiles_map));
            store.save().map_err(|e| format!("Failed to update profile: {}", e))?;
            return Ok(());
        }
    }
    Err("Profile not found".to_string())
}

#[tauri::command]
pub async fn get_ufw_status(state: State<'_, AppState>) -> Result<UfwStatus, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get UFW status verbose
    let status_output = client
        .execute_command("sudo ufw status verbose 2>&1")
        .map_err(|e| e.message)?;

    let mut active = false;
    let mut logging = "off".to_string();
    let mut default = "deny (incoming), allow (outgoing)".to_string();
    let mut rules: Vec<UfwRule> = Vec::new();

    let lines: Vec<&str> = status_output.lines().collect();
    let mut in_rules = false;

    for line in lines {
        let line = line.trim();
        
        if line.starts_with("Status:") {
            active = line.contains("active");
        } else if line.starts_with("Logging:") {
            logging = line.replace("Logging:", "").trim().to_string();
        } else if line.starts_with("Default:") {
            default = line.replace("Default:", "").trim().to_string();
        } else if line.starts_with("---") {
            in_rules = true;
        } else if in_rules && !line.is_empty() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                // Parse rule line: "22/tcp                     ALLOW       Anywhere"
                let rule_str = parts[0].to_string();
                let action = if parts.len() > 1 { parts[1].to_string() } else { "".to_string() };
                let from = if parts.len() > 2 { parts[2..].join(" ") } else { "Anywhere".to_string() };
                
                // Extract port if present
                let port = rule_str.split('/').nth(1).map(|s| s.to_string());
                
                rules.push(UfwRule {
                    rule: rule_str,
                    to: "Anywhere".to_string(),
                    action,
                    from: from.replace(" (v6)", ""),
                    port,
                });
            }
        }
    }

    Ok(UfwStatus {
        active,
        logging,
        default,
        rules,
    })
}

#[tauri::command]
pub async fn get_ufw_stats(state: State<'_, AppState>) -> Result<UfwStats, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let status_output = client
        .execute_command("sudo ufw status numbered 2>&1")
        .map_err(|e| e.message)?;

    let mut total_rules = 0u32;
    let mut allow_rules = 0u32;
    let mut deny_rules = 0u32;
    let mut limit_rules = 0u32;

    for line in status_output.lines() {
        let line = line.trim();
        if line.contains("ALLOW") {
            total_rules += 1;
            allow_rules += 1;
        } else if line.contains("DENY") {
            total_rules += 1;
            deny_rules += 1;
        } else if line.contains("LIMIT") {
            total_rules += 1;
            limit_rules += 1;
        }
    }

    Ok(UfwStats {
        total_rules,
        allow_rules,
        deny_rules,
        limit_rules,
    })
}

#[tauri::command]
pub async fn ufw_action(
    action: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = match action.as_str() {
        "enable" => "echo 'y' | sudo ufw enable",
        "disable" => "sudo ufw disable",
        "reset" => "echo 'y' | sudo ufw reset",
        "reload" => "sudo ufw reload",
        _ => return Err(format!("Unknown action: {}", action)),
    };

    client.execute_command(command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn ufw_add_rule(
    rule_type: String,
    port: Option<String>,
    from_ip: Option<String>,
    to_ip: Option<String>,
    protocol: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let mut command = String::from("sudo ufw");
    
    // Allow/Deny
    command.push_str(&format!(" {}", rule_type));
    
    // Protocol
    if let Some(proto) = protocol {
        if !proto.is_empty() {
            command.push_str(&format!(" proto {}", proto));
        }
    }
    
    // Port
    if let Some(p) = port {
        if !p.is_empty() {
            command.push_str(&format!(" port {}", p));
        }
    }
    
    // From IP
    if let Some(from) = from_ip {
        if !from.is_empty() && from != "any" {
            command.push_str(&format!(" from {}", from));
        }
    }
    
    // To IP
    if let Some(to) = to_ip {
        if !to.is_empty() && to != "any" {
            command.push_str(&format!(" to {}", to));
        }
    }

    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn ufw_delete_rule(
    rule_number: u32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("echo 'y' | sudo ufw delete {}", rule_number);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn ufw_set_default(
    direction: String,
    policy: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("sudo ufw default {} {}", policy, direction);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn ufw_set_logging(
    level: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("sudo ufw logging {}", level);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_container_details(
    container_name: String,
    state: State<'_, AppState>,
) -> Result<ContainerDetails, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get container inspect data
    let inspect_output = client
        .execute_command(&format!("docker inspect {}", container_name))
        .map_err(|e| e.message)?;

    // Parse JSON manually (simplified parsing)
    let inspect_value: serde_json::Value = serde_json::from_str(&inspect_output)
        .map_err(|e| format!("Failed to parse inspect JSON: {}", e))?;

    let container_data = inspect_value.as_array()
        .and_then(|arr| arr.first())
        .ok_or("No container data found")?;

    let config = container_data.get("Config").ok_or("No config")?;
    let host_config = container_data.get("HostConfig").ok_or("No host config")?;
    let network_settings = container_data.get("NetworkSettings").ok_or("No network settings")?;
    let state_data = container_data.get("State").ok_or("No state")?;

    // Extract environment variables (filter out sensitive ones)
    let env_vars: Vec<String> = config.get("Env")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter()
            .filter_map(|v| v.as_str())
            .filter(|e| !e.contains("PASSWORD") && !e.contains("SECRET") && !e.contains("KEY") && !e.contains("TOKEN"))
            .map(String::from)
            .collect())
        .unwrap_or_default();

    // Extract ports
    let mut ports: Vec<PortMapping> = Vec::new();
    if let Some(port_bindings) = host_config.get("PortBindings").and_then(|v| v.as_object()) {
        for (container_port, bindings) in port_bindings {
            if let Some(binding_arr) = bindings.as_array() {
                for binding in binding_arr {
                    if let Some(obj) = binding.as_object() {
                        ports.push(PortMapping {
                            host_ip: obj.get("HostIp").and_then(|v| v.as_str()).unwrap_or("0.0.0.0").to_string(),
                            host_port: obj.get("HostPort").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            container_port: container_port.split('/').next().unwrap_or("").to_string(),
                            protocol: container_port.split('/').nth(1).unwrap_or("tcp").to_string(),
                        });
                    }
                }
            }
        }
    }

    // Extract networks
    let networks: Vec<String> = network_settings.get("Networks")
        .and_then(|v| v.as_object())
        .map(|obj| obj.keys().cloned().collect())
        .unwrap_or_default();

    // Extract volumes
    let mut volumes: Vec<VolumeMount> = Vec::new();
    if let Some(mounts) = container_data.get("Mounts").and_then(|v| v.as_array()) {
        for mount in mounts {
            volumes.push(VolumeMount {
                source: mount.get("Source").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                destination: mount.get("Destination").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                mode: mount.get("Mode").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            });
        }
    }

    // Extract labels
    let mut labels: Vec<Label> = Vec::new();
    if let Some(labels_obj) = config.get("Labels").and_then(|v| v.as_object()) {
        for (key, value) in labels_obj {
            labels.push(Label {
                key: key.clone(),
                value: value.as_str().unwrap_or("").to_string(),
            });
        }
    }

    let started_at = state_data.get("StartedAt")
        .and_then(|v| v.as_str())
        .map(String::from);

    Ok(ContainerDetails {
        id: container_data.get("Id").and_then(|v| v.as_str()).unwrap_or("").to_string()[..12].to_string(),
        name: container_data.get("Name").and_then(|v| v.as_str()).unwrap_or("").trim_start_matches('/').to_string(),
        image: container_data.get("Image").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        state: state_data.get("Status").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        status: container_data.get("State").and_then(|v| v.get("Status")).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        created: container_data.get("Created").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        started_at,
        env_vars,
        ports,
        networks,
        volumes,
        labels,
        command: config.get("Cmd")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(" "))
            .unwrap_or_default(),
        working_dir: config.get("WorkingDir").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        user: config.get("User").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        restart_policy: host_config.get("RestartPolicy")
            .and_then(|v| v.get("Name"))
            .and_then(|v| v.as_str())
            .unwrap_or("no")
            .to_string(),
        memory_limit: host_config.get("Memory").and_then(|v| v.as_u64())
            .map(|m| if m > 0 { format!("{:.2} GB", m as f64 / 1024.0 / 1024.0 / 1024.0) } else { "Unlimited".to_string() })
            .unwrap_or("Unlimited".to_string()),
        cpu_limit: host_config.get("NanoCpus").and_then(|v| v.as_u64())
            .map(|c| if c > 0 { format!("{:.2} CPUs", c as f64 / 1_000_000_000.0) } else { "Unlimited".to_string() })
            .unwrap_or("Unlimited".to_string()),
    })
}

#[tauri::command]
pub async fn get_docker_volumes(state: State<'_, AppState>) -> Result<Vec<DockerVolume>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let output = client
        .execute_command("docker volume ls --format '{{.Name}}|{{.Driver}}|{{.Mountpoint}}|{{.Scope}}'")
        .map_err(|e| e.message)?;

    let mut volumes: Vec<DockerVolume> = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 4 {
            volumes.push(DockerVolume {
                name: parts[0].to_string(),
                driver: parts[1].to_string(),
                mountpoint: parts[2].to_string(),
                scope: parts[3].to_string(),
                labels: Vec::new(),
            });
        }
    }
    Ok(volumes)
}

#[tauri::command]
pub async fn get_docker_networks(state: State<'_, AppState>) -> Result<Vec<DockerNetwork>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let output = client
        .execute_command("docker network ls --format '{{.ID}}|{{.Name}}|{{.Driver}}|{{.Scope}}'")
        .map_err(|e| e.message)?;

    let mut networks: Vec<DockerNetwork> = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 4 {
            networks.push(DockerNetwork {
                id: parts[0].to_string(),
                name: parts[1].to_string(),
                driver: parts[2].to_string(),
                scope: parts[3].to_string(),
                subnet: None,
                gateway: None,
                containers: Vec::new(),
            });
        }
    }
    Ok(networks)
}

#[tauri::command]
pub async fn get_docker_images(state: State<'_, AppState>) -> Result<Vec<DockerImage>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let output = client
        .execute_command("docker images --format '{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedAt}}' --no-trunc")
        .map_err(|e| e.message)?;

    let mut images: Vec<DockerImage> = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 {
            images.push(DockerImage {
                id: parts[0].to_string(),
                repository: parts[1].to_string(),
                tag: parts[2].to_string(),
                size: 0, // Would need additional parsing
                created: parts[4].to_string(),
                architecture: "amd64".to_string(),
            });
        }
    }
    Ok(images)
}

#[tauri::command]
pub async fn get_container_env(
    container_name: String,
    show_secrets: bool,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let output = client
        .execute_command(&format!("docker inspect --format '{{{{json .Config.Env}}}}' {}", container_name))
        .map_err(|e| e.message)?;

    let env_vars: Vec<String> = serde_json::from_str(&output)
        .unwrap_or_default();

    if show_secrets {
        Ok(env_vars)
    } else {
        // Filter out sensitive variables
        Ok(env_vars.into_iter()
            .filter(|e| !e.contains("PASSWORD") && !e.contains("SECRET") && !e.contains("KEY") && !e.contains("TOKEN"))
            .collect())
    }
}

#[tauri::command]
pub async fn find_compose_files(state: State<'_, AppState>) -> Result<Vec<ComposeProject>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get current server profile to get server ID
    // For now, use host as identifier
    let server_id = client.get_host();

    scan_compose_files(client, &state.compose_cache, &server_id).await
}

#[tauri::command]
pub async fn refresh_compose_files(state: State<'_, AppState>) -> Result<Vec<ComposeProject>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let server_id = client.get_host();

    refresh_compose_scan(client, &state.compose_cache, &server_id).await
}

#[tauri::command]
pub async fn get_container_logs_stream(
    container_name: String,
    lines: u32,
    follow: bool,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = if follow {
        format!("docker logs --tail {} --follow {} 2>&1", lines, container_name)
    } else {
        format!("docker logs --tail {} {} 2>&1", lines, container_name)
    };

    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_ufw_overview(state: State<'_, AppState>) -> Result<UfwOverview, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get UFW status verbose
    let status_output = client
        .execute_command("sudo ufw status verbose 2>&1")
        .map_err(|e| e.message)?;

    // Get UFW numbered for rule numbers
    let _numbered_output = client
        .execute_command("sudo ufw status numbered 2>&1")
        .map_err(|e| e.message)?;

    // Get listening ports
    let listening_output = client
        .execute_command("ss -tlnp 2>&1 | tail -n +2 | awk '{print $4, $6}'")
        .unwrap_or_default();

    let mut active = false;
    let mut open_ports: Vec<PortInfo> = Vec::new();
    let mut blocked_ports: Vec<PortInfo> = Vec::new();
    let mut all_rules: Vec<UfwRule> = Vec::new();
    let mut total_rules = 0u32;
    let mut allow_rules = 0u32;
    let mut deny_rules = 0u32;
    let mut limit_rules = 0u32;

    // Parse listening ports
    let mut listening_ports_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for line in listening_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let addr = parts[0];
            let process = parts[1].trim_matches('"').to_string();
            if let Some(port) = addr.rsplit(':').next() {
                if port.chars().all(|c| c.is_numeric()) {
                    listening_ports_map.insert(port.to_string(), process);
                }
            }
        }
    }

    // Parse rules from verbose output
    let lines: Vec<&str> = status_output.lines().collect();
    let mut in_rules = false;

    for line in lines {
        let line = line.trim();
        
        if line.starts_with("Status:") {
            active = line.contains("active");
        } else if line.starts_with("---") {
            in_rules = true;
        } else if in_rules && !line.is_empty() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let rule_str = parts[0].to_string();
                let action = if parts.len() > 1 { parts[1].to_string() } else { "".to_string() };
                let from = if parts.len() > 2 { parts[2..].join(" ") } else { "Anywhere".to_string() };
                
                // Extract port and protocol
                let port_protocol: Vec<&str> = rule_str.split('/').collect();
                let port = port_protocol.get(0).map(|s| s.to_string()).unwrap_or_default();
                let protocol = port_protocol.get(1).map(|s| s.to_string()).unwrap_or_else(|| "any".to_string());
                
                // Get service name if port is listening
                let service_name = listening_ports_map.get(&port).cloned();
                
                let port_info = PortInfo {
                    port: port.clone(),
                    protocol: protocol.clone(),
                    action: action.clone(),
                    source: from.replace(" (v6)", ""),
                    service_name,
                };

                if action.to_uppercase().contains("ALLOW") || action.to_uppercase() == "ALLOW" {
                    open_ports.push(port_info.clone());
                    allow_rules += 1;
                } else if action.to_uppercase().contains("DENY") || action.to_uppercase() == "DENY" {
                    blocked_ports.push(port_info.clone());
                    deny_rules += 1;
                } else if action.to_uppercase().contains("LIMIT") {
                    open_ports.push(port_info.clone()); // LIMIT is also a form of allowing
                    limit_rules += 1;
                }

                all_rules.push(UfwRule {
                    rule: rule_str,
                    to: "Anywhere".to_string(),
                    action,
                    from: from.replace(" (v6)", ""),
                    port: if port.is_empty() { None } else { Some(port) },
                });

                total_rules += 1;
            }
        }
    }

    Ok(UfwOverview {
        active,
        open_ports,
        blocked_ports,
        all_rules,
        stats: UfwStats {
            total_rules,
            allow_rules,
            deny_rules,
            limit_rules,
        },
    })
}

#[tauri::command]
pub async fn get_listening_ports(state: State<'_, AppState>) -> Result<Vec<PortInfo>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get listening TCP ports
    let output = client
        .execute_command("ss -tlnp 2>&1 | tail -n +2")
        .map_err(|e| e.message)?;

    let mut ports: Vec<PortInfo> = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 6 {
            let local_addr = parts[3];
            let process_info = parts[5].trim_matches('"').to_string();
            
            if let Some(port) = local_addr.rsplit(':').next() {
                if port.chars().all(|c| c.is_numeric()) {
                    // Extract process name
                    let process_name = if process_info.contains("users:") {
                        process_info.split("users:").nth(1)
                            .and_then(|s| s.split('"').nth(1))
                            .unwrap_or("unknown")
                            .to_string()
                    } else {
                        "unknown".to_string()
                    };

                    ports.push(PortInfo {
                        port: port.to_string(),
                        protocol: "tcp".to_string(),
                        action: "listening".to_string(),
                        source: "0.0.0.0".to_string(),
                        service_name: Some(process_name),
                    });
                }
            }
        }
    }

    Ok(ports)
}

// ==================== NGINX COMMANDS ====================

#[tauri::command]
pub async fn nginx_status(state: State<'_, AppState>) -> Result<NginxStatus, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Check if nginx is running with multiple fallback methods
    let is_running = {
        // Method 1: systemctl is-active
        let systemctl_check = client
            .execute_command("systemctl is-active nginx 2>/dev/null || echo 'inactive'")
            .unwrap_or_default()
            .trim()
            .to_string();
        
        if systemctl_check == "active" {
            true
        } else {
            // Method 2: Check if nginx process exists
            let process_check = client
                .execute_command("pgrep -x nginx 2>/dev/null | head -1")
                .unwrap_or_default()
                .trim()
                .to_string();
            
            if !process_check.is_empty() {
                true
            } else {
                // Method 3: Check pid file
                client
                    .execute_command("test -f /run/nginx.pid && echo 'running' || echo 'stopped'")
                    .unwrap_or_default()
                    .trim()
                    .eq("running")
            }
        }
    };

    // Get nginx version
    let version = client
        .execute_command("nginx -v 2>&1 | cut -d'/' -f2")
        .unwrap_or_default()
        .trim()
        .to_string();

    // Get worker processes
    let worker_processes = client
        .execute_command("grep -E '^\\s*worker_processes' /etc/nginx/nginx.conf 2>/dev/null | awk '{print $2}' | tr -d ';'")
        .unwrap_or_else(|_| "auto".to_string())
        .trim()
        .to_string();

    // Test config
    let config_test = client
        .execute_command("nginx -t 2>&1")
        .unwrap_or_else(|e| format!("Config test failed: {}", e.message));

    Ok(NginxStatus {
        running: is_running,
        version,
        worker_processes,
        config_test,
    })
}

#[tauri::command]
pub async fn nginx_action(action: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let command = format!("sudo systemctl {} nginx", action);
    client.execute_command(&command).map_err(|e| e.message)
}

#[tauri::command]
pub async fn nginx_test_config(state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    client.execute_command("sudo nginx -t 2>&1").map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_nginx_config(state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    client.execute_command("cat /etc/nginx/nginx.conf 2>&1").map_err(|e| e.message)
}

#[tauri::command]
pub async fn save_nginx_config(content: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Backup first
    client.execute_command("sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak 2>&1")
        .map_err(|e| e.message)?;

    // Write new config using tee
    let write_cmd = format!("echo '{}' | sudo tee /etc/nginx/nginx.conf > /dev/null", content);
    client.execute_command(&write_cmd).map_err(|e| e.message)?;

    // Test config
    let test_result = client.execute_command("sudo nginx -t 2>&1").map_err(|e| e.message)?;

    if test_result.contains("syntax is ok") && test_result.contains("test is successful") {
        Ok("Config saved and validated. Reload nginx to apply changes.".to_string())
    } else {
        Err(format!("Config saved but test failed: {}", test_result))
    }
}

#[tauri::command]
pub async fn get_nginx_vhosts(state: State<'_, AppState>) -> Result<Vec<NginxVhost>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let mut vhosts = Vec::new();

    // Get sites from sites-available
    let available_output = client
        .execute_command("ls -1 /etc/nginx/sites-available/ 2>/dev/null | grep -v '^default$'")
        .unwrap_or_default();

    // Get enabled sites (symlinks in sites-enabled)
    let enabled_output = client
        .execute_command("ls -1 /etc/nginx/sites-enabled/ 2>/dev/null")
        .unwrap_or_default();

    let enabled_sites: Vec<&str> = enabled_output.lines().collect();

    for name in available_output.lines() {
        if name.is_empty() {
            continue;
        }

        let enabled = enabled_sites.contains(&name);

        // Read config to extract details
        let config = client
            .execute_command(&format!("cat /etc/nginx/sites-available/{}", name))
            .unwrap_or_default();

        // Extract server_name
        let server_name = config
            .lines()
            .find(|l| l.trim().starts_with("server_name"))
            .map(|l| l.split_whitespace().nth(1).unwrap_or("*").trim_end_matches(';'))
            .unwrap_or("*")
            .to_string();

        // Extract listen port
        let listen_port = config
            .lines()
            .find(|l| l.trim().starts_with("listen"))
            .and_then(|l| {
                l.split_whitespace()
                    .nth(1)
                    .map(|s| s.trim_end_matches(';').to_string())
            })
            .unwrap_or_else(|| "80".to_string());

        // Check SSL
        let ssl_enabled = config.contains("ssl_certificate");

        // Extract root path
        let root_path = config
            .lines()
            .find(|l| l.trim().starts_with("root"))
            .map(|l| l.split_whitespace().nth(1).unwrap_or("").trim_end_matches(';'))
            .unwrap_or("")
            .to_string();

        vhosts.push(NginxVhost {
            name: name.to_string(),
            enabled,
            server_name,
            listen_port,
            ssl_enabled,
            root_path,
        });
    }

    Ok(vhosts)
}

#[tauri::command]
pub async fn get_vhost_config(name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    client.execute_command(&format!("cat /etc/nginx/sites-available/{}", name)).map_err(|e| e.message)
}

#[tauri::command]
pub async fn save_vhost_config(name: String, content: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Backup first
    let backup_cmd = format!("sudo cp /etc/nginx/sites-available/{} /etc/nginx/sites-available/{}.bak 2>&1", name, name);
    client.execute_command(&backup_cmd).map_err(|e| e.message)?;

    // Write new config
    let write_cmd = format!("echo '{}' | sudo tee /etc/nginx/sites-available/{} > /dev/null", content, name);
    client.execute_command(&write_cmd).map_err(|e| e.message)?;

    Ok(format!("Vhost '{}' saved. Reload nginx to apply changes.", name))
}

#[tauri::command]
pub async fn enable_vhost(name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let cmd = format!(
        "sudo ln -sf /etc/nginx/sites-available/{} /etc/nginx/sites-enabled/{} 2>&1",
        name, name
    );
    client.execute_command(&cmd).map_err(|e| e.message)?;

    // Test and reload
    let test = client.execute_command("sudo nginx -t 2>&1").map_err(|e| e.message)?;
    if test.contains("syntax is ok") {
        client.execute_command("sudo systemctl reload nginx 2>&1").map_err(|e| e.message)?;
        Ok(format!("Vhost '{}' enabled and nginx reloaded.", name))
    } else {
        Err(format!("Vhost enabled but config test failed: {}", test))
    }
}

#[tauri::command]
pub async fn disable_vhost(name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let cmd = format!("sudo rm -f /etc/nginx/sites-enabled/{} 2>&1", name);
    client.execute_command(&cmd).map_err(|e| e.message)?;
    client.execute_command("sudo systemctl reload nginx 2>&1").map_err(|e| e.message)?;

    Ok(format!("Vhost '{}' disabled and nginx reloaded.", name))
}

#[tauri::command]
pub async fn delete_vhost(name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Remove from both available and enabled
    client.execute_command(&format!("sudo rm -f /etc/nginx/sites-available/{} 2>&1", name)).map_err(|e| e.message)?;
    client.execute_command(&format!("sudo rm -f /etc/nginx/sites-enabled/{} 2>&1", name)).map_err(|e| e.message)?;

    Ok(format!("Vhost '{}' deleted.", name))
}

#[tauri::command]
pub async fn get_nginx_logs(log_type: String, lines: u32, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let log_path = match log_type.as_str() {
        "error" => "/var/log/nginx/error.log",
        "access" => "/var/log/nginx/access.log",
        _ => "/var/log/nginx/error.log",
    };

    client.execute_command(&format!("tail -n {} {} 2>&1", lines, log_path)).map_err(|e| e.message)
}

// ==================== CRON COMMANDS ====================

#[tauri::command]
pub async fn get_user_crontab(state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    client.execute_command("crontab -l 2>&1").map_err(|e| e.message)
}

#[tauri::command]
pub async fn save_user_crontab(content: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Write to temp file and install
    let write_cmd = format!("echo '{}' | crontab - 2>&1", content);
    client.execute_command(&write_cmd).map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_system_crontab(state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    client.execute_command("cat /etc/crontab 2>&1").map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_cron_d_jobs(state: State<'_, AppState>) -> Result<Vec<CronJob>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let mut jobs = Vec::new();

    // List files in /etc/cron.d/
    let files = client
        .execute_command("ls -1 /etc/cron.d/ 2>/dev/null")
        .unwrap_or_default();

    for file in files.lines() {
        if file.is_empty() || file == "README" || file == ".placeholder" {
            continue;
        }

        let content = client
            .execute_command(&format!("cat /etc/cron.d/{}", file))
            .unwrap_or_default();

        for (idx, line) in content.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("SHELL=") || trimmed.starts_with("PATH=") {
                continue;
            }

            // Parse cron line: minute hour day month weekday user command
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 7 {
                jobs.push(CronJob {
                    id: idx,
                    schedule: parts[0..5].join(" "),
                    command: parts[6..].join(" "),
                    user: parts[5].to_string(),
                    enabled: !trimmed.starts_with('#'),
                    source: format!("/etc/cron.d/{}", file),
                });
            }
        }
    }

    Ok(jobs)
}

#[tauri::command]
pub async fn get_cron_folders(state: State<'_, AppState>) -> Result<Vec<CronFolder>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let mut folders = Vec::new();

    for folder_name in &["cron.daily", "cron.weekly", "cron.monthly", "cron.hourly"] {
        let path = format!("/etc/{}", folder_name);
        let scripts_output = client
            .execute_command(&format!("ls -1 {} 2>/dev/null", path))
            .unwrap_or_default();

        let scripts: Vec<String> = scripts_output
            .lines()
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        if !scripts.is_empty() {
            folders.push(CronFolder {
                name: folder_name.to_string(),
                path,
                scripts,
            });
        }
    }

    Ok(folders)
}

#[tauri::command]
pub async fn get_cron_logs(lines: u32, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Try to find cron logs in various locations
    let log_paths = ["/var/log/cron", "/var/log/syslog", "/var/log/messages"];

    for log_path in &log_paths {
        let test_cmd = format!("test -f {} && echo 'exists'", log_path);
        if let Ok(result) = client.execute_command(&test_cmd) {
            if result.trim() == "exists" {
                let grep_cmd = format!("grep -i cron {} | tail -n {} 2>&1", log_path, lines);
                if let Ok(logs) = client.execute_command(&grep_cmd) {
                    if !logs.is_empty() {
                        return Ok(logs);
                    }
                }
            }
        }
    }

    // Fallback: try journalctl
    client.execute_command(&format!("journalctl -u cron -n {} --no-pager 2>&1", lines)).map_err(|e| e.message)
}

#[tauri::command]
pub async fn add_cron_job(schedule: String, command: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get current crontab
    let current = client.execute_command("crontab -l 2>&1").unwrap_or_default();

    // Add new job
    let new_entry = format!("{} {}", schedule, command);
    let new_crontab = if current.contains("command not found") {
        new_entry
    } else {
        format!("{}\n{}", current.trim_end(), new_entry)
    };

    // Install new crontab
    let install_cmd = format!("echo '{}' | crontab - 2>&1", new_crontab);
    client.execute_command(&install_cmd).map_err(|e| e.message)
}

#[tauri::command]
pub async fn delete_cron_job(line_number: usize, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    // Get current crontab and remove line
    let current = client.execute_command("crontab -l 2>&1").unwrap_or_default();

    if current.contains("command not found") {
        return Err("No crontab found".to_string());
    }

    let new_crontab: String = current
        .lines()
        .enumerate()
        .filter(|(i, _)| *i != line_number - 1) // 1-indexed
        .map(|(_, line)| line.to_string())
        .collect::<Vec<_>>()
        .join("\n");

    let install_cmd = format!("echo '{}' | crontab - 2>&1", new_crontab);
    client.execute_command(&install_cmd).map_err(|e| e.message)
}

#[tauri::command]
pub async fn toggle_cron_job(line_number: usize, enabled: bool, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let current = client.execute_command("crontab -l 2>&1").unwrap_or_default();

    if current.contains("command not found") {
        return Err("No crontab found".to_string());
    }

    let new_crontab: String = current
        .lines()
        .enumerate()
        .map(|(i, line)| {
            if i == line_number - 1 {
                // Toggle comment
                let trimmed = line.trim();
                if enabled {
                    // Remove leading #
                    trimmed.trim_start_matches('#').trim_start().to_string()
                } else {
                    // Add # if not already commented
                    if !trimmed.starts_with('#') {
                        format!("# {}", line)
                    } else {
                        line.to_string()
                    }
                }
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    let install_cmd = format!("echo '{}' | crontab - 2>&1", new_crontab);
    client.execute_command(&install_cmd).map_err(|e| e.message)
}
