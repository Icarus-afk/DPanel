import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper, Text, Group, Title, Button, Stack, Grid, Card, ThemeIcon, Badge, ActionIcon, Modal, Box, Loader, Center, Divider, Tabs, Code, ScrollArea, Textarea,
} from '@mantine/core';
import {
  IconServer, IconRefresh, IconPlayerPlay, IconPlayerStop, IconReload, IconFileCode, IconCheck, IconX, IconTrash, IconWorld, IconLock,
} from '@tabler/icons-react';

interface NginxStatus {
  running: boolean;
  version: string;
  worker_processes: string;
  config_test: string;
}

interface NginxVhost {
  name: string;
  enabled: boolean;
  server_name: string;
  listen_port: string;
  ssl_enabled: boolean;
  root_path: string;
}

export default function NginxManager() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<NginxStatus | null>(null);
  const [vhosts, setVhosts] = useState<NginxVhost[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedVhost, setSelectedVhost] = useState<NginxVhost | null>(null);
  const [vhostConfig, setVhostConfig] = useState('');
  const [mainConfig, setMainConfig] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configType, setConfigType] = useState<'main' | 'vhost'>('main');

  const fetchStatus = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await invoke<NginxStatus>('nginx_status');
      setStatus(data);
    } catch (err: any) {
      // Nginx might not be installed
      console.log('Nginx status error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  const fetchVhosts = useCallback(async () => {
    if (!isConnected) return;
    try {
      const data = await invoke<NginxVhost[]>('get_nginx_vhosts');
      setVhosts(data);
    } catch (err: any) {
      console.log('Vhosts error:', err.message);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      fetchStatus();
      fetchVhosts();
    }
  }, [isConnected, fetchStatus, fetchVhosts]);

  const handleNginxAction = async (action: string) => {
    setLoading(true);
    try {
      await invoke('nginx_action', { action });
      addToast(`Nginx ${action}ed`, 'success');
      fetchStatus();
    } catch (err: any) {
      addToast(`Failed to ${action} nginx: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>('nginx_test_config');
      if (result.includes('syntax is ok')) {
        addToast('Configuration is valid', 'success');
      } else {
        addToast(result, 'warning');
      }
    } catch (err: any) {
      addToast(`Config test failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openMainConfig = async () => {
    setConfigType('main');
    setShowConfigModal(true);
    setLoading(true);
    try {
      const config = await invoke<string>('get_nginx_config');
      setMainConfig(config);
    } catch (err: any) {
      addToast(`Failed to load config: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveMainConfig = async () => {
    setLoading(true);
    try {
      await invoke('save_nginx_config', { content: mainConfig });
      addToast('Main config saved and validated', 'success');
      setShowConfigModal(false);
      fetchStatus();
    } catch (err: any) {
      addToast(`Failed to save config: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openVhostConfig = async (vhost: NginxVhost) => {
    setSelectedVhost(vhost);
    setConfigType('vhost');
    setShowConfigModal(true);
    setLoading(true);
    try {
      const config = await invoke<string>('get_vhost_config', { name: vhost.name });
      setVhostConfig(config);
    } catch (err: any) {
      addToast(`Failed to load vhost config: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveVhostConfig = async () => {
    if (!selectedVhost) return;
    setLoading(true);
    try {
      await invoke('save_vhost_config', { name: selectedVhost.name, content: vhostConfig });
      addToast(`Vhost '${selectedVhost.name}' saved`, 'success');
      setShowConfigModal(false);
      fetchVhosts();
    } catch (err: any) {
      addToast(`Failed to save vhost: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableVhost = async (name: string) => {
    try {
      await invoke('enable_vhost', { name });
      addToast(`Vhost '${name}' enabled`, 'success');
      fetchVhosts();
    } catch (err: any) {
      addToast(`Failed to enable vhost: ${err.message}`, 'error');
    }
  };

  const handleDisableVhost = async (name: string) => {
    try {
      await invoke('disable_vhost', { name });
      addToast(`Vhost '${name}' disabled`, 'success');
      fetchVhosts();
    } catch (err: any) {
      addToast(`Failed to disable vhost: ${err.message}`, 'error');
    }
  };

  const handleDeleteVhost = async (name: string) => {
    if (!confirm(`Delete vhost '${name}'? This will remove both the config and symlink.`)) {
      return;
    }
    try {
      await invoke('delete_vhost', { name });
      addToast(`Vhost '${name}' deleted`, 'success');
      fetchVhosts();
    } catch (err: any) {
      addToast(`Failed to delete vhost: ${err.message}`, 'error');
    }
  };

  const viewLogs = async (type: string) => {
    try {
      const logs = await invoke<string>('get_nginx_logs', { logType: type, lines: 200 });
      addToast(`Loaded ${type} logs`, 'success');
      // Could open in a modal or redirect to log viewer
      console.log(logs);
    } catch (err: any) {
      addToast(`Failed to load logs: ${err.message}`, 'error');
    }
  };

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconServer size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to a server to manage Nginx</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md" h="calc(100vh - 140px)">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconServer size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Nginx Manager</Title>
            <Text size="xs" c="dimmed">Manage web server and virtual hosts</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="outline"
            color="blue"
            leftSection={<IconRefresh size={18} />}
            onClick={() => { fetchStatus(); fetchVhosts(); }}
            loading={loading}
            size="sm"
          >
            Refresh
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="vhosts">Virtual Hosts ({vhosts.length})</Tabs.Tab>
          <Tabs.Tab value="logs">Logs</Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">Status</Text>
                    <Text size="xl" fw={700} c={status?.running ? 'green' : 'red'}>
                      {status?.running ? 'Running' : 'Stopped'}
                    </Text>
                  </Stack>
                  <ThemeIcon variant="light" color={status?.running ? 'green' : 'red'} size="lg">
                    {status?.running ? <IconCheck size={20} /> : <IconX size={20} />}
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">Version</Text>
                    <Text size="xl" fw={700}>{status?.version || 'N/A'}</Text>
                  </Stack>
                  <ThemeIcon variant="light" color="blue" size="lg">
                    <IconServer size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">Workers</Text>
                    <Text size="xl" fw={700}>{status?.worker_processes || 'auto'}</Text>
                  </Stack>
                  <ThemeIcon variant="light" color="violet" size="lg">
                    <IconServer size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">Virtual Hosts</Text>
                    <Text size="xl" fw={700}>{vhosts.length}</Text>
                  </Stack>
                  <ThemeIcon variant="light" color="cyan" size="lg">
                    <IconWorld size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          <Card withBorder radius="md" bg="var(--mantine-color-dark-6)" mt="md">
            <Text fw={600} mb="md">Quick Actions</Text>
            <Group gap="xs">
              {status?.running ? (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconPlayerStop size={18} />}
                  onClick={() => handleNginxAction('stop')}
                  loading={loading}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  color="green"
                  variant="light"
                  leftSection={<IconPlayerPlay size={18} />}
                  onClick={() => handleNginxAction('start')}
                  loading={loading}
                >
                  Start
                </Button>
              )}
              <Button
                color="blue"
                variant="light"
                leftSection={<IconReload size={18} />}
                onClick={() => handleNginxAction('restart')}
                loading={loading}
              >
                Restart
              </Button>
              <Button
                color="cyan"
                variant="light"
                leftSection={<IconReload size={18} />}
                onClick={() => handleNginxAction('reload')}
                loading={loading}
              >
                Reload
              </Button>
              <Divider orientation="vertical" />
              <Button
                color="green"
                variant="light"
                leftSection={<IconCheck size={18} />}
                onClick={handleTestConfig}
                loading={loading}
              >
                Test Config
              </Button>
              <Button
                color="gray"
                variant="light"
                leftSection={<IconFileCode size={18} />}
                onClick={openMainConfig}
              >
                Edit Main Config
              </Button>
            </Group>

            {status && !status.config_test.includes('syntax is ok') && (
              <Box mt="md" p="md" bg="var(--mantine-color-red-filled)" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                <Text size="sm" c="white" fw={600}>Config Test Failed:</Text>
                <Code block c="white" mt="xs">{status.config_test}</Code>
              </Box>
            )}
          </Card>
        </Tabs.Panel>

        {/* Virtual Hosts Tab */}
        <Tabs.Panel value="vhosts" pt="md">
          {vhosts.length === 0 ? (
            <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
              <Center>
                <Stack align="center" gap="md">
                  <ThemeIcon size="lg" variant="light" color="gray">
                    <IconWorld size={24} />
                  </ThemeIcon>
                  <Text c="dimmed">No virtual hosts found</Text>
                </Stack>
              </Center>
            </Paper>
          ) : (
            <Grid gutter="md">
              {vhosts.map((vhost) => (
                <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={vhost.name}>
                  <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600}>{vhost.name}</Text>
                      <Badge color={vhost.enabled ? 'green' : 'gray'} variant="light">
                        {vhost.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Group>

                    <Stack gap="xs" size="xs">
                      <Group gap="xs">
                        <Text c="dimmed">Server Name:</Text>
                        <Text size="sm">{vhost.server_name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text c="dimmed">Listen:</Text>
                        <Text size="sm">{vhost.listen_port}</Text>
                      </Group>
                      {vhost.ssl_enabled && (
                        <Group gap="xs">
                          <IconLock size={14} color="green" />
                          <Text size="sm" c="green">SSL Enabled</Text>
                        </Group>
                      )}
                      {vhost.root_path && (
                        <Group gap="xs">
                          <Text c="dimmed">Root:</Text>
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>{vhost.root_path}</Text>
                        </Group>
                      )}
                    </Stack>

                    <Divider my="sm" />

                    <Group justify="space-between">
                      <Group gap="xs">
                        {vhost.enabled ? (
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={() => handleDisableVhost(vhost.name)}
                            title="Disable"
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        ) : (
                          <ActionIcon
                            color="green"
                            variant="light"
                            size="sm"
                            onClick={() => handleEnableVhost(vhost.name)}
                            title="Enable"
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          color="blue"
                          variant="light"
                          size="sm"
                          onClick={() => openVhostConfig(vhost)}
                          title="Edit Config"
                        >
                          <IconFileCode size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="sm"
                          onClick={() => handleDeleteVhost(vhost.name)}
                          title="Delete"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Tabs.Panel>

        {/* Logs Tab */}
        <Tabs.Panel value="logs" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text fw={600}>Error Log</Text>
                    <Text size="xs" c="dimmed">/var/log/nginx/error.log</Text>
                  </Stack>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => viewLogs('error')}
                  >
                    View
                  </Button>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text fw={600}>Access Log</Text>
                    <Text size="xs" c="dimmed">/var/log/nginx/access.log</Text>
                  </Stack>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => viewLogs('access')}
                  >
                    View
                  </Button>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Config Editor Modal */}
      <Modal
        opened={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={
          <Group gap="sm">
            <IconFileCode size={20} />
            <Text fw={600}>
              {configType === 'main' ? 'Main Nginx Config' : `Vhost: ${selectedVhost?.name}`}
            </Text>
          </Group>
        }
        size="xl"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {configType === 'main'
              ? 'Editing /etc/nginx/nginx.conf'
              : `Editing /etc/nginx/sites-available/${selectedVhost?.name}`}
          </Text>
          <Textarea
            value={configType === 'main' ? mainConfig : vhostConfig}
            onChange={(e) => configType === 'main' ? setMainConfig(e.target.value) : setVhostConfig(e.target.value)}
            autosize
            minRows={20}
            maxRows={30}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button
              color="green"
              onClick={configType === 'main' ? saveMainConfig : saveVhostConfig}
              loading={loading}
            >
              Save & Validate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
