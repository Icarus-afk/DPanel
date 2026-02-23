import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { DockerContainer, ContainerDetails, DockerVolume, DockerNetwork, DockerImage, ComposeProject } from '../types';
import {
  Paper,
  Text,
  Group,
  Title,
  Button,
  Modal,
  Stack,
  ScrollArea,
  Grid,
  Card,
  ThemeIcon,
  Progress,
  Divider,
  Tabs,
  Badge,
  ActionIcon,
  Table,
  Code,
  Alert,
  CopyButton,
  SimpleGrid,
  Center,
  Loader,
  Box,
  Tooltip,
  RingProgress,
} from '@mantine/core';
import {
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconBrandDocker,
  IconCpu,
  IconChartBar,
  IconDetails,
  IconVariable,
  IconNetwork,
  IconDatabase,
  IconFileCode,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconContainer,
  IconBox,
  IconWorld,
} from '@tabler/icons-react';

const DockerEnhanced = memo(function DockerEnhanced() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('containers');
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ContainerDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [composeProjects, setComposeProjects] = useState<ComposeProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['containers']));

  const fetchContainers = useCallback(async () => {
    if (!isConnected) return;
    try {
      const containersData = await invoke<DockerContainer[]>('get_docker_containers');
      setContainers(containersData);
    } catch (err: any) {
      addToast(`Failed to fetch containers: ${err.message}`, 'error');
    }
  }, [isConnected, addToast]);

  const fetchTabData = useCallback(async (tab: string) => {
    if (!isConnected || loadedTabs.has(tab)) return;

    setLoading(true);
    try {
      if (tab === 'volumes') {
        const volumesData = await invoke<DockerVolume[]>('get_docker_volumes');
        setVolumes(volumesData);
      } else if (tab === 'networks') {
        const networksData = await invoke<DockerNetwork[]>('get_docker_networks');
        setNetworks(networksData);
      } else if (tab === 'images') {
        const imagesData = await invoke<DockerImage[]>('get_docker_images');
        setImages(imagesData);
      } else if (tab === 'compose') {
        const composeData = await invoke<ComposeProject[]>('find_compose_files');
        setComposeProjects(composeData);
      }
      setLoadedTabs(prev => new Set(prev).add(tab));
    } catch (err: any) {
      addToast(`Failed to fetch ${tab}: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isConnected, loadedTabs, addToast]);

  const refreshComposeFiles = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const composeData = await invoke<ComposeProject[]>('refresh_compose_files');
      setComposeProjects(composeData);
      addToast('Compose files refreshed', 'success');
    } catch (err: any) {
      addToast(`Failed to refresh compose files: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [containersData, volumesData, networksData, imagesData, composeData] = await Promise.all([
        invoke<DockerContainer[]>('get_docker_containers'),
        invoke<DockerVolume[]>('get_docker_volumes'),
        invoke<DockerNetwork[]>('get_docker_networks'),
        invoke<DockerImage[]>('get_docker_images'),
        invoke<ComposeProject[]>('find_compose_files'),
      ]);
      setContainers(containersData);
      setVolumes(volumesData);
      setNetworks(networksData);
      setImages(imagesData);
      setComposeProjects(composeData);
      setLoadedTabs(new Set(['containers', 'volumes', 'networks', 'images', 'compose']));
      addToast('All data refreshed', 'success');
    } catch (err: any) {
      addToast(`Failed to fetch data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchContainerDetails = async (containerName: string) => {
    try {
      const details = await invoke<ContainerDetails>('get_container_details', { containerName });
      setSelectedContainer(details);
      setShowDetailsModal(true);
    } catch (err: any) {
      addToast(`Failed to fetch details: ${err.message}`, 'error');
    }
  };

  const handleContainerAction = async (action: string, containerName: string) => {
    try {
      await invoke('docker_container_action', { action, containerName });
      addToast(`Container ${containerName} ${action}ed`, 'success');
      setTimeout(fetchContainers, 500);
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    fetchTabData(tab);
  }, [fetchTabData]);

  useEffect(() => {
    if (isConnected) {
      fetchContainers();
      const interval = setInterval(fetchContainers, 15000); // Optimized: 15s instead of 8s
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchContainers]);

  // Fixed: Consistent binary units
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return 'green';
    if (s.includes('paused')) return 'yellow';
    return 'red';
  };

  const stats = useMemo(() => ({
    total: containers.length,
    running: containers.filter(c => c.state.toLowerCase().includes('running')).length,
    stopped: containers.filter(c => !c.state.toLowerCase().includes('running')).length,
  }), [containers]);

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconBrandDocker size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to manage Docker</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconBrandDocker size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Docker Manager</Title>
            <Text size="xs" c="dimmed">
              {stats.running}/{stats.total} running • {volumes.length} volumes • {networks.length} networks
            </Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={fetchAllData}
          loading={loading}
          leftSection={<IconRefresh size={16} />}
        >
          Refresh All
        </Button>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue" size="md">
              <IconContainer size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Total Containers</Text>
              <Text size="xl" fw={700}>{stats.total}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="green" size="md">
              <IconPlayerPlay size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Running</Text>
              <Text size="xl" fw={700} c="green">{stats.running}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="red" size="md">
              <IconPlayerStop size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Stopped</Text>
              <Text size="xl" fw={700} c="red">{stats.stopped}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="violet" size="md">
              <IconDatabase size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Volumes</Text>
              <Text size="xl" fw={700}>{loadedTabs.has('volumes') ? volumes.length : '-'}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} variant="pills">
        <Tabs.List>
          <Tabs.Tab value="containers" leftSection={<IconBrandDocker size={16} />}>
            Containers ({containers.length})
          </Tabs.Tab>
          <Tabs.Tab value="images" leftSection={<IconDatabase size={16} />}>
            Images ({loadedTabs.has('images') ? images.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="volumes" leftSection={<IconDatabase size={16} />}>
            Volumes ({loadedTabs.has('volumes') ? volumes.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="networks" leftSection={<IconNetwork size={16} />}>
            Networks ({loadedTabs.has('networks') ? networks.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="compose" leftSection={<IconFileCode size={16} />}>
            Compose ({loadedTabs.has('compose') ? composeProjects.length : '-'})
          </Tabs.Tab>
        </Tabs.List>

        {/* Containers Tab */}
        <Tabs.Panel value="containers" pt="md">
          <Grid gutter="md">
            {containers.map((container) => (
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={container.id}>
                <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          variant="light"
                          color={getStatusColor(container.state)}
                          size="md"
                        >
                          {container.state.toLowerCase().includes('running') ? (
                            <IconPlayerPlay size={14} />
                          ) : (
                            <IconPlayerStop size={14} />
                          )}
                        </ThemeIcon>
                        <Text fw={600}>{container.name}</Text>
                      </Group>
                      <Badge color={getStatusColor(container.state)} variant="light">
                        {container.state}
                      </Badge>
                    </Group>

                    <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      {container.image}
                    </Text>

                    <Divider />

                    <SimpleGrid cols={2}>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <IconCpu size={14} />
                          <Text size="xs" c="dimmed">CPU</Text>
                        </Group>
                        <Text fw={600} size="sm">{container.cpu_percent.toFixed(1)}%</Text>
                        <Progress
                          value={container.cpu_percent}
                          size="xs"
                          color={container.cpu_percent > 50 ? 'red' : 'blue'}
                        />
                      </Stack>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <IconChartBar size={14} />
                          <Text size="xs" c="dimmed">Memory</Text>
                        </Group>
                        <Text fw={600} size="sm">{formatBytes(container.memory_usage)}</Text>
                        <Progress
                          value={(container.memory_usage / container.memory_limit) * 100}
                          size="xs"
                          color={(container.memory_usage / container.memory_limit) * 100 > 80 ? 'red' : 'green'}
                        />
                      </Stack>
                    </SimpleGrid>

                    <Group gap="xs" wrap="wrap">
                      {container.state.toLowerCase().includes('running') ? (
                        <>
                          <Button
                            variant="light"
                            color="blue"
                            size="compact-xs"
                            onClick={() => handleContainerAction('restart', container.name)}
                          >
                            Restart
                          </Button>
                          <Button
                            variant="light"
                            color="red"
                            size="compact-xs"
                            onClick={() => handleContainerAction('stop', container.name)}
                          >
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="light"
                          color="green"
                          size="compact-xs"
                          onClick={() => handleContainerAction('start', container.name)}
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        color="gray"
                        size="compact-xs"
                        onClick={() => fetchContainerDetails(container.name)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        color="gray"
                        size="compact-xs"
                        onClick={async () => {
                          try {
                            const logs = await invoke('get_container_logs', { containerName: container.name, lines: 100 });
                            addToast('Logs copied to clipboard', 'success');
                            navigator.clipboard.writeText(String(logs));
                          } catch (err: any) {
                            addToast(`Failed: ${err.message}`, 'error');
                          }
                        }}
                      >
                        Logs
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>

        {/* Images Tab */}
        <Tabs.Panel value="images" pt="md">
          {!loadedTabs.has('images') ? (
            <Center h={200}><Loader size="sm" /></Center>
          ) : (
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Repository</Table.Th>
                    <Table.Th>Tag</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th>ID</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {images.map((img) => (
                    <Table.Tr key={img.id}>
                      <Table.Td>{img.repository}</Table.Td>
                      <Table.Td><Badge size="sm">{img.tag}</Badge></Table.Td>
                      <Table.Td c="dimmed">{img.created}</Table.Td>
                      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{img.id}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Volumes Tab */}
        <Tabs.Panel value="volumes" pt="md">
          {!loadedTabs.has('volumes') ? (
            <Center h={200}><Loader size="sm" /></Center>
          ) : (
            <Grid gutter="md">
              {volumes.map((vol) => (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={vol.name}>
                  <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{vol.name}</Text>
                        <Badge variant="light">{vol.driver}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                        {vol.mountpoint}
                      </Text>
                      <Badge size="sm" variant="outline">{vol.scope}</Badge>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Tabs.Panel>

        {/* Networks Tab */}
        <Tabs.Panel value="networks" pt="md">
          {!loadedTabs.has('networks') ? (
            <Center h={200}><Loader size="sm" /></Center>
          ) : (
            <Grid gutter="md">
              {networks.map((net) => (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={net.id}>
                  <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{net.name}</Text>
                        <Badge variant="light">{net.driver}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">ID: {net.id}</Text>
                      <Badge size="sm" variant="outline">{net.scope}</Badge>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Tabs.Panel>

        {/* Compose Tab */}
        <Tabs.Panel value="compose" pt="md">
          {!loadedTabs.has('compose') ? (
            <Center h={200}><Loader size="sm" /></Center>
          ) : (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={600}>Docker Compose Projects</Text>
                <Button
                  size="compact-xs"
                  variant="outline"
                  leftSection={<IconRefresh size={14} />}
                  onClick={refreshComposeFiles}
                  loading={loading}
                >
                  Refresh Scan
                </Button>
              </Group>
              {composeProjects.length === 0 ? (
                <Alert icon={<IconFileCode size={18} />} title="No Compose Files Found">
                  No docker-compose.yml files found in /home, /opt, or /srv directories.
                </Alert>
              ) : (
                composeProjects.map((project, idx) => (
                  <Card key={idx} withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600}>{project.name}</Text>
                        <Badge variant="light">{project.services.length} services</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">{project.path}</Text>
                      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-8)">
                        <Group justify="space-between" mb="xs">
                          <Text size="xs" fw={600}>docker-compose.yml</Text>
                          <CopyButton value={project.content}>
                            {({ copy: copyFn }) => (
                              <Button color="blue" size="compact-xs" onClick={copyFn}>Copy</Button>
                            )}
                          </CopyButton>
                        </Group>
                        <ScrollArea.Autosize mah={300}>
                          <Code block style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
                            {project.content}
                          </Code>
                        </ScrollArea.Autosize>
                      </Paper>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Container Details Modal */}
      <Modal
        opened={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" size="md">
              <IconBrandDocker size={18} />
            </ThemeIcon>
            <Text fw={600}>Container: {selectedContainer?.name}</Text>
          </Group>
        }
        size="xl"
      >
        {selectedContainer && (
          <Stack gap="md">
            {/* Quick Info */}
            <SimpleGrid cols={2}>
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                <Text size="xs" c="dimmed">Status</Text>
                <Group gap="xs">
                  <Badge color={getStatusColor(selectedContainer.state)} variant="light">
                    {selectedContainer.state}
                  </Badge>
                </Group>
              </Paper>
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                <Text size="xs" c="dimmed">Image</Text>
                <Text fw={600} size="sm">{selectedContainer.image}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                <Text size="xs" c="dimmed">Created</Text>
                <Text fw={600} size="sm">{new Date(selectedContainer.created).toLocaleString()}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                <Text size="xs" c="dimmed">Memory Limit</Text>
                <Text fw={600} size="sm">{selectedContainer.memory_limit || 'Unlimited'}</Text>
              </Paper>
            </SimpleGrid>

            <Tabs defaultValue="env">
              <Tabs.List>
                <Tabs.Tab value="env" leftSection={<IconVariable size={16} />}>
                  Environment
                </Tabs.Tab>
                <Tabs.Tab value="ports" leftSection={<IconNetwork size={16} />}>
                  Ports
                </Tabs.Tab>
                <Tabs.Tab value="volumes" leftSection={<IconDatabase size={16} />}>
                  Volumes
                </Tabs.Tab>
                <Tabs.Tab value="networks" leftSection={<IconWorld size={16} />}>
                  Networks
                </Tabs.Tab>
                <Tabs.Tab value="labels" leftSection={<IconDetails size={16} />}>
                  Labels
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="env" pt="md">
                <Group justify="space-between" mb="sm">
                  <Text size="sm" fw={600}>Environment Variables</Text>
                  <Button
                    size="compact-xs"
                    variant={showSecrets ? 'filled' : 'outline'}
                    color={showSecrets ? 'red' : 'blue'}
                    onClick={() => setShowSecrets(!showSecrets)}
                    leftSection={showSecrets ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  >
                    {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                  </Button>
                </Group>
                {showSecrets ? (
                  <ScrollArea.Autosize mah={300}>
                    <Stack gap="xs">
                      {selectedContainer.env_vars.map((env, idx) => (
                        <Paper key={idx} withBorder p="xs" radius="md" bg="var(--mantine-color-dark-8)">
                          <Code block>{env}</Code>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                ) : (
                  <Alert icon={<IconVariable size={18} />} color="blue">
                    Environment variables containing PASSWORD, SECRET, KEY, or TOKEN are hidden.
                    Click "Show Secrets" to reveal.
                  </Alert>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="ports" pt="md">
                {selectedContainer.ports.length === 0 ? (
                  <Text c="dimmed">No port mappings</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.ports.map((port, idx) => (
                      <Group key={idx} justify="space-between">
                        <Text size="sm">
                          <strong>{port.host_ip}:{port.host_port}</strong> → <strong>{port.container_port}</strong>/{port.protocol}
                        </Text>
                        <CopyButton value={`${port.host_ip}:${port.host_port}`}>
                          {({ copy: copyFn }) => (
                            <ActionIcon variant="subtle" onClick={copyFn}>
                              <IconCopy size={16} />
                            </ActionIcon>
                          )}
                        </CopyButton>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="volumes" pt="md">
                {selectedContainer.volumes.length === 0 ? (
                  <Text c="dimmed">No volume mounts</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.volumes.map((vol, idx) => (
                      <Paper key={idx} withBorder p="xs" radius="md" bg="var(--mantine-color-dark-8)">
                        <Text size="sm">
                          <strong>{vol.source}</strong> → <strong>{vol.destination}</strong>
                        </Text>
                        <Text size="xs" c="dimmed">Mode: {vol.mode}</Text>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="networks" pt="md">
                {selectedContainer.networks.length === 0 ? (
                  <Text c="dimmed">No networks</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.networks.map((net, idx) => (
                      <Badge key={idx} variant="light" size="lg">
                        {net}
                      </Badge>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="labels" pt="md">
                {selectedContainer.labels.length === 0 ? (
                  <Text c="dimmed">No labels</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.labels.map((label, idx) => (
                      <Group key={idx} justify="space-between">
                        <Text size="sm" c="dimmed">{label.key}</Text>
                        <Code>{label.value}</Code>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
});

export default DockerEnhanced;
