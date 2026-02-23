import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Text, Group, Badge } from '@mantine/core';
import {
  IconFile,
  IconBrandTypescript,
  IconBrandJavascript,
  IconFileCode,
  IconSettings,
  IconWorld,
} from '@tabler/icons-react';
import { GraphNodeType } from '../../types/config-graph';

interface CustomNodeData {
  label: string;
  node_type: GraphNodeType;
  metadata: {
    fileType?: string;
    description?: string;
    [key: string]: unknown;
  };
}

const getNodeIcon = (nodeType: GraphNodeType, fileType?: string) => {
  switch (nodeType) {
    case 'environment':
      return <IconWorld size={16} />;
    case 'file':
      switch (fileType?.toLowerCase()) {
        case 'typescript':
          return <IconBrandTypescript size={16} />;
        case 'javascript':
          return <IconBrandJavascript size={16} />;
        case 'json':
          return <IconFileCode size={16} />;
        case 'toml':
        case 'yaml':
        case 'yml':
          return <IconSettings size={16} />;
        default:
          return <IconFile size={16} />;
      }
    default:
      return <IconFile size={16} />;
  }
};

const getNodeColors = (nodeType: GraphNodeType) => {
  switch (nodeType) {
    case 'environment':
      return {
        bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        border: '#8b5cf6',
        text: '#ffffff',
      };
    case 'file':
      return {
        bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: '#3b82f6',
        text: '#ffffff',
      };
    default:
      return {
        bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        border: '#6b7280',
        text: '#ffffff',
      };
  }
};

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const colors = getNodeColors(data.node_type);
  const icon = getNodeIcon(data.node_type, data.metadata.fileType);

  return (
    <Box
      style={{
        background: colors.bg,
        border: `2px solid ${selected ? '#ffffff' : colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '180px',
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
          {data.metadata.fileType && (
            <Badge
              size="xs"
              variant="light"
              color="white"
              style={{
                marginTop: '4px',
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {data.metadata.fileType}
            </Badge>
          )}
        </Box>
      </Group>

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

export default memo(CustomNode);
