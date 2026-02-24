export interface ServerProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
}

export interface SavedServerProfile extends ServerProfile {
  created_at: number;
  last_connected: number | null;
  connect_on_startup: boolean;
}

export type AuthMethod =
  | { type: "Password"; password: string }
  | { type: "PrivateKey"; key_path: string; passphrase?: string };

export interface SystemMetrics {
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  disk_usage: DiskUsage[];
  load_avg: [number, number, number];
  uptime: number;
  process_count: number;
  network: NetworkStats;
  cpu_history: number[];
  memory_history: number[];
  network_history: NetworkHistoryPoint[];
}

export interface NetworkStats {
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  interface: string;
}

export interface NetworkHistoryPoint {
  timestamp: number;
  bytes_sent: number;
  bytes_recv: number;
}

export interface DiskUsage {
  mount_point: string;
  used: number;
  total: number;
  percent: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  volumes?: string[];
}

export interface ServiceInfo {
  name: string;
  state: string;
  sub_state: string;
  description: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
}

export interface UfwStatus {
  active: boolean;
  logging: string;
  default: string;
  rules: UfwRule[];
}

export interface UfwRule {
  rule: string;
  to: string;
  action: string;
  from: string;
  port: string | null;
}

export interface UfwStats {
  total_rules: number;
  allow_rules: number;
  deny_rules: number;
  limit_rules: number;
}

export interface PortInfo {
  port: string;
  protocol: string;
  action: string;
  source: string;
  service_name: string | null;
}

export interface UfwOverview {
  active: boolean;
  open_ports: PortInfo[];
  blocked_ports: PortInfo[];
  all_rules: UfwRule[];
  stats: UfwStats;
}

// Docker extended types
export interface PortMapping {
  host_ip: string;
  host_port: string;
  container_port: string;
  protocol: string;
}

export interface VolumeMount {
  source: string;
  destination: string;
  mode: string;
}

export interface Label {
  key: string;
  value: string;
}

export interface ContainerDetails {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  started_at: string | null;
  env_vars: string[];
  ports: PortMapping[];
  networks: string[];
  volumes: VolumeMount[];
  labels: Label[];
  command: string;
  working_dir: string;
  user: string;
  restart_policy: string;
  memory_limit: string;
  cpu_limit: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  labels: Label[];
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet: string | null;
  gateway: string | null;
  containers: string[];
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
  architecture: string;
}

export interface ComposeProject {
  name: string;
  path: string;
  services: string[];
  content: string;
}

// ==================== USER MANAGEMENT TYPES ====================

export interface SystemUser {
  username: string;
  uid: number;
  gid: number;
  groups: string[];
  home: string;
  shell: string;
  gecos: string;
  locked: boolean;
  has_password: boolean;
  last_login: string | null;
}

export interface SystemGroup {
  name: string;
  gid: number;
  members: string[];
}

export interface SSHKey {
  key_type: string;
  key_data: string;
  comment: string;
  fingerprint: string;
}

export interface UserDetail {
  username: string;
  uid: number;
  gid: number;
  groups: string[];
  home: string;
  shell: string;
  gecos: string;
  locked: boolean;
  has_password: boolean;
  last_login: string | null;
  password_expiry: string | null;
  ssh_keys: SSHKey[];
}

export interface CreateUserRequest {
  username: string;
  password?: string;
  home?: string;
  shell?: string;
  groups: string[];
  create_home: boolean;
}
