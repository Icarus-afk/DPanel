import { Box, Text, Group, Paper } from '@mantine/core';
import { IconTopologyStar } from '@tabler/icons-react';
import { InfrastructureGraphView } from './infrastructure-graph/InfrastructureGraphView';

export default function InfrastructureManager() {
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
          <IconTopologyStar size={32} color="#f59e0b" />
          <Text size="xl" fw={700} c="white">
            Infrastructure Graph
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          Visualize how nginx, Docker containers, volumes, and networks are connected on your server
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
        <InfrastructureGraphView />
      </Paper>
    </Box>
  );
}
