import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Text, Group, Badge, Stack } from '@mantine/core';
import {
  IconWorld,
  IconServer,
  IconBrandDocker,
  IconDatabase,
  IconNetwork,
  IconPlug,
  IconRouter,
} from '@tabler/icons-react';
import { InfraGraphNodeType, NodeStatus } from '../../types/infrastructure-graph';

interface CustomNodeData {
  label: string;
  node_type: InfraGraphNodeType;
  status: NodeStatus;
  metadata: {
    [key: string]: unknown;
  };
}

const getNodeIcon = (nodeType: InfraGraphNodeType) => {
  switch (nodeType) {
    case 'internet':
      return <IconWorld size={20} />;
    case 'nginx':
      return <IconServer size={20} />;
    case 'vhost':
      return <IconRouter size={20} />;
    case 'container':
      return <IconBrandDocker size={20} />;
    case 'volume':
      return <IconDatabase size={20} />;
    case 'network':
      return <IconNetwork size={20} />;
    case 'port':
      return <IconPlug size={20} />;
    default:
      return <IconServer size={20} />;
  }
};

const getNodeColors = (nodeType: InfraGraphNodeType, status: NodeStatus) => {
  const isStopped = status === 'stopped';
  
  switch (nodeType) {
    case 'internet':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: isStopped ? '#4b5563' : '#10b981',
        text: '#ffffff',
      };
    case 'nginx':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: isStopped ? '#4b5563' : '#f59e0b',
        text: '#ffffff',
      };
    case 'vhost':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        border: isStopped ? '#4b5563' : '#8b5cf6',
        text: '#ffffff',
      };
    case 'container':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: isStopped ? '#4b5563' : '#3b82f6',
        text: '#ffffff',
      };
    case 'volume':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        border: isStopped ? '#4b5563' : '#ec4899',
        text: '#ffffff',
      };
    case 'network':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        border: isStopped ? '#4b5563' : '#06b6d4',
        text: '#ffffff',
      };
    case 'port':
      return {
        bg: isStopped ? '#4b5563' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        border: isStopped ? '#4b5563' : '#6b7280',
        text: '#ffffff',
      };
    default:
      return {
        bg: '#4b5563',
        border: '#4b5563',
        text: '#ffffff',
      };
  }
};

const getStatusBadge = (status: NodeStatus) => {
  switch (status) {
    case 'running':
    case 'healthy':
      return { color: 'green', label: 'Running' };
    case 'stopped':
      return { color: 'gray', label: 'Stopped' };
    case 'unhealthy':
      return { color: 'red', label: 'Unhealthy' };
    default:
      return { color: 'gray', label: 'Unknown' };
  }
};

function InfraNode({ data, selected }: NodeProps<CustomNodeData>) {
  const colors = getNodeColors(data.node_type, data.status);
  const icon = getNodeIcon(data.node_type);
  const statusBadge = getStatusBadge(data.status);

  return (
    <Box
      style={{
        background: colors.bg,
        border: `2px solid ${selected ? '#ffffff' : colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '200px',
        maxWidth: '280px',
        boxShadow: selected
          ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#9ca3af',
          border: '2px solid #4b5563',
          width: 10,
          height: 10,
        }}
      />

      <Stack gap="xs">
        <Group gap="sm" wrap="nowrap">
          <Box
            style={{
              color: colors.text,
              opacity: 0.9,
            }}
          >
            {icon}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="sm"
              fw={600}
              c={colors.text}
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {data.label}
            </Text>
          </Box>
        </Group>

        <Group gap="xs" justify="space-between">
          <Badge
            size="xs"
            variant="light"
            color={statusBadge.color as any}
            style={{
              fontSize: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {statusBadge.label}
          </Badge>
          <Badge
            size="xs"
            variant="outline"
            color="white"
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
            }}
          >
            {data.node_type}
          </Badge>
        </Group>

        {typeof data.metadata.server_name === 'string' && data.metadata.server_name !== data.label && (
          <Text size="xs" c={colors.text} style={{ opacity: 0.8 }}>
            {data.metadata.server_name}
          </Text>
        )}

        {typeof data.metadata.image === 'string' && (
          <Text size="xs" c={colors.text} style={{ opacity: 0.8 }}>
            {data.metadata.image}
          </Text>
        )}
      </Stack>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#9ca3af',
          border: '2px solid #4b5563',
          width: 10,
          height: 10,
        }}
      />
    </Box>
  );
}

export default memo(InfraNode);
