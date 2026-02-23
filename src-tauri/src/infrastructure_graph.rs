use crate::types::*;
use serde_json::json;
use std::collections::HashMap;
use tauri::State;

pub struct InfraGraphState;

impl Default for InfraGraphState {
    fn default() -> Self {
        InfraGraphState
    }
}

#[tauri::command]
pub async fn get_infrastructure_graph(state: State<'_, crate::commands::AppState>) -> Result<InfrastructureGraph, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected to server")?;

    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // Add Internet node (entry point)
    nodes.push(InfraGraphNode {
        id: "internet".to_string(),
        label: "Internet".to_string(),
        node_type: InfraGraphNodeType::Internet,
        status: NodeStatus::Healthy,
        metadata: json!({
            "description": "External traffic entry point"
        }),
    });

    // Get Nginx status
    let nginx_status_output = client
        .execute_command("systemctl is-active nginx 2>/dev/null || echo 'inactive'")
        .unwrap_or_else(|_| "inactive".to_string());
    
    let nginx_running = nginx_status_output.trim() == "active";
    let nginx_version = client
        .execute_command("nginx -v 2>&1 | cut -d'/' -f2")
        .unwrap_or_default();

    nodes.push(InfraGraphNode {
        id: "nginx".to_string(),
        label: format!("Nginx {}", nginx_version.trim()),
        node_type: InfraGraphNodeType::Nginx,
        status: if nginx_running { NodeStatus::Running } else { NodeStatus::Stopped },
        metadata: json!({
            "version": nginx_version.trim(),
            "running": nginx_running,
            "config_path": "/etc/nginx/nginx.conf"
        }),
    });

    // Edge: Internet -> Nginx (port 80/443)
    edges.push(InfraGraphEdge {
        source: "internet".to_string(),
        target: "nginx".to_string(),
        edge_type: "routes_to".to_string(),
        label: Some("80/443".to_string()),
        metadata: Some(json!({
            "ports": [80, 443]
        })),
    });

    // Get Nginx vhosts
    let vhosts = get_vhosts_for_graph(client)?;
    let mut vhost_to_backend: HashMap<String, String> = HashMap::new();

    for vhost in &vhosts {
        let vhost_id = format!("vhost:{}", vhost.name);
        nodes.push(InfraGraphNode {
            id: vhost_id.clone(),
            label: vhost.server_name.clone(),
            node_type: InfraGraphNodeType::Vhost,
            status: if vhost.enabled { NodeStatus::Healthy } else { NodeStatus::Stopped },
            metadata: json!({
                "name": vhost.name,
                "server_name": vhost.server_name,
                "enabled": vhost.enabled,
                "ssl": vhost.ssl_enabled,
                "listen_port": vhost.listen_port,
                "root_path": vhost.root_path
            }),
        });

        // Edge: Nginx -> Vhost
        edges.push(InfraGraphEdge {
            source: "nginx".to_string(),
            target: vhost_id.clone(),
            edge_type: "serves".to_string(),
            label: Some(vhost.listen_port.clone()),
            metadata: None,
        });

        // Parse proxy_pass from vhost config
        if let Ok(backend) = extract_proxy_target(client, &vhost.name).await {
            vhost_to_backend.insert(vhost_id.clone(), backend.clone());
        }
    }

    // Get Docker containers
    let containers = get_containers_for_graph(client)?;
    
    for container in &containers {
        let container_id = format!("container:{}", container.name);
        nodes.push(InfraGraphNode {
            id: container_id.clone(),
            label: container.name.clone(),
            node_type: InfraGraphNodeType::Container,
            status: if container.state == "running" { NodeStatus::Running } else { NodeStatus::Stopped },
            metadata: json!({
                "id": container.id,
                "image": container.image,
                "state": container.state,
                "status": container.status,
                "cpu": container.cpu_percent,
                "memory": container.memory_usage
            }),
        });

        // Edge: Vhost -> Container (if proxy_pass matches)
        for (vhost_id, backend) in &vhost_to_backend {
            if backend.contains(&container.name) || backend.contains(&container.id[..12]) {
                edges.push(InfraGraphEdge {
                    source: vhost_id.clone(),
                    target: container_id.clone(),
                    edge_type: "proxies_to".to_string(),
                    label: Some(backend.clone()),
                    metadata: Some(json!({
                        "backend": backend
                    })),
                });
            }
        }
    }

    // Calculate summary
    let summary = InfraSummary {
        total_containers: containers.len(),
        running_containers: containers.iter().filter(|c| c.state == "running").count(),
        total_vhosts: vhosts.len(),
        enabled_vhosts: vhosts.iter().filter(|v| v.enabled).count(),
        nginx_status: if nginx_running { "running".to_string() } else { "stopped".to_string() },
        total_volumes: 0,
        total_networks: 0,
    };

    Ok(InfrastructureGraph { nodes, edges, summary })
}

