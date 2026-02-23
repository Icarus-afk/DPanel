import { useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Text, Center, Loader } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { ConfigToolbar } from './ConfigToolbar';
import { ConfigDetails } from './ConfigDetails';
import CustomNode from './ConfigNode';
import {
  GraphData,
  GraphNode as GraphNodeType,
  ConfigFilterState,
  DEFAULT_FILTER_STATE,
} from '../../types/config-graph';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface ConfigGraphProps {
  initialData?: GraphData;
}

export function ConfigGraph({ initialData }: ConfigGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(initialData || null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterState, setFilterState] = useState<ConfigFilterState>(DEFAULT_FILTER_STATE);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    if (!initialData) {
      loadGraphData();
    }
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (graphData) {
      applyFilters(graphData, filterState, searchQuery);
    }
  }, [filterState, searchQuery, graphData]);

  const loadGraphData = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<GraphData>('get_config_dependencies');
      setGraphData(data);
      applyFilters(data, filterState);
    } catch (error) {
      console.error('Failed to load graph data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    data: GraphData,
    filter: ConfigFilterState,
    query: string = ''
  ) => {
    let filteredNodes = data.nodes.filter((node) => {
      // Filter by node type
      if (node.node_type === 'file' && !filter.showFiles) return false;
      if (node.node_type === 'environment' && !filter.showEnvironments) return false;

      // Filter by file type
      if (node.node_type === 'file' && node.metadata.fileType) {
        const fileTypeLower = node.metadata.fileType.toLowerCase();
        const typeMap: Record<string, string> = {
          typescript: 'ts',
          javascript: 'js',
          json: 'json',
          toml: 'toml',
          yaml: 'yaml',
          yml: 'yml',
        };
        const mappedType = typeMap[fileTypeLower] || fileTypeLower;
        if (!filter.fileTypes.includes(mappedType as any)) return false;
      }

      // Filter by search query
      if (query && !node.label.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Filter edges to only show connections between visible nodes
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    let filteredEdges = data.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    // Convert to ReactFlow format
    const reactFlowNodes: Node<any>[] = filteredNodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: node.label,
        node_type: node.node_type,
        metadata: node.metadata,
      },
      style: {},
    }));

    const reactFlowEdges: Edge[] = filteredEdges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#4b5563',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#9ca3af',
        fontSize: 10,
      },
    }));

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  };

  const handleNodeClick = (_: any, node: Node<any>) => {
    setSelectedNode({
      id: node.id,
      label: node.data.label,
      node_type: node.data.node_type,
      metadata: node.data.metadata,
    });
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
  };

  const handleZoomIn = () => {
    // Zoom logic handled by ReactFlow Controls
  };

  const handleZoomOut = () => {
    // Zoom logic handled by ReactFlow Controls
  };

  const handleResetView = () => {
    // Reset view would need ref to ReactFlow instance
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filter: ConfigFilterState) => {
    setFilterState(filter);
  };

  if (isLoading && !graphData) {
    return (
      <Center style={{ height: '100%', width: '100%' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ConfigToolbar
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onRefresh={loadGraphData}
        isLoading={isLoading}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.2}
        maxZoom={2}
        style={{
          background: '#0a0a0a',
        }}
      >
        <Background
          color="#1a1a1a"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <Controls
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        />
      </ReactFlow>

      {selectedNode && (
        <ConfigDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {nodes.length === 0 && graphData && (
        <Box
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Text size="lg" c="dimmed">
            No nodes match the current filters
          </Text>
          <Text size="sm" c="gray.5" mt="sm">
            Try adjusting your filter settings
          </Text>
        </Box>
      )}
    </Box>
  );
}
