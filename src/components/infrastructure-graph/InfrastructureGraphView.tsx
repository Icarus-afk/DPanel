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
import { Box, Text, Center, Loader, Group, Paper, Badge, Stack, Button } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import InfraNode from './InfraNode';
import { InfrastructureGraph } from '../../types/infrastructure-graph';

const nodeTypes: NodeTypes = {
  infra: InfraNode,
};

interface LegendItem {
  color: string;
  label: string;
  type: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { color: '#10b981', label: 'Internet', type: 'internet' },
  { color: '#f59e0b', label: 'Nginx', type: 'nginx' },
  { color: '#f97316', label: 'Host Port', type: 'hostport' },
  { color: '#8b5cf6', label: 'Vhost', type: 'vhost' },
  { color: '#3b82f6', label: 'Container', type: 'container' },
  { color: '#06b6d4', label: 'Docker Network', type: 'dockernetwork' },
  { color: '#6b7280', label: 'Host Network', type: 'hostnetwork' },
];

export function InfrastructureGraphView() {
  const [graphData, setGraphData] = useState<InfrastructureGraph | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGraphData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoke<InfrastructureGraph>('get_infrastructure_graph');
      setGraphData(data);
      convertToReactFlow(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load infrastructure graph');
      console.error('Failed to load infrastructure graph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToReactFlow = (data: InfrastructureGraph) => {
    // Group nodes by type
    const layers: Record<string, Node<any>[]> = {
      internet: [],
      nginx: [],
      hostnetwork: [],
      vhost: [],
      hostport: [],
      container: [],
      dockernetwork: [],
    };

    data.nodes.forEach((node) => {
      const reactFlowNode: Node<any> = {
        id: node.id,
        type: 'infra',
        position: { x: 0, y: 0 },
        data: {
          label: node.label,
          node_type: node.node_type,
          status: node.status,
          metadata: node.metadata,
        },
      };
      if (layers[node.node_type]) {
        layers[node.node_type].push(reactFlowNode);
      }
    });

    // Position nodes in layers
    const layerPositions: Record<string, { x: number; y: number }> = {
      internet: { x: 0, y: 0 },
      nginx: { x: -300, y: 150 },
      hostnetwork: { x: 300, y: 150 },
      vhost: { x: -300, y: 300 },
      hostport: { x: 300, y: 300 },
      container: { x: 0, y: 450 },
      dockernetwork: { x: 0, y: 600 },
    };
    
    const positionedNodes: Node<any>[] = [];
    const nodeSpacing = 200;

    Object.entries(layers).forEach(([layerType, nodes]) => {
      const basePos = layerPositions[layerType];
      const layerWidth = (nodes.length - 1) * nodeSpacing;
      const startX = basePos.x - layerWidth / 2;

      nodes.forEach((node, index) => {
        node.position = {
          x: startX + index * nodeSpacing,
          y: basePos.y,
        };
        positionedNodes.push(node);
      });
    });

    // Convert edges
    const reactFlowEdges = data.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep' as const,
      animated: edge.edge_type === 'routes_to' || edge.edge_type === 'proxies_to',
      style: {
        stroke: '#4b5563',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#9ca3af',
        fontSize: 10,
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: '#4b5563',
      },
    } as Edge));

    setNodes(positionedNodes);
    setEdges(reactFlowEdges);
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  if (isLoading) {
    return (
      <Center style={{ height: '100%', width: '100%', minHeight: '500px' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="hsl(var(--primary))" />
          <Text c="var(--text-tertiary)">Loading infrastructure graph...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: '100%', width: '100%' }}>
        <Stack align="center" gap="md">
          <Text c="red" size="lg">
            {error.includes('Not connected') ? 'Not connected to server' : error}
          </Text>
          <Text c="dimmed" size="sm">
            {error.includes('Not connected') 
              ? 'Please connect to a VPS server first from the Dashboard'
              : 'Make sure you\'re connected to a server'}
          </Text>
          <Button onClick={loadGraphData} variant="outline" size="sm">
            Try Again
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Summary Panel */}
      {graphData && (
        <Box
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          <Paper
            style={{
              background: 'rgba(26, 26, 26, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '16px',
              minWidth: '200px',
            }}
          >
            <Text size="sm" fw={600} c="white" mb="sm">
              Infrastructure Summary
            </Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Nginx</Text>
                <Badge
                  color={graphData.summary.nginx_status === 'running' ? 'green' : 'red'}
                  size="sm"
                >
                  {graphData.summary.nginx_status === 'running' ? 'Running' : 'Stopped'}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Containers</Text>
                <Text size="xs" c="white">
                  {graphData.summary.running_containers}/{graphData.summary.total_containers}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Vhosts</Text>
                <Text size="xs" c="white">
                  {graphData.summary.enabled_vhosts}/{graphData.summary.total_vhosts}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Networks</Text>
                <Text size="xs" c="white">
                  {graphData.summary.total_networks}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Legend Panel */}
      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <Paper
          style={{
            background: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <Text size="sm" fw={600} c="white" mb="sm">
            Node Types
          </Text>
          <Stack gap="xs">
            {LEGEND_ITEMS.map((item) => (
              <Group key={item.type} gap="xs">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: item.color,
                  }}
                />
                <Text size="xs" c="gray.3">
                  {item.label}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Box>

      {/* Refresh Button */}
      <Box
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <Box
          onClick={loadGraphData}
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            color: '#888888',
            fontSize: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#252525';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a1a1a';
            e.currentTarget.style.color = '#888888';
          }}
        >
          Refresh
        </Box>
      </Box>

      <Box style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          minZoom={0.2}
          maxZoom={2}
          style={{
            background: '#0a0a0a',
            height: '100%',
            width: '100%',
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
      </Box>

      {nodes.length === 0 && !isLoading && (
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
            No infrastructure data available
          </Text>
          <Text size="sm" c="gray.5" mt="sm">
            Connect to a server to view the infrastructure graph
          </Text>
        </Box>
      )}
    </Box>
  );
}
