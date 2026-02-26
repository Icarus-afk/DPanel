import { Box, Text, Group, Stack, Card } from '@mantine/core';
import { Icons } from '../lib/icons';
import { ConfigGraph } from './config-graph/ConfigGraph';

export function ConfigGraphManager() {
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
              background: 'hsl(var(--primary-subtle))',
              border: '1px solid hsl(var(--primary-border))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(var(--primary))',
            }}
          >
            <Icons.Graph size={24} />
          </Box>
          <Stack gap={0}>
            <Text size="xl" fw={700} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)' }}>
              Configuration Graph
            </Text>
            <Text size="sm" c="var(--text-tertiary)">
              Visualize configuration files, their relationships, and dependencies across your project
            </Text>
          </Stack>
        </Group>
      </Box>

      {/* Graph Container */}
      <Card className="card" style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: '600px' }}>
        <ConfigGraph />
      </Card>
    </div>
  );
}

export default ConfigGraphManager;
