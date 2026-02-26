import { Box, Text, Group, Stack, Card } from '@mantine/core';
import { Icons } from '../lib/icons';
import { InfrastructureGraphView } from './infrastructure-graph/InfrastructureGraphView';

export default function InfrastructureManager() {
  return (
    <div className="page-container animate-fade-in-up">
      {/* Header */}
      <Box style={{ marginBottom: 'var(--space-6)' }}>
        <Group gap="sm" mb="xs">
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'hsl(var(--warning-subtle))',
              border: '1px solid hsl(var(--warning-border))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(var(--warning))',
            }}
          >
            <Icons.TopologyStar size={24} />
          </Box>
          <Stack gap={0}>
            <Text size="xl" fw={700} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)' }}>
              Infrastructure Graph
            </Text>
            <Text size="sm" c="var(--text-tertiary)">
              Visualize how nginx, Docker containers, volumes, and networks are connected on your server
            </Text>
          </Stack>
        </Group>
      </Box>

      {/* Graph Container */}
      <Card className="card" style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: '600px' }}>
        <InfrastructureGraphView />
      </Card>
    </div>
  );
}
