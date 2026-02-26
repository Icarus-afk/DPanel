import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { DockerContainer, ContainerDetails, DockerVolume, DockerNetwork, DockerImage, ComposeProject } from '../types';
import {
  Paper, Text, Group, Title, Button, Modal, Stack, ScrollArea, Grid, Card,
  Progress, Divider, Tabs, Badge, ActionIcon, Table, Code, Alert, CopyButton,
  SimpleGrid, Center, Loader, Box, Tooltip,
} from '@mantine/core';
import { Icons } from '../lib/icons';

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
      // Fetch all data on mount when Docker tab is first visited
      fetchAllData();

      // Start polling interval for containers only
      let interval = setInterval(fetchContainers, 15000);

      // Visibility API - pause fetching when tab is hidden
      const handleVisibilityChange = () => {
        if (document.hidden) {
          clearInterval(interval);
        } else {
          // Tab is visible again - fetch immediately and restart interval
          fetchContainers();
          interval = setInterval(fetchContainers, 15000);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isConnected]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('running')) return 'success';
    if (s.includes('paused')) return 'warning';
    return 'error';
  };

  const getMetricColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'error';
    if (value >= warning) return 'warning';
    return 'primary';
  };

  const stats = useMemo(() => ({
    total: containers.length,
    running: containers.filter(c => c.state.toLowerCase().includes('running')).length,
    stopped: containers.filter(c => !c.state.toLowerCase().includes('running')).length,
    images: images.length,
    volumes: volumes.length,
    networks: networks.length,
  }), [containers, images, volumes, networks]);

  if (!isConnected) {
    return (
      <div className="page-container animate-fade-in-up">
        <Card className="card card-elevated" style={{ maxWidth: 500, margin: '0 auto' }}>
          <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'hsl(var(--bg-tertiary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--text-tertiary))',
              }}
            >
              <Icons.Docker size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Docker Manager</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage Docker containers
            </Text>
          </Stack>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up">
      {/* Header */}
      <Group justify="space-between" className="mb-6" style={{ marginBottom: 'var(--space-6)' }}>
        <Group gap="sm">
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
            <Icons.Docker size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Docker Manager
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              {stats.running}/{stats.total} running • {stats.volumes} volumes • {stats.networks} networks • {stats.images} images
            </Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={fetchAllData}
          loading={loading}
          leftSection={<Icons.Refresh size={16} />}
          style={{
            background: 'hsl(var(--bg-tertiary))',
            color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-default))',
          }}
        >
          Refresh All
        </Button>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} style={{ marginBottom: 'var(--space-4)' }}>
        {/* Total Containers */}
        <Card className="card card-hover metric-card metric-card--primary">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--primary">
              <Icons.Container size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Total Containers</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{stats.total}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Running */}
        <Card className="card card-hover metric-card metric-card--success">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--success">
              <Icons.Play size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Running</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--success))' }}>{stats.running}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Stopped */}
        <Card className="card card-hover metric-card metric-card--error">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--error">
              <Icons.Stop size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Stopped</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--error))' }}>{stats.stopped}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Volumes */}
        <Card className="card card-hover metric-card metric-card--warning">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--warning">
              <Icons.Database size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Volumes</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>
                {loadedTabs.has('volumes') ? stats.volumes : '-'}
              </Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} variant="pills">
        <Tabs.List style={{ marginBottom: 'var(--space-4)' }}>
          <Tabs.Tab value="containers" leftSection={<Icons.Docker size={16} />}>
            Containers ({containers.length})
          </Tabs.Tab>
          <Tabs.Tab value="images" leftSection={<Icons.Database size={16} />}>
            Images ({loadedTabs.has('images') ? images.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="volumes" leftSection={<Icons.Database size={16} />}>
            Volumes ({loadedTabs.has('volumes') ? volumes.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="networks" leftSection={<Icons.Network size={16} />}>
            Networks ({loadedTabs.has('networks') ? networks.length : '-'})
          </Tabs.Tab>
          <Tabs.Tab value="compose" leftSection={<Icons.FileCode size={16} />}>
            Compose ({loadedTabs.has('compose') ? composeProjects.length : '-'})
          </Tabs.Tab>
        </Tabs.List>

        {/* Containers Tab */}
        <Tabs.Panel value="containers" pt="md">
          <Grid gutter="md">
            {containers.map((container) => (
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={container.id}>
                <Card className="card card-hover">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: container.state.toLowerCase().includes('running')
                              ? 'hsl(var(--success-subtle))'
                              : 'hsl(var(--error-subtle))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: container.state.toLowerCase().includes('running')
                              ? 'hsl(var(--success))'
                              : 'hsl(var(--error))',
                          }}
                        >
                          {container.state.toLowerCase().includes('running') ? (
                            <Icons.Play size={16} />
                          ) : (
                            <Icons.Stop size={16} />
                          )}
                        </Box>
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{container.name}</Text>
                      </Group>
                      <Badge
                        size="sm"
                        variant="light"
                        style={{
                          background: container.state.toLowerCase().includes('running')
                            ? 'hsl(var(--success-subtle))'
                            : 'hsl(var(--error-subtle))',
                          color: container.state.toLowerCase().includes('running')
                            ? 'hsl(var(--success))'
                            : 'hsl(var(--error))',
                          border: `1px solid hsl(var(--${container.state.toLowerCase().includes('running') ? 'success' : 'error'}-border))`,
                        }}
                      >
                        {container.state}
                      </Badge>
                    </Group>

                    <Text size="xs" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
                      {container.image}
                    </Text>

                    <Divider style={{ borderColor: 'hsl(var(--border-subtle))' }} />

                    <SimpleGrid cols={2}>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Icons.Cpu size={14} style={{ color: 'hsl(var(--text-tertiary))' }} />
                          <Text size="xs" c="var(--text-tertiary)">CPU</Text>
                        </Group>
                        <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                          {container.cpu_percent.toFixed(1)}%
                        </Text>
                        <Progress
                          value={container.cpu_percent || 0}
                          h={6}
                          radius="full"
                          color={getMetricColor(container.cpu_percent || 0, 50, 80)}
                          style={{ background: 'hsl(var(--bg-tertiary))' }}
                        />
                      </Stack>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Icons.Activity size={14} style={{ color: 'hsl(var(--text-tertiary))' }} />
                          <Text size="xs" c="var(--text-tertiary)">Memory</Text>
                        </Group>
                        <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                          {formatBytes(container.memory_usage)}
                        </Text>
                        <Progress
                          value={container.memory_limit > 0 ? (container.memory_usage / container.memory_limit) * 100 : 0}
                          h={6}
                          radius="full"
                          color={getMetricColor(container.memory_limit > 0 ? (container.memory_usage / container.memory_limit) * 100 : 0, 60, 80)}
                          style={{ background: 'hsl(var(--bg-tertiary))' }}
                        />
                      </Stack>
                    </SimpleGrid>

                    <Group gap="xs" wrap="wrap">
                      {container.state.toLowerCase().includes('running') ? (
                        <>
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            onClick={() => handleContainerAction('restart', container.name)}
                            style={{
                              background: 'hsl(var(--primary-subtle))',
                              color: 'hsl(var(--primary))',
                              border: '1px solid hsl(var(--primary-border))',
                            }}
                          >
                            Restart
                          </Button>
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            onClick={() => handleContainerAction('stop', container.name)}
                            style={{
                              background: 'hsl(var(--error-subtle))',
                              color: 'hsl(var(--error))',
                              border: '1px solid hsl(var(--error-border))',
                            }}
                          >
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          onClick={() => handleContainerAction('start', container.name)}
                          style={{
                            background: 'hsl(var(--success-subtle))',
                            color: 'hsl(var(--success))',
                            border: '1px solid hsl(var(--success-border))',
                          }}
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        onClick={() => fetchContainerDetails(container.name)}
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          color: 'hsl(var(--text-primary))',
                          border: '1px solid hsl(var(--border-default))',
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="subtle"
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
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          color: 'hsl(var(--text-primary))',
                          border: '1px solid hsl(var(--border-default))',
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
          {containers.length === 0 && (
            <Card className="card card-elevated">
              <Center>
                <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
                  <Box
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-full)',
                      background: 'hsl(var(--bg-tertiary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--text-tertiary))',
                    }}
                  >
                    <Icons.Container size={32} />
                  </Box>
                  <Text size="lg" fw={600} c="var(--text-primary)">No containers found</Text>
                  <Text size="sm" c="var(--text-tertiary)">Start some Docker containers to see them here</Text>
                </Stack>
              </Center>
            </Card>
          )}
        </Tabs.Panel>

        {/* Images Tab */}
        <Tabs.Panel value="images" pt="md">
          {!loadedTabs.has('images') ? (
            <Center h={200}>
              <Loader size="sm" color="hsl(var(--primary))" />
            </Center>
          ) : images.length === 0 ? (
            <Card className="card card-elevated">
              <Center>
                <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
                  <Box
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-full)',
                      background: 'hsl(var(--bg-tertiary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--text-tertiary))',
                    }}
                  >
                    <Icons.Database size={32} />
                  </Box>
                  <Text size="lg" fw={600} c="var(--text-primary)">No images found</Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <Card className="card">
              <ScrollArea.Autosize style={{ maxHeight: 500 }}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Repository</Table.Th>
                      <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Tag</Table.Th>
                      <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Created</Table.Th>
                      <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>ID</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {images.map((img) => (
                      <Table.Tr key={img.id}>
                        <Table.Td style={{ color: 'hsl(var(--text-primary))' }}>{img.repository}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            style={{
                              background: 'hsl(var(--primary-subtle))',
                              color: 'hsl(var(--primary))',
                              border: '1px solid hsl(var(--primary-border))',
                            }}
                          >
                            {img.tag}
                          </Badge>
                        </Table.Td>
                        <Table.Td c="var(--text-tertiary)">{img.created}</Table.Td>
                        <Table.Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-secondary))' }}>{img.id}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Card>
          )}
        </Tabs.Panel>

        {/* Volumes Tab */}
        <Tabs.Panel value="volumes" pt="md">
          {!loadedTabs.has('volumes') ? (
            <Center h={200}>
              <Loader size="sm" color="hsl(var(--primary))" />
            </Center>
          ) : volumes.length === 0 ? (
            <Card className="card card-elevated">
              <Center>
                <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
                  <Box
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-full)',
                      background: 'hsl(var(--bg-tertiary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--text-tertiary))',
                    }}
                  >
                    <Icons.Database size={32} />
                  </Box>
                  <Text size="lg" fw={600} c="var(--text-primary)">No volumes found</Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <Grid gutter="md">
              {volumes.map((vol) => (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={vol.name}>
                  <Card className="card card-hover">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{vol.name}</Text>
                        <Badge
                          variant="light"
                          size="sm"
                          style={{
                            background: 'hsl(var(--primary-subtle))',
                            color: 'hsl(var(--primary))',
                            border: '1px solid hsl(var(--primary-border))',
                          }}
                        >
                          {vol.driver}
                        </Badge>
                      </Group>
                      <Text size="xs" c="var(--text-tertiary)" style={{ wordBreak: 'break-all' }}>
                        {vol.mountpoint}
                      </Text>
                      <Badge
                        size="sm"
                        variant="outline"
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          color: 'hsl(var(--text-secondary))',
                          border: '1px solid hsl(var(--border-default))',
                        }}
                      >
                        {vol.scope}
                      </Badge>
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
            <Center h={200}>
              <Loader size="sm" color="hsl(var(--primary))" />
            </Center>
          ) : networks.length === 0 ? (
            <Card className="card card-elevated">
              <Center>
                <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
                  <Box
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-full)',
                      background: 'hsl(var(--bg-tertiary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--text-tertiary))',
                    }}
                  >
                    <Icons.Network size={32} />
                  </Box>
                  <Text size="lg" fw={600} c="var(--text-primary)">No networks found</Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <Grid gutter="md">
              {networks.map((net) => (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={net.id}>
                  <Card className="card card-hover">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{net.name}</Text>
                        <Badge
                          variant="light"
                          size="sm"
                          style={{
                            background: 'hsl(var(--primary-subtle))',
                            color: 'hsl(var(--primary))',
                            border: '1px solid hsl(var(--primary-border))',
                          }}
                        >
                          {net.driver}
                        </Badge>
                      </Group>
                      <Text size="xs" c="var(--text-tertiary)">ID: {net.id}</Text>
                      <Badge
                        size="sm"
                        variant="outline"
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          color: 'hsl(var(--text-secondary))',
                          border: '1px solid hsl(var(--border-default))',
                        }}
                      >
                        {net.scope}
                      </Badge>
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
            <Center h={200}>
              <Loader size="sm" color="hsl(var(--primary))" />
            </Center>
          ) : (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Docker Compose Projects</Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  leftSection={<Icons.Refresh size={14} />}
                  onClick={refreshComposeFiles}
                  loading={loading}
                  style={{
                    background: 'hsl(var(--bg-tertiary))',
                    color: 'hsl(var(--text-primary))',
                    border: '1px solid hsl(var(--border-default))',
                  }}
                >
                  Refresh Scan
                </Button>
              </Group>
              {composeProjects.length === 0 ? (
                <Alert
                  icon={<Icons.FileCode size={18} />}
                  title="No Compose Files Found"
                  style={{
                    background: 'hsl(var(--info-subtle))',
                    color: 'hsl(var(--text-primary))',
                    border: '1px solid hsl(var(--info-border))',
                  }}
                >
                  <Text size="sm" c="var(--text-secondary)">
                    No docker-compose.yml files found in /home, /opt, or /srv directories.
                  </Text>
                </Alert>
              ) : (
                composeProjects.map((project, idx) => (
                  <Card key={idx} className="card card-hover">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{project.name}</Text>
                        <Badge
                          variant="light"
                          size="sm"
                          style={{
                            background: 'hsl(var(--primary-subtle))',
                            color: 'hsl(var(--primary))',
                            border: '1px solid hsl(var(--primary-border))',
                          }}
                        >
                          {project.services.length} services
                        </Badge>
                      </Group>
                      <Text size="xs" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>{project.path}</Text>
                      <Paper
                        withBorder
                        p="md"
                        radius="md"
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          borderColor: 'hsl(var(--border-subtle))',
                        }}
                      >
                        <Group justify="space-between" mb="xs">
                          <Text size="xs" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>docker-compose.yml</Text>
                          <CopyButton value={project.content}>
                            {({ copy: copyFn }) => (
                              <Button
                                size="compact-xs"
                                variant="subtle"
                                onClick={copyFn}
                                style={{
                                  background: 'hsl(var(--primary-subtle))',
                                  color: 'hsl(var(--primary))',
                                  border: '1px solid hsl(var(--primary-border))',
                                }}
                              >
                                Copy
                              </Button>
                            )}
                          </CopyButton>
                        </Group>
                        <ScrollArea.Autosize mah={300}>
                          <Code
                            block
                            style={{
                              whiteSpace: 'pre-wrap',
                              fontSize: 11,
                              background: 'hsl(var(--bg-primary))',
                              color: 'hsl(var(--text-secondary))',
                              border: '1px solid hsl(var(--border-subtle))',
                            }}
                          >
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
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--primary-subtle))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--primary))',
              }}
            >
              <Icons.Container size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>
              Container: {selectedContainer?.name}
            </Text>
          </Group>
        }
        size="xl"
        centered
        styles={{
          content: {
            backgroundColor: 'hsl(var(--bg-primary))',
            border: '1px solid hsl(var(--border-default))',
          },
          header: {
            borderBottom: '1px solid hsl(var(--border-subtle))',
          },
          body: {
            backgroundColor: 'hsl(var(--bg-primary))',
          },
        }}
      >
        {selectedContainer && (
          <Stack gap="md">
            {/* Quick Info */}
            <SimpleGrid cols={2}>
              <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  borderColor: 'hsl(var(--border-subtle))',
                }}
              >
                <Text size="xs" c="var(--text-tertiary)">Status</Text>
                <Group gap="xs">
                  <Badge
                    size="sm"
                    variant="light"
                    style={{
                      background: selectedContainer.state.toLowerCase().includes('running')
                        ? 'hsl(var(--success-subtle))'
                        : 'hsl(var(--error-subtle))',
                      color: selectedContainer.state.toLowerCase().includes('running')
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--error))',
                      border: `1px solid hsl(var(--${selectedContainer.state.toLowerCase().includes('running') ? 'success' : 'error'}-border))`,
                    }}
                  >
                    {selectedContainer.state}
                  </Badge>
                </Group>
              </Paper>
              <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  borderColor: 'hsl(var(--border-subtle))',
                }}
              >
                <Text size="xs" c="var(--text-tertiary)">Image</Text>
                <Text
                  fw={600}
                  size="sm"
                  style={{
                    color: 'hsl(var(--text-primary))',
                    fontFamily: 'var(--font-mono)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                  title={selectedContainer.image.replace(/@sha256:[a-f0-9]+$/, '').replace(/^[^/]+\//, '')}
                >
                  {selectedContainer.image.replace(/@sha256:[a-f0-9]+$/, '').replace(/^[^/]+\//, '')}
                </Text>
              </Paper>
              <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  borderColor: 'hsl(var(--border-subtle))',
                }}
              >
                <Text size="xs" c="var(--text-tertiary)">Created</Text>
                <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                  {new Date(selectedContainer.created).toLocaleDateString()} {new Date(selectedContainer.created).toLocaleTimeString()}
                </Text>
              </Paper>
              <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  borderColor: 'hsl(var(--border-subtle))',
                }}
              >
                <Text size="xs" c="var(--text-tertiary)">Memory Limit</Text>
                <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                  {selectedContainer.memory_limit || 'Unlimited'}
                </Text>
              </Paper>
            </SimpleGrid>

            <Tabs defaultValue="env">
              <Tabs.List style={{ background: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-subtle))' }}>
                <Tabs.Tab value="env" leftSection={<Icons.Settings size={16} />}>
                  Environment
                </Tabs.Tab>
                <Tabs.Tab value="ports" leftSection={<Icons.Network size={16} />}>
                  Ports
                </Tabs.Tab>
                <Tabs.Tab value="volumes" leftSection={<Icons.Database size={16} />}>
                  Volumes
                </Tabs.Tab>
                <Tabs.Tab value="networks" leftSection={<Icons.World size={16} />}>
                  Networks
                </Tabs.Tab>
                <Tabs.Tab value="labels" leftSection={<Icons.FileText size={16} />}>
                  Labels
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="env" pt="md">
                <Group justify="space-between" mb="sm">
                  <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Environment Variables</Text>
                  <Button
                    size="compact-xs"
                    variant={showSecrets ? 'filled' : 'subtle'}
                    onClick={() => setShowSecrets(!showSecrets)}
                    leftSection={showSecrets ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                    style={{
                      background: showSecrets
                        ? 'hsl(var(--error))'
                        : 'hsl(var(--bg-tertiary))',
                      color: showSecrets
                        ? 'white'
                        : 'hsl(var(--text-primary))',
                      border: showSecrets
                        ? '1px solid hsl(var(--error-border))'
                        : '1px solid hsl(var(--border-default))',
                    }}
                  >
                    {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                  </Button>
                </Group>
                {showSecrets ? (
                  <ScrollArea.Autosize mah={300}>
                    <Stack gap="xs">
                      {selectedContainer.env_vars.map((env, idx) => (
                        <Paper
                          key={idx}
                          withBorder
                          p="xs"
                          radius="md"
                          style={{
                            background: 'hsl(var(--bg-tertiary))',
                            borderColor: 'hsl(var(--border-subtle))',
                          }}
                        >
                          <Code
                            block
                            style={{
                              background: 'hsl(var(--bg-primary))',
                              color: 'hsl(var(--text-secondary))',
                              border: '1px solid hsl(var(--border-subtle))',
                            }}
                          >
                            {env}
                          </Code>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                ) : (
                  <Alert
                    icon={<Icons.Settings size={18} />}
                    title="Hidden Variables"
                    style={{
                      background: 'hsl(var(--info-subtle))',
                      color: 'hsl(var(--text-primary))',
                      border: '1px solid hsl(var(--info-border))',
                    }}
                  >
                    <Text size="sm" c="var(--text-secondary)">
                      Environment variables containing PASSWORD, SECRET, KEY, or TOKEN are hidden.
                      Click "Show Secrets" to reveal.
                    </Text>
                  </Alert>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="ports" pt="md">
                {selectedContainer.ports.length === 0 ? (
                  <Text c="var(--text-tertiary)">No port mappings</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.ports.map((port, idx) => (
                      <Group
                        key={idx}
                        justify="space-between"
                        style={{
                          padding: 'var(--space-3)',
                          background: 'hsl(var(--bg-tertiary))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid hsl(var(--border-subtle))',
                        }}
                      >
                        <Text size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                          <strong style={{ color: 'hsl(var(--primary))' }}>{port.host_ip}:{port.host_port}</strong>{' '}
                          →{' '}
                          <strong style={{ color: 'hsl(var(--success))' }}>{port.container_port}</strong>/{port.protocol}
                        </Text>
                        <CopyButton value={`${port.host_ip}:${port.host_port}`}>
                          {({ copy: copyFn }) => (
                            <ActionIcon
                              variant="subtle"
                              onClick={copyFn}
                              style={{
                                background: 'hsl(var(--bg-tertiary))',
                                color: 'hsl(var(--text-secondary))',
                              }}
                            >
                              <Icons.Copy size={16} />
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
                  <Text c="var(--text-tertiary)">No volume mounts</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.volumes.map((vol, idx) => (
                      <Paper
                        key={idx}
                        withBorder
                        p="xs"
                        radius="md"
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          borderColor: 'hsl(var(--border-subtle))',
                        }}
                      >
                        <Text size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                          <strong style={{ color: 'hsl(var(--primary))' }}>{vol.source}</strong>{' '}
                          →{' '}
                          <strong style={{ color: 'hsl(var(--success))' }}>{vol.destination}</strong>
                        </Text>
                        <Text size="xs" c="var(--text-tertiary)">Mode: {vol.mode}</Text>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="networks" pt="md">
                {selectedContainer.networks.length === 0 ? (
                  <Text c="var(--text-tertiary)">No networks</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.networks.map((net, idx) => (
                      <Badge
                        key={idx}
                        size="lg"
                        variant="light"
                        style={{
                          background: 'hsl(var(--violet-subtle, var(--bg-tertiary)))',
                          color: 'hsl(var(--chart-6))',
                          border: '1px solid hsl(var(--chart-6-border, var(--border-default)))',
                        }}
                      >
                        {net}
                      </Badge>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="labels" pt="md">
                {selectedContainer.labels.length === 0 ? (
                  <Text c="var(--text-tertiary)">No labels</Text>
                ) : (
                  <Stack gap="xs">
                    {selectedContainer.labels.map((label, idx) => (
                      <Group
                        key={idx}
                        justify="space-between"
                        style={{
                          padding: 'var(--space-3)',
                          background: 'hsl(var(--bg-tertiary))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid hsl(var(--border-subtle))',
                        }}
                      >
                        <Text size="sm" c="var(--text-tertiary)">{label.key}</Text>
                        <Code
                          style={{
                            background: 'hsl(var(--bg-primary))',
                            color: 'hsl(var(--text-secondary))',
                            border: '1px solid hsl(var(--border-subtle))',
                          }}
                        >
                          {label.value}
                        </Code>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>
    </div>
  );
});

export default DockerEnhanced;
