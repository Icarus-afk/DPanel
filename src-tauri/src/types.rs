use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerProfile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedServerProfile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub created_at: u64,
    pub last_connected: Option<u64>,
    pub connect_on_startup: bool,
}

impl From<ServerProfile> for SavedServerProfile {
    fn from(profile: ServerProfile) -> Self {
        SavedServerProfile {
            id: profile.id,
            name: profile.name,
            host: profile.host,
            port: profile.port,
            username: profile.username,
            auth_method: profile.auth_method,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            last_connected: None,
            connect_on_startup: false,
        }
    }
}

impl From<SavedServerProfile> for ServerProfile {
    fn from(profile: SavedServerProfile) -> Self {
        ServerProfile {
            id: profile.id,
            name: profile.name,
            host: profile.host,
            port: profile.port,
            username: profile.username,
            auth_method: profile.auth_method,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AuthMethod {
    Password { password: String },
    PrivateKey { key_path: String, passphrase: Option<String> },
}

// Helper for SSH command building
impl AuthMethod {
    pub fn is_key_based(&self) -> bool {
        matches!(self, AuthMethod::PrivateKey { .. })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_percent: f64,
    pub memory_used: u64,
    pub memory_total: u64,
    pub disk_usage: Vec<DiskUsage>,
    pub load_avg: [f64; 3],
    pub uptime: u64,
    pub process_count: u32,
    pub network: NetworkStats,
    pub cpu_history: Vec<f64>,
    pub memory_history: Vec<f64>,
    pub network_history: Vec<NetworkHistoryPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub bytes_sent: u64,
    pub bytes_recv: u64,
    pub packets_sent: u64,
    pub packets_recv: u64,
    pub interface: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkHistoryPoint {
    pub timestamp: u64,
    pub bytes_sent: u64,
    pub bytes_recv: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsage {
    pub mount_point: String,
    pub used: u64,
    pub total: u64,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub cpu_percent: f64,
    pub memory_usage: u64,
    pub memory_limit: u64,
    pub ports: Vec<PortMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub state: String,
    pub sub_state: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityInfo {
    pub open_ports: Vec<u16>,
    pub firewall_active: bool,
    pub ssh_sessions: Vec<String>,
    pub recent_logins: Vec<LoginAttempt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginAttempt {
    pub timestamp: String,
    pub username: String,
    pub ip: String,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandError {
    pub message: String,
    pub code: i32,
}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        CommandError { message, code: -1 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UfwStatus {
    pub active: bool,
    pub logging: String,
    pub default: String,
    pub rules: Vec<UfwRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UfwRule {
    pub rule: String,
    pub to: String,
    pub action: String,
    pub from: String,
    pub port: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UfwStats {
    pub total_rules: u32,
    pub allow_rules: u32,
    pub deny_rules: u32,
    pub limit_rules: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: String,
    pub protocol: String,
    pub action: String,
    pub source: String,
    pub service_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UfwOverview {
    pub active: bool,
    pub open_ports: Vec<PortInfo>,
    pub blocked_ports: Vec<PortInfo>,
    pub all_rules: Vec<UfwRule>,
    pub stats: UfwStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerDetails {
    pub id: String,
    pub name: String,
    pub image: String,
    pub state: String,
    pub status: String,
    pub created: String,
    pub started_at: Option<String>,
    pub env_vars: Vec<String>,
    pub ports: Vec<PortMapping>,
    pub networks: Vec<String>,
    pub volumes: Vec<VolumeMount>,
    pub labels: Vec<Label>,
    pub command: String,
    pub working_dir: String,
    pub user: String,
    pub restart_policy: String,
    pub memory_limit: String,
    pub cpu_limit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub host_ip: String,
    pub host_port: String,
    pub container_port: String,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeMount {
    pub source: String,
    pub destination: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Label {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerVolume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub scope: String,
    pub labels: Vec<Label>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerNetwork {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
    pub subnet: Option<String>,
    pub gateway: Option<String>,
    pub containers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerImage {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size: u64,
    pub created: String,
    pub architecture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeProject {
    pub name: String,
    pub path: String,
    pub services: Vec<String>,
    pub content: String,
}

// ==================== USER MANAGEMENT TYPES ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemUser {
    pub username: String,
    pub uid: u32,
    pub gid: u32,
    pub groups: Vec<String>,
    pub home: String,
    pub shell: String,
    pub gecos: String,
    pub locked: bool,
    pub has_password: bool,
    pub last_login: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemGroup {
    pub name: String,
    pub gid: u32,
    pub members: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHKey {
    pub key_type: String,
    pub key_data: String,
    pub comment: String,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDetail {
    pub username: String,
    pub uid: u32,
    pub gid: u32,
    pub groups: Vec<String>,
    pub home: String,
    pub shell: String,
    pub gecos: String,
    pub locked: bool,
    pub has_password: bool,
    pub last_login: Option<String>,
    pub password_expiry: Option<String>,
    pub ssh_keys: Vec<SSHKey>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: Option<String>,
    pub home: Option<String>,
    pub shell: Option<String>,
    pub groups: Vec<String>,
    pub create_home: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModifyUserRequest {
    pub username: String,
    pub new_username: Option<String>,
    pub home: Option<String>,
    pub shell: Option<String>,
    pub groups: Option<Vec<String>>,
}

// Nginx types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NginxStatus {
    pub running: bool,
    pub version: String,
    pub worker_processes: String,
    pub config_test: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NginxVhost {
    pub name: String,
    pub enabled: bool,
    pub server_name: String,
    pub listen_port: String,
    pub ssl_enabled: bool,
    pub root_path: String,
}

// Cron types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJob {
    pub id: usize,
    pub schedule: String,
    pub command: String,
    pub user: String,
    pub enabled: bool,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronFolder {
    pub name: String,
    pub path: String,
    pub scripts: Vec<String>,
}

// ==================== INFRASTRUCTURE GRAPH TYPES ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfraGraphNode {
    pub id: String,
    pub label: String,
    pub node_type: InfraGraphNodeType,
    pub status: NodeStatus,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InfraGraphNodeType {
    Internet,
    Nginx,
    Vhost,
    Container,
    Volume,
    Network,
    Port,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeStatus {
    Running,
    Stopped,
    Healthy,
    Unhealthy,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfraGraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub label: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfrastructureGraph {
    pub nodes: Vec<InfraGraphNode>,
    pub edges: Vec<InfraGraphEdge>,
    pub summary: InfraSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfraSummary {
    pub total_containers: usize,
    pub running_containers: usize,
    pub total_vhosts: usize,
    pub enabled_vhosts: usize,
    pub nginx_status: String,
    pub total_volumes: usize,
    pub total_networks: usize,
}
