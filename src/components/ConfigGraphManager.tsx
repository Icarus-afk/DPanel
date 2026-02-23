import { Box, Text, Group, Paper } from '@mantine/core';
import { IconGraph } from '@tabler/icons-react';
import { ConfigGraph } from './config-graph/ConfigGraph';

export function ConfigGraphManager() {
  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box style={{ marginBottom: 24 }}>
        <Group gap="sm" mb="xs">
          <IconGraph size={32} color="#3b82f6" />
          <Text size="xl" fw={700} c="white">
            Configuration Graph
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          Visualize configuration files, their relationships, and dependencies across your project
        </Text>
      </Box>

      {/* Graph Container */}
      <Paper
        style={{
          flex: 1,
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ConfigGraph />
      </Paper>
    </Box>
  );
}

export default ConfigGraphManager;
