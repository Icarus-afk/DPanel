import { useState, useEffect } from 'react';
import { Box, Text, ScrollArea, Badge, Group, Divider, Button, Code, Stack, Title } from '@mantine/core';
import { IconX, IconFile, IconClock, IconDatabase, IconKey } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { GraphNode } from '../../types/config-graph';

interface ConfigDetailsProps {
  node: GraphNode | null;
  onClose: () => void;
}

export function ConfigDetails({ node, onClose }: ConfigDetailsProps) {
  const [content, setContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (node?.metadata?.path && node.node_type === 'file') {
      loadFileContent(node.metadata.path);
    } else {
      setContent('');
    }
  }, [node]);

  const loadFileContent = async (filePath: string) => {
    setLoadingContent(true);
    try {
      const fileContent = await invoke<string>('get_config_content', { filePath });
      setContent(fileContent);
    } catch (error) {
      setContent(`Error loading file: ${error}`);
    } finally {
      setLoadingContent(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!node) {
    return null;
  }

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        background: '#0f0f0f',
        borderLeft: '1px solid #1a1a1a',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <Box
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title order={5} style={{ color: '#ffffff', fontWeight: 600 }}>
          {node.label}
        </Title>
        <Button
          variant="subtle"
          size="sm"
          onClick={onClose}
          style={{ color: '#888888' }}
        >
          <IconX size={18} />
        </Button>
      </Box>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Box style={{ padding: '24px' }}>
          {/* Node Type Badge */}
          <Group gap="xs" mb="lg">
            <Badge
              variant="filled"
              color={
                node.node_type === 'environment'
                  ? 'violet'
                  : node.node_type === 'file'
                  ? 'blue'
                  : 'gray'
              }
              size="lg"
              style={{ textTransform: 'capitalize' }}
            >
              {node.node_type}
            </Badge>
          </Group>

          {/* Metadata */}
          <Stack gap="lg">
            {node.metadata.description && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs">
                  Description
                </Text>
                <Text size="sm" c="gray.3">
                  {node.metadata.description}
                </Text>
              </Box>
            )}

            {node.metadata.path && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconFile size={14} />
                  File Path
                </Text>
                <Code
                  block
                  style={{
                    background: '#1a1a1a',
                    color: '#9ca3af',
                    fontSize: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    wordBreak: 'break-all',
                  }}
                >
                  {node.metadata.path}
                </Code>
              </Box>
            )}

            {node.metadata.fileType && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs">
                  File Type
                </Text>
                <Text size="sm" c="gray.3">
                  {node.metadata.fileType}
                </Text>
              </Box>
            )}

            {node.metadata.size !== undefined && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconDatabase size={14} />
                  File Size
                </Text>
                <Text size="sm" c="gray.3">
                  {formatFileSize(node.metadata.size)}
                </Text>
              </Box>
            )}

            {node.metadata.modified && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconClock size={14} />
                  Last Modified
                </Text>
                <Text size="sm" c="gray.3">
                  {formatTimestamp(node.metadata.modified)}
                </Text>
              </Box>
            )}

            {node.metadata.keys && Array.isArray(node.metadata.keys) && node.metadata.keys.length > 0 && (
              <Box>
                <Text size="xs" c="dimmed" mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconKey size={14} />
                  Configuration Keys ({node.metadata.keys.length})
                </Text>
                <Box
                  style={{
                    maxHeight: 200,
                    overflow: 'auto',
                    background: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <Stack gap="xs">
                    {node.metadata.keys.slice(0, 20).map((key: string, index: number) => (
                      <Code
                        key={index}
                        style={{
                          background: '#252525',
                          color: '#9ca3af',
                          fontSize: '11px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          display: 'block',
                        }}
                      >
                        {key}
                      </Code>
                    ))}
                    {node.metadata.keys.length > 20 && (
                      <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                        ... and {node.metadata.keys.length - 20} more keys
                      </Text>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </Stack>

          <Divider my="lg" style={{ borderColor: '#1a1a1a' }} />

          {/* File Content Preview */}
          {node.node_type === 'file' && (
            <Box>
              <Text size="xs" c="dimmed" mb="xs">
                File Content Preview
              </Text>
              <Box
                style={{
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {loadingContent ? (
                  <Text size="sm" c="dimmed">
                    Loading...
                  </Text>
                ) : content ? (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      lineHeight: '1.6',
                      color: '#9ca3af',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {content.slice(0, 3000)}
                    {content.length > 3000 && '...'}
                  </pre>
                ) : (
                  <Text size="sm" c="dimmed">
                    No content available
                  </Text>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
