// Config Graph TypeScript Types

export type ConfigFileType = 'json' | 'toml' | 'yaml' | 'yml' | 'ts' | 'js' | 'other';

export type GraphNodeType = 'file' | 'module' | 'environment';

export interface ConfigFile {
  path: string;
  file_type: ConfigFileType;
  size: number;
  modified: number;
  keys: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: GraphNodeType;
  metadata: {
    path?: string;
    fileType?: string;
    size?: number;
    keys?: string[];
    modified?: number;
    description?: string;
    [key: string]: unknown;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UsageLocation {
  file: string;
  line?: number;
  column?: number;
  context: string;
}

export interface ConfigSearchResult {
  key: string;
  file: string;
  value?: string;
  usages: UsageLocation[];
}

export interface ConfigFilterState {
  showFiles: boolean;
  showModules: boolean;
  showEnvironments: boolean;
  fileTypes: ConfigFileType[];
}

export const DEFAULT_FILTER_STATE: ConfigFilterState = {
  showFiles: true,
  showModules: true,
  showEnvironments: true,
  fileTypes: ['json', 'toml', 'yaml', 'yml', 'ts', 'js', 'other'],
};
