import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { DockerContainer } from '../types';
import {
  Paper,
  Text,
  Group,
  Table,
  ActionIcon,
  Badge,
  Title,
  Button,
  Modal,
  Stack,
  ScrollArea,
  Grid,
  Card,
  ThemeIcon,
  Box,
  Progress,
  Divider,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import {
  IconRefresh,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconFileText,
  IconBrandDocker,
  IconClock,
  IconCpu,
  IconChartBar,
} from '@tabler/icons-react';

export default function DockerManager() {
  const { cachedContainers, setCachedContainers } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke('get_docker_containers') as DockerContainer[];
      setCachedContainers(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  }, [setCachedContainers]);

  useEffect(() => {
    fetchContainers();
    // Optimized: fetch every 8 seconds instead of 3
    const interval = setInterval(fetchContainers, 8000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const handleContainerAction = useCallback(async (action: string, containerName: string) => {
    try {
      await invoke('docker_container_action', { action, containerName });
      addToast(`Container ${containerName} ${action}ed`, 'success');
      setTimeout(fetchContainers, 500);
    } catch (err: any) {
      addToast(`Failed to ${action} container: ${err.message}`, 'error');
    }
  }, [addToast, fetchContainers]);

  const handleViewLogs = useCallback(async (containerName: string) => {
    try {
      setLoading(true);
      const result = await invoke('get_container_logs', { containerName, lines: 200 }) as string;
      setLogs(result);
      setSelectedContainer(containerName);
      setShowLogs(true);
    } catch (err: any) {
      addToast(`Failed to fetch logs: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const truncateName = (name: string, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };

  const truncateImage = (image: string, maxLength = 25) => {
    // Remove registry prefix if present
    const cleanImage = image.replace(/^[^/]+\//, '');
    if (cleanImage.length <= maxLength) return cleanImage;
    const parts = cleanImage.split(':');
    if (parts[0].length > maxLength) {
      return `${parts[0].substring(0, maxLength)}...${parts[1] ? ':' + parts[1] : ''}`;
    }
    return cleanImage;
  };

  const getStatusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return 'green';
    if (s.includes('paused')) return 'yellow';
    if (s.includes('exited') || s.includes('dead')) return 'red';
    return 'gray';
  };

  const getStatusIcon = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return <IconPlayerPlay size={12} />;
    if (s.includes('paused')) return <IconPlayerPause size={12} />;
    return <IconPlayerStop size={12} />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Memoized computed values
  const containers = useMemo(() => cachedContainers || [], [cachedContainers]);
  const runningCount = useMemo(() => 
    containers.filter(c => c.state.toLowerCase().includes('running')).length, 
    [containers]
  );

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconBrandDocker size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Docker Containers</Title>
            <Text size="xs" c="dimmed">
              {runningCount}/{containers.length} containers running
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
          >
            {viewMode === 'table' ? 'Card View' : 'Table View'}
          </Button>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={fetchContainers}
            loading={loading}
            leftSection={<IconRefresh size={16} />}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      {error && (
        <Paper withBorder p="md" radius="md" bg="var(--mantine-color-red-9)">
          <Group gap="sm">
            <IconRefresh size={18} />
            <Text size="sm" c="red.2">{error}</Text>
          </Group>
        </Paper>
      )}

      {containers.length === 0 ? (
        <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
          <Stack align="center" gap="md">
            <ThemeIcon size="xl" variant="light" color="gray">
              <IconBrandDocker size={32} />
            </ThemeIcon>
            <Text c="dimmed">No Docker containers found</Text>
          </Stack>
        </Paper>
      ) : viewMode === 'cards' ? (
        /* Card View - Using memoized ContainerCard component */
        <Grid gutter="md">
          {containers.map((container) => (
            <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={container.id}>
              <ContainerCard
                container={container}
                onAction={handleContainerAction}
                onViewLogs={handleViewLogs}
                formatBytes={formatBytes}
              />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        /* Table View */
        <Paper withBorder radius="md" bg="var(--mantine-color-dark-6)">
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Image</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>CPU</Table.Th>
                  <Table.Th>Memory</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {containers.map((container) => (
                  <Table.Tr key={container.id}>
                    <Table.Td>
                      <Tooltip label={container.name}>
                        <Text fw={500} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {truncateName(container.name)}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={container.image}>
                        <Text c="dimmed" style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {truncateImage(container.image)}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(container.state)}
                        variant="light"
                        leftSection={getStatusIcon(container.state)}
                      >
                        {container.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text>{container.cpu_percent.toFixed(1)}%</Text>
                        <Progress value={container.cpu_percent} size="xs" color="blue" w={60} />
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text>{formatBytes(container.memory_usage)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {container.state.toLowerCase().includes('running') ? (
                          <>
                            <Tooltip label="Restart">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => handleContainerAction('restart', container.name)}
                              >
                                <IconRefresh size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Stop">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => handleContainerAction('stop', container.name)}
                              >
                                <IconPlayerStop size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip label="Start">
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              onClick={() => handleContainerAction('start', container.name)}
                            >
                              <IconPlayerPlay size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="View Logs">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => handleViewLogs(container.name)}
                          >
                            <IconFileText size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {/* Logs Modal */}
      <Modal
        opened={showLogs}
        onClose={() => setShowLogs(false)}
        title={
          <Group gap="sm">
            <IconFileText size={18} />
            <Text fw={600}>Logs - {selectedContainer}</Text>
          </Group>
        }
        size="xl"
        centered
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Last 200 lines</Text>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                navigator.clipboard.writeText(logs);
                addToast('Logs copied to clipboard', 'success');
              }}
            >
              Copy
            </Button>
          </Group>
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-8)">
            <ScrollArea.Autosize mah={500}>
              <Box
                component="pre"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'var(--mantine-color-gray-3)',
                }}
              >
                {logs || <Text c="dimmed">No logs available</Text>}
              </Box>
            </ScrollArea.Autosize>
          </Paper>
        </Stack>
      </Modal>
    </Stack>
  );
}

// Memoized Container Card component
interface ContainerCardProps {
  container: DockerContainer;
  onAction: (action: string, name: string) => void;
  onViewLogs: (name: string) => void;
  formatBytes: (bytes: number) => string;
}

const ContainerCard = memo(function ContainerCard({ container, onAction, onViewLogs, formatBytes }: ContainerCardProps) {
  const getStatusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return 'green';
    if (s.includes('paused')) return 'yellow';
    if (s.includes('exited') || s.includes('dead')) return 'red';
    return 'gray';
  };

  const getStatusIcon = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return <IconPlayerPlay size={12} />;
    if (s.includes('paused')) return <IconPlayerPause size={12} />;
    return <IconPlayerStop size={12} />;
  };

  const truncateName = (name: string, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };

  const truncateImage = (image: string, maxLength = 25) => {
    const cleanImage = image.replace(/^[^/]+\//, '');
    if (cleanImage.length <= maxLength) return cleanImage;
    const parts = cleanImage.split(':');
    if (parts[0].length > maxLength) {
      return `${parts[0].substring(0, maxLength)}...${parts[1] ? ':' + parts[1] : ''}`;
    }
    return cleanImage;
  };

  return (
    <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon
              variant="light"
              color={getStatusColor(container.state)}
              size="md"
            >
              {getStatusIcon(container.state)}
            </ThemeIcon>
            <Stack gap={0}>
              <Tooltip label={container.name}>
                <Text fw={600} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {truncateName(container.name)}
                </Text>
              </Tooltip>
              <Tooltip label={container.image}>
                <Text size="xs" c="dimmed" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {truncateImage(container.image)}
                </Text>
              </Tooltip>
            </Stack>
          </Group>
          <Badge
            color={getStatusColor(container.state)}
            variant={container.state.toLowerCase().includes('running') ? 'light' : 'outline'}
            size="sm"
          >
            {container.state}
          </Badge>
        </Group>

        <Divider />

        {/* Stats */}
        <SimpleGrid cols={2}>
          <Stack gap={2}>
            <Group gap="xs">
              <IconCpu size={14} color="var(--mantine-color-blue-4)" />
              <Text size="xs" c="dimmed">CPU</Text>
            </Group>
            <Text fw={600} size="sm">{container.cpu_percent.toFixed(1)}%</Text>
            <Progress value={container.cpu_percent} size="xs" color="blue" />
          </Stack>
          <Stack gap={2}>
            <Group gap="xs">
              <IconChartBar size={14} color="var(--mantine-color-green-4)" />
              <Text size="xs" c="dimmed">Memory</Text>
            </Group>
            <Text fw={600} size="sm">{formatBytes(container.memory_usage)}</Text>
            <Progress
              value={(container.memory_usage / container.memory_limit) * 100}
              size="xs"
              color="green"
            />
          </Stack>
        </SimpleGrid>

        {/* Status */}
        <Group gap="xs">
          <IconClock size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">{container.status}</Text>
        </Group>

        {/* Actions */}
        <Group gap="xs" wrap="wrap">
          {container.state.toLowerCase().includes('running') ? (
            <>
              <Button
                variant="light"
                color="blue"
                size="compact-xs"
                leftSection={<IconRefresh size={12} />}
                onClick={() => onAction('restart', container.name)}
              >
                Restart
              </Button>
              <Button
                variant="light"
                color="red"
                size="compact-xs"
                leftSection={<IconPlayerStop size={12} />}
                onClick={() => onAction('stop', container.name)}
              >
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="light"
              color="green"
              size="compact-xs"
              leftSection={<IconPlayerPlay size={12} />}
              onClick={() => onAction('start', container.name)}
            >
              Start
            </Button>
          )}
          <Button
            variant="outline"
            color="gray"
            size="compact-xs"
            leftSection={<IconFileText size={12} />}
            onClick={() => onViewLogs(container.name)}
          >
            Logs
          </Button>
        </Group>
      </Stack>
    </Card>
  );
});
