// Infrastructure Graph TypeScript Types

export type InfraGraphNodeType = 'internet' | 'nginx' | 'vhost' | 'container' | 'volume' | 'network' | 'port';

export type NodeStatus = 'running' | 'stopped' | 'healthy' | 'unhealthy' | 'unknown';

export interface InfraGraphNode {
  id: string;
  label: string;
  node_type: InfraGraphNodeType;
  status: NodeStatus;
  metadata: {
    description?: string;
    version?: string;
    running?: boolean;
    config_path?: string;
    name?: string;
    server_name?: string;
    enabled?: boolean;
    ssl?: boolean;
    listen_port?: string;
    root_path?: string;
    id?: string;
    image?: string;
    state?: string;
    status?: string;
    cpu?: number;
    memory?: number;
    ports?: PortMapping[];
    driver?: string;
    mountpoint?: string;
    scope?: string;
    subnet?: string;
    gateway?: string;
    containers?: string[];
    host_port?: string;
    container_port?: string;
    protocol?: string;
    mode?: string;
    [key: string]: unknown;
  };
}

export interface InfraGraphEdge {
  source: string;
  target: string;
  edge_type: string;
  label?: string;
  metadata?: {
    ports?: number[];
    backend?: string;
    mode?: string;
    [key: string]: unknown;
  };
}

export interface InfrastructureGraph {
  nodes: InfraGraphNode[];
  edges: InfraGraphEdge[];
  summary: InfraSummary;
}

export interface InfraSummary {
  total_containers: number;
  running_containers: number;
  total_vhosts: number;
  enabled_vhosts: number;
  nginx_status: string;
  total_volumes: number;
  total_networks: number;
}

export interface PortMapping {
  host_ip: string;
  host_port: string;
  container_port: string;
  protocol: string;
}

export interface ProxyMapping {
  vhost: string;
  backend_url: string;
  container_name: string | null;
  location: string;
}
