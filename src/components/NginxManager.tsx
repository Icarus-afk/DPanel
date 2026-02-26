import { useState, useEffect, useCallback, memo } from 'react';
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

const NginxManager = memo(function NginxManager() {
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
      console.log(logs);
    } catch (err: any) {
      addToast(`Failed to load logs: ${err.message}`, 'error');
    }
  };

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
              <IconServer size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Nginx Manager</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage Nginx
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
            <IconServer size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Nginx Manager
            </Title>
            <Text size="xs" c="var(--text-tertiary)">Manage web server and virtual hosts</Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={() => { fetchStatus(); fetchVhosts(); }}
          loading={loading}
          leftSection={<IconRefresh size={16} />}
          style={{
            background: 'hsl(var(--bg-tertiary))',
            color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-default))',
          }}
        >
          Refresh
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'overview')} variant="pills">
        <Tabs.List style={{ marginBottom: 'var(--space-4)' }}>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="vhosts">Virtual Hosts ({vhosts.length})</Tabs.Tab>
          <Tabs.Tab value="logs">Logs</Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          {/* Status Cards */}
          <Grid gutter="md" style={{ marginBottom: 'var(--space-4)' }}>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm" c="var(--text-tertiary)" fw={500}>Status</Text>
                    <Group gap="xs" mt="xs">
                      <Text size="2xl" fw={700} style={{ color: status?.running ? 'hsl(var(--success))' : 'hsl(var(--error))' }}>
                        {status?.running ? 'Running' : 'Stopped'}
                      </Text>
                    </Group>
                  </Stack>
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: status?.running ? 'hsl(var(--success-subtle))' : 'hsl(var(--error-subtle))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: status?.running ? 'hsl(var(--success))' : 'hsl(var(--error))',
                    }}
                  >
                    {status?.running ? <IconCheck size={20} /> : <IconX size={20} />}
                  </Box>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm" c="var(--text-tertiary)" fw={500}>Version</Text>
                    <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{status?.version || 'N/A'}</Text>
                  </Stack>
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: 'hsl(var(--primary-subtle))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    <IconServer size={20} />
                  </Box>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm" c="var(--text-tertiary)" fw={500}>Workers</Text>
                    <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{status?.worker_processes || 'auto'}</Text>
                  </Stack>
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: 'hsl(var(--violet-subtle, var(--bg-tertiary)))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--chart-6))',
                    }}
                  >
                    <IconServer size={20} />
                  </Box>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm" c="var(--text-tertiary)" fw={500}>Virtual Hosts</Text>
                    <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{vhosts.length}</Text>
                  </Stack>
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: 'hsl(var(--info-subtle))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--info))',
                    }}
                  >
                    <IconWorld size={20} />
                  </Box>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Quick Actions */}
          <Card className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))', marginBottom: 'var(--space-4)' }}>Quick Actions</Text>
            <Group gap="xs" wrap="wrap">
              {status?.running ? (
                <Button
                  style={{
                    background: 'hsl(var(--error-subtle))',
                    color: 'hsl(var(--error))',
                    border: '1px solid hsl(var(--error-border))',
                  }}
                  variant="subtle"
                  size="sm"
                  leftSection={<IconPlayerStop size={18} />}
                  onClick={() => handleNginxAction('stop')}
                  loading={loading}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  style={{
                    background: 'hsl(var(--success-subtle))',
                    color: 'hsl(var(--success))',
                    border: '1px solid hsl(var(--success-border))',
                  }}
                  variant="subtle"
                  size="sm"
                  leftSection={<IconPlayerPlay size={18} />}
                  onClick={() => handleNginxAction('start')}
                  loading={loading}
                >
                  Start
                </Button>
              )}
              <Button
                style={{
                  background: 'hsl(var(--primary-subtle))',
                  color: 'hsl(var(--primary))',
                  border: '1px solid hsl(var(--primary-border))',
                }}
                variant="subtle"
                size="sm"
                leftSection={<IconReload size={18} />}
                onClick={() => handleNginxAction('restart')}
                loading={loading}
              >
                Restart
              </Button>
              <Button
                style={{
                  background: 'hsl(var(--info-subtle))',
                  color: 'hsl(var(--info))',
                  border: '1px solid hsl(var(--info-border))',
                }}
                variant="subtle"
                size="sm"
                leftSection={<IconReload size={18} />}
                onClick={() => handleNginxAction('reload')}
                loading={loading}
              >
                Reload
              </Button>
              <Divider orientation="vertical" style={{ borderColor: 'hsl(var(--border-subtle))', height: 24 }} />
              <Button
                style={{
                  background: 'hsl(var(--success-subtle))',
                  color: 'hsl(var(--success))',
                  border: '1px solid hsl(var(--success-border))',
                }}
                variant="subtle"
                size="sm"
                leftSection={<IconCheck size={18} />}
                onClick={handleTestConfig}
                loading={loading}
              >
                Test Config
              </Button>
              <Button
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-default))',
                }}
                variant="subtle"
                size="sm"
                leftSection={<IconFileCode size={18} />}
                onClick={openMainConfig}
              >
                Edit Main Config
              </Button>
            </Group>

            {status && !status.config_test.includes('syntax is ok') && (
              <Box
                mt="md"
                p="md"
                style={{
                  background: 'hsl(var(--error-subtle))',
                  border: '1px solid hsl(var(--error-border))',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Text size="sm" fw={600} style={{ color: 'hsl(var(--error))', marginBottom: 'var(--space-2)' }}>Config Test Failed:</Text>
                <Code
                  block
                  style={{
                    background: 'hsl(var(--bg-primary))',
                    color: 'hsl(var(--text-primary))',
                    border: '1px solid hsl(var(--border-subtle))',
                  }}
                >
                  {status.config_test}
                </Code>
              </Box>
            )}
          </Card>
        </Tabs.Panel>

        {/* Virtual Hosts Tab */}
        <Tabs.Panel value="vhosts" pt="md">
          {vhosts.length === 0 ? (
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
                    <IconWorld size={32} />
                  </Box>
                  <Text size="lg" fw={600} c="var(--text-primary)">No virtual hosts found</Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <Grid gutter="md">
              {vhosts.map((vhost) => (
                <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={vhost.name}>
                  <Card className="card card-hover">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{vhost.name}</Text>
                      <Badge
                        size="sm"
                        variant="light"
                        style={{
                          background: vhost.enabled ? 'hsl(var(--success-subtle))' : 'hsl(var(--bg-tertiary))',
                          color: vhost.enabled ? 'hsl(var(--success))' : 'hsl(var(--text-tertiary))',
                          border: `1px solid hsl(var(--${vhost.enabled ? 'success' : 'border-default'}-border))`,
                        }}
                      >
                        {vhost.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Group>

                    <Stack gap="xs" size="xs">
                      <Group gap="xs">
                        <Text c="var(--text-tertiary)" size="xs">Server Name:</Text>
                        <Text size="sm" style={{ color: 'hsl(var(--text-primary))' }}>{vhost.server_name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text c="var(--text-tertiary)" size="xs">Listen:</Text>
                        <Text size="sm" style={{ color: 'hsl(var(--text-primary))' }}>{vhost.listen_port}</Text>
                      </Group>
                      {vhost.ssl_enabled && (
                        <Group gap="xs">
                          <IconLock size={14} style={{ color: 'hsl(var(--success))' }} />
                          <Text size="sm" style={{ color: 'hsl(var(--success))' }}>SSL Enabled</Text>
                        </Group>
                      )}
                      {vhost.root_path && (
                        <Group gap="xs">
                          <Text c="var(--text-tertiary)" size="xs">Root:</Text>
                          <Text size="sm" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-primary))' }}>{vhost.root_path}</Text>
                        </Group>
                      )}
                    </Stack>

                    <Divider my="sm" style={{ borderColor: 'hsl(var(--border-subtle))' }} />

                    <Group justify="space-between">
                      <Group gap="xs">
                        {vhost.enabled ? (
                          <ActionIcon
                            style={{
                              background: 'hsl(var(--error-subtle))',
                              color: 'hsl(var(--error))',
                            }}
                            size="sm"
                            onClick={() => handleDisableVhost(vhost.name)}
                            title="Disable"
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        ) : (
                          <ActionIcon
                            style={{
                              background: 'hsl(var(--success-subtle))',
                              color: 'hsl(var(--success))',
                            }}
                            size="sm"
                            onClick={() => handleEnableVhost(vhost.name)}
                            title="Enable"
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          style={{
                            background: 'hsl(var(--primary-subtle))',
                            color: 'hsl(var(--primary))',
                          }}
                          size="sm"
                          onClick={() => openVhostConfig(vhost)}
                          title="Edit Config"
                        >
                          <IconFileCode size={16} />
                        </ActionIcon>
                        <ActionIcon
                          style={{
                            background: 'hsl(var(--error-subtle))',
                            color: 'hsl(var(--error))',
                          }}
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
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Error Log</Text>
                    <Text size="xs" c="var(--text-tertiary)">/var/log/nginx/error.log</Text>
                  </Stack>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => viewLogs('error')}
                    style={{
                      background: 'hsl(var(--primary-subtle))',
                      color: 'hsl(var(--primary))',
                      border: '1px solid hsl(var(--primary-border))',
                    }}
                  >
                    View
                  </Button>
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card className="card card-hover">
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Access Log</Text>
                    <Text size="xs" c="var(--text-tertiary)">/var/log/nginx/access.log</Text>
                  </Stack>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => viewLogs('access')}
                    style={{
                      background: 'hsl(var(--primary-subtle))',
                      color: 'hsl(var(--primary))',
                      border: '1px solid hsl(var(--primary-border))',
                    }}
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
              <IconFileCode size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>
              {configType === 'main' ? 'Main Nginx Config' : `Vhost: ${selectedVhost?.name}`}
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
        <Stack gap="md">
          <Text size="sm" c="var(--text-tertiary)">
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
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-subtle))',
              color: 'hsl(var(--text-primary))',
            }}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => setShowConfigModal(false)}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              Cancel
            </Button>
            <Button
              style={{
                background: 'hsl(var(--success))',
                color: 'white',
              }}
              onClick={configType === 'main' ? saveMainConfig : saveVhostConfig}
              loading={loading}
            >
              Save & Validate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
});

export default NginxManager;
