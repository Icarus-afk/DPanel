import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { DockerContainer } from '../types';
import {
  Paper, Text, Group, Table, ActionIcon, Badge, Title, Button, Modal, Stack,
  ScrollArea, Grid, Card, ThemeIcon, Box, Progress, Divider, Tooltip, SimpleGrid,
} from '@mantine/core';
import {
  RefreshCw, Play, Pause, Square, FileText, Box as BoxIcon, Clock, Cpu,
  BarChart3, HardDrive, Activity, Terminal, MoreVertical, FolderOpen,
} from 'lucide-react';

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

  const formatImageName = (image: string) => {
    // Remove SHA256 hash and registry prefix
    const cleanImage = image.replace(/^[^/]+\//, '') // Remove registry prefix
      .replace(/@sha256:[a-f0-9]+$/, '') // Remove @sha256:hash
      .replace(/sha256:[a-f0-9]+$/, ''); // Remove sha256:hash
    return cleanImage;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const containers = useMemo(() => cachedContainers || [], [cachedContainers]);
  const runningCount = useMemo(() =>
    containers.filter(c => c.state.toLowerCase().includes('running')).length,
    [containers]
  );
  const stoppedCount = useMemo(() =>
    containers.filter(c => !c.state.toLowerCase().includes('running')).length,
    [containers]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Group justify="space-between" className="mb-2">
        <Group gap="sm">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <BoxIcon size={20} className="text-blue-400" />
          </div>
          <Stack gap={0}>
            <Title order={3} className="text-white text-lg font-semibold">Docker Containers</Title>
            <Text size="xs" className="text-neutral-500">
              {runningCount} running • {stoppedCount} stopped
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="outline"
            size="compact-sm"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            {viewMode === 'table' ? 'Card View' : 'Table View'}
          </Button>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={fetchContainers}
            loading={loading}
            className="text-blue-400 hover:bg-blue-500/10"
          >
            <RefreshCw size={16} />
          </Button>
        </Group>
      </Group>

      {error && (
        <Card className="bg-neutral-900 border border-red-900/50 p-4">
          <Group gap="sm">
            <Activity size={18} className="text-red-400" />
            <Text size="sm" className="text-red-400">{error}</Text>
          </Group>
        </Card>
      )}

      {containers.length === 0 ? (
        <Card className="bg-neutral-900 border border-neutral-800 p-8">
          <Stack align="center" gap="md">
            <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center">
              <BoxIcon size={32} className="text-neutral-500" />
            </div>
            <Text className="text-neutral-400">No Docker containers found</Text>
          </Stack>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Card View */}
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
        /* Table View */}
        <Card className="bg-neutral-900 border border-neutral-800 p-0 overflow-hidden">
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr className="border-neutral-800">
                  <Table.Th className="text-neutral-400">Name</Table.Th>
                  <Table.Th className="text-neutral-400">Image</Table.Th>
                  <Table.Th className="text-neutral-400">Status</Table.Th>
                  <Table.Th className="text-neutral-400">CPU</Table.Th>
                  <Table.Th className="text-neutral-400">Memory</Table.Th>
                  <Table.Th className="text-neutral-400">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {containers.map((container) => (
                  <Table.Tr key={container.id} className="border-neutral-800 hover:bg-neutral-800/50">
                    <Table.Td>
                      <Tooltip label={container.name}>
                        <Text fw={500} className="text-white truncate max-w-[150px]">
                          {container.name}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={container.image}>
                        <Text className="text-neutral-500 font-mono text-xs truncate max-w-[150px]">
                          {formatImageName(container.image)}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        className={`${
                          container.state.toLowerCase().includes('running')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : container.state.toLowerCase().includes('paused')
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'
                        } border`}
                      >
                        {container.state}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text className="text-white text-sm">{container.cpu_percent.toFixed(1)}%</Text>
                        <Progress
                          value={container.cpu_percent}
                          size="xs"
                          className="bg-neutral-800"
                          style={{ backgroundColor: '#262626' }}
                          color={container.cpu_percent > 80 ? 'red' : container.cpu_percent > 50 ? 'yellow' : 'blue'}
                        />
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-white text-sm">{formatBytes(container.memory_usage)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {container.state.toLowerCase().includes('running') ? (
                          <>
                            <Tooltip label="Restart">
                              <ActionIcon
                                variant="subtle"
                                onClick={() => handleContainerAction('restart', container.name)}
                                className="text-blue-400 hover:bg-blue-500/10"
                              >
                                <RefreshCw size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Stop">
                              <ActionIcon
                                variant="subtle"
                                onClick={() => handleContainerAction('stop', container.name)}
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Square size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip label="Start">
                            <ActionIcon
                              variant="subtle"
                              onClick={() => handleContainerAction('start', container.name)}
                              className="text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Play size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="View Logs">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => handleViewLogs(container.name)}
                            className="text-neutral-400 hover:bg-neutral-800"
                          >
                            <FileText size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Logs Modal */}
      <Modal
        opened={showLogs}
        onClose={() => setShowLogs(false)}
        title={
          <Group gap="sm">
            <Terminal size={18} className="text-blue-400" />
            <Text fw={600} className="text-white">Logs - {selectedContainer}</Text>
          </Group>
        }
        size="xl"
        centered
        styles={{
          content: { backgroundColor: '#0a0a0a', border: '1px solid #262626' },
          header: { borderBottom: '1px solid #262626' },
          body: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" className="text-neutral-500">Last 200 lines</Text>
            <Button
              variant="outline"
              size="compact-sm"
              onClick={() => {
                navigator.clipboard.writeText(logs);
                addToast('Logs copied to clipboard', 'success');
              }}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Copy
            </Button>
          </Group>
          <Paper withBorder p="md" radius="md" className="bg-neutral-900 border-neutral-800">
            <ScrollArea.Autosize mah={500}>
              <Box
                component="pre"
                className="font-mono text-xs text-neutral-300 whitespace-pre-wrap break-all"
              >
                {logs || <Text className="text-neutral-500">No logs available</Text>}
              </Box>
            </ScrollArea.Autosize>
          </Paper>
        </Stack>
      </Modal>
    </div>
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
  const isRunning = container.state.toLowerCase().includes('running');
  const isPaused = container.state.toLowerCase().includes('paused');
  
  const formatImageName = (image: string) => {
    const cleanImage = image.replace(/^[^/]+\//, '')
      .replace(/@sha256:[a-f0-9]+$/, '')
      .replace(/sha256:[a-f0-9]+$/, '');
    return cleanImage;
  };

  return (
    <Card className="bg-neutral-900 border border-neutral-800 p-4 hover:border-neutral-700 transition-all">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isRunning ? 'bg-emerald-500/10' : isPaused ? 'bg-yellow-500/10' : 'bg-neutral-500/10'
            }`}>
              {isRunning ? (
                <Play size={18} className="text-emerald-400" />
              ) : isPaused ? (
                <Pause size={18} className="text-yellow-400" />
              ) : (
                <Square size={18} className="text-neutral-400" />
              )}
            </div>
            <Stack gap={0}>
              <Tooltip label={container.name}>
                <Text fw={600} className="text-white truncate max-w-[150px]">
                  {container.name}
                </Text>
              </Tooltip>
              <Tooltip label={container.image}>
                <Text size="xs" className="text-neutral-500 font-mono truncate max-w-[150px]">
                  {formatImageName(container.image)}
                </Text>
              </Tooltip>
            </Stack>
          </Group>
          <Badge
            className={`${
              isRunning
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isPaused
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'
            } border`}
          >
            {container.state}
          </Badge>
        </Group>

        <Divider className="border-neutral-800" />

        {/* Stats */}
        <SimpleGrid cols={2}>
          <Stack gap={2}>
            <Group gap="xs">
              <Cpu size={14} className="text-blue-400" />
              <Text size="xs" className="text-neutral-500">CPU</Text>
            </Group>
            <Text fw={600} size="sm" className="text-white">{container.cpu_percent.toFixed(1)}%</Text>
            <Progress
              value={container.cpu_percent}
              size="xs"
              className="bg-neutral-800"
              style={{ backgroundColor: '#262626' }}
              color={container.cpu_percent > 80 ? 'red' : container.cpu_percent > 50 ? 'yellow' : 'blue'}
            />
          </Stack>
          <Stack gap={2}>
            <Group gap="xs">
              <HardDrive size={14} className="text-emerald-400" />
              <Text size="xs" className="text-neutral-500">Memory</Text>
            </Group>
            <Text fw={600} size="sm" className="text-white">{formatBytes(container.memory_usage)}</Text>
            <Progress
              value={(container.memory_usage / container.memory_limit) * 100}
              size="xs"
              className="bg-neutral-800"
              style={{ backgroundColor: '#262626' }}
              color="emerald"
            />
          </Stack>
        </SimpleGrid>

        {/* Volumes */}
        {container.volumes && container.volumes.length > 0 && (
          <Stack gap={2}>
            <Group gap="xs">
              <FolderOpen size={14} className="text-purple-400" />
              <Text size="xs" className="text-neutral-500">Volumes</Text>
            </Group>
            <Stack gap={1}>
              {container.volumes.slice(0, 3).map((volume, idx) => (
                <Text key={idx} size="xs" className="text-neutral-400 font-mono truncate">
                  {volume}
                </Text>
              ))}
              {container.volumes.length > 3 && (
                <Text size="xs" className="text-neutral-500">
                  +{container.volumes.length - 3} more
                </Text>
              )}
            </Stack>
          </Stack>
        )}

        {/* Status */}
        <Group gap="xs">
          <Clock size={14} className="text-neutral-500" />
          <Text size="xs" className="text-neutral-500">{container.status}</Text>
        </Group>

        {/* Actions */}
        <Group gap="xs">
          {isRunning ? (
            <>
              <Button
                variant="outline"
                size="compact-xs"
                onClick={() => onAction('restart', container.name)}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                leftSection={<RefreshCw size={12} />}
              >
                Restart
              </Button>
              <Button
                variant="outline"
                size="compact-xs"
                onClick={() => onAction('stop', container.name)}
                className="border-red-900/50 text-red-400 hover:bg-red-500/10"
                leftSection={<Square size={12} />}
              >
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="compact-xs"
              onClick={() => onAction('start', container.name)}
              className="border-emerald-900/50 text-emerald-400 hover:bg-emerald-500/10"
              leftSection={<Play size={12} />}
            >
              Start
            </Button>
          )}
          <Button
            variant="outline"
            size="compact-xs"
            onClick={() => onViewLogs(container.name)}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            leftSection={<FileText size={12} />}
          >
            Logs
          </Button>
        </Group>
      </Stack>
    </Card>
  );
});