fn get_vhosts_for_graph(client: &std::sync::Arc<crate::ssh::SshClient>) -> Result<Vec<NginxVhost>, String> {
    let mut vhosts = Vec::new();

    let available = client
        .execute_command("ls -1 /etc/nginx/sites-available/ 2>/dev/null | grep -v '^default$'")
        .unwrap_or_default();

    let enabled_output = client
        .execute_command("ls -1 /etc/nginx/sites-enabled/ 2>/dev/null")
        .unwrap_or_default();
    let enabled: Vec<&str> = enabled_output.lines().collect();

    for name in available.lines() {
        if name.is_empty() {
            continue;
        }

        let content = client
            .execute_command(&format!("cat /etc/nginx/sites-available/{}", name))
            .unwrap_or_default();

        let server_name = extract_server_name(&content).unwrap_or_else(|| name.to_string());
        let listen_port = extract_listen_port(&content).unwrap_or_else(|| "80".to_string());
        let ssl_enabled = content.contains("ssl_certificate");
        let root_path = extract_root_path(&content).unwrap_or_default();

        vhosts.push(NginxVhost {
            name: name.to_string(),
            enabled: enabled.contains(&name),
            server_name,
            listen_port,
            ssl_enabled,
            root_path,
        });
    }

    Ok(vhosts)
}

fn get_containers_for_graph(client: &std::sync::Arc<crate::ssh::SshClient>) -> Result<Vec<DockerContainer>, String> {
    let ps_output = client
        .execute_command("docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}' --no-trunc")
        .map_err(|e| e.message)?;

    let stats_output = client
        .execute_command("docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}'")
        .unwrap_or_default();

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

    for line in stats_output.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            if let Some(container) = containers.iter_mut().find(|c| c.name == parts[0]) {
                container.cpu_percent = parts[1].trim_end_matches('%').parse().unwrap_or(0.0);
            }
        }
    }

    Ok(containers)
}

async fn extract_proxy_target(client: &std::sync::Arc<crate::ssh::SshClient>, vhost_name: &str) -> Result<String, String> {
    let content = client
        .execute_command(&format!("cat /etc/nginx/sites-available/{}", vhost_name))
        .map_err(|e| e.message)?;

    // Look for proxy_pass directive
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("proxy_pass") {
            if let Some(start) = line.find(' ') {
                let url = line[start..].trim().trim_end_matches(';');
                return Ok(url.to_string());
            }
        }
    }

    Ok("static".to_string())
}

fn extract_server_name(content: &str) -> Option<String> {
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("server_name") {
            if let Some(start) = line.find(' ') {
                let name = line[start..].trim().trim_end_matches(';');
                return Some(name.split_whitespace().next().unwrap_or("").to_string());
            }
        }
    }
    None
}

fn extract_listen_port(content: &str) -> Option<String> {
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("listen") {
            if let Some(start) = line.find(' ') {
                let port = line[start..].trim().trim_end_matches(';');
                return Some(port.split_whitespace().next().unwrap_or("80").to_string());
            }
        }
    }
    None
}

fn extract_root_path(content: &str) -> Option<String> {
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("root") {
            if let Some(start) = line.find(' ') {
                let path = line[start..].trim().trim_end_matches(';');
                return Some(path.to_string());
            }
        }
    }
    None
}
