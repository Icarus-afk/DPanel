import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { UfwOverview, PortInfo } from '../types';
import {
  Paper,
  Text,
  Title,
  Group,
  Stack,
  Button,
  Badge,
  ThemeIcon,
  Switch,
  Modal,
  TextInput,
  Select,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Card,
  SimpleGrid,
  Alert,
  Divider,
  Center,
  Tabs,
  Grid,
} from '@mantine/core';
import {
  IconShield,
  IconShieldCheck,
  IconShieldOff,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconSettings,
  IconLock,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconFlame,
  IconServer,
  IconDoorEnter,
  IconDoorOff,
  IconLockOpen,
  IconEye,
  IconList,
} from '@tabler/icons-react';

const COMMON_PORTS: Record<string, { name: string; default: string }> = {
  '20': { name: 'FTP Data', default: 'tcp' },
  '21': { name: 'FTP', default: 'tcp' },
  '22': { name: 'SSH', default: 'tcp' },
  '25': { name: 'SMTP', default: 'tcp' },
  '53': { name: 'DNS', default: 'tcp' },
  '80': { name: 'HTTP', default: 'tcp' },
  '110': { name: 'POP3', default: 'tcp' },
  '143': { name: 'IMAP', default: 'tcp' },
  '443': { name: 'HTTPS', default: 'tcp' },
  '465': { name: 'SMTPS', default: 'tcp' },
  '587': { name: 'Submission', default: 'tcp' },
  '993': { name: 'IMAPS', default: 'tcp' },
  '995': { name: 'POP3S', default: 'tcp' },
  '3306': { name: 'MySQL', default: 'tcp' },
  '3389': { name: 'RDP', default: 'tcp' },
  '5432': { name: 'PostgreSQL', default: 'tcp' },
  '6379': { name: 'Redis', default: 'tcp' },
  '8080': { name: 'HTTP Alt', default: 'tcp' },
  '8443': { name: 'HTTPS Alt', default: 'tcp' },
  '27017': { name: 'MongoDB', default: 'tcp' },
};

export default function FirewallManager() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<UfwOverview | null>(null);
  const [listeningPorts, setListeningPorts] = useState<PortInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [newRule, setNewRule] = useState({
    action: 'allow',
    port: '',
    protocol: 'tcp',
    fromIp: 'any',
  });

  const [settings, setSettings] = useState({
    defaultIncoming: 'deny',
    defaultOutgoing: 'allow',
    logging: 'low',
  });

  const fetchUfwData = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [overviewData, listeningData] = await Promise.all([
        invoke<UfwOverview>('get_ufw_overview'),
        invoke<PortInfo[]>('get_listening_ports'),
      ]);
      setOverview(overviewData);
      setListeningPorts(listeningData);
    } catch (error: any) {
      addToast(`Failed to load firewall data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchUfwData();
    }
  }, [isConnected]);

  const handleToggleFirewall = async (enable: boolean) => {
    try {
      await invoke('ufw_action', { action: enable ? 'enable' : 'disable' });
      addToast(`Firewall ${enable ? 'enabled' : 'disabled'}`, 'success');
      fetchUfwData();
    } catch (error: any) {
      addToast(`Failed: ${error.message}`, 'error');
    }
  };

  const handleAddRule = async () => {
    try {
      await invoke('ufw_add_rule', {
        ruleType: newRule.action,
        port: newRule.port || undefined,
        fromIp: newRule.fromIp === 'any' ? undefined : newRule.fromIp,
        protocol: newRule.protocol === 'tcp' ? undefined : newRule.protocol,
      });
      addToast('Rule added successfully', 'success');
      setShowAddRuleModal(false);
      setNewRule({ action: 'allow', port: '', protocol: 'tcp', fromIp: 'any' });
      fetchUfwData();
    } catch (error: any) {
      addToast(`Failed: ${error.message}`, 'error');
    }
  };

  const handleDeleteRule = async (ruleNumber: number) => {
    try {
      await invoke('ufw_delete_rule', { ruleNumber });
      addToast('Rule deleted', 'success');
      setDeleteConfirm(null);
      fetchUfwData();
    } catch (error: any) {
      addToast(`Failed: ${error.message}`, 'error');
    }
  };

  const handleSetDefault = async (direction: string, policy: string) => {
    try {
      await invoke('ufw_set_default', { direction, policy });
      addToast('Default policy updated', 'success');
      fetchUfwData();
    } catch (error: any) {
      addToast(`Failed: ${error.message}`, 'error');
    }
  };

  const handleSetLogging = async (level: string) => {
    try {
      await invoke('ufw_set_logging', { level });
      addToast('Logging level updated', 'success');
      fetchUfwData();
    } catch (error: any) {
      addToast(`Failed: ${error.message}`, 'error');
    }
  };

  const getServiceName = (port: string) => {
    return COMMON_PORTS[port]?.name || null;
  };

  const getQuickPorts = () => {
    return Object.entries(COMMON_PORTS).map(([port, info]) => ({
      port,
      ...info,
    }));
  };

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Center>
          <Stack align="center" gap="md">
            <ThemeIcon size="lg" variant="light" color="gray">
              <IconShield size={24} />
            </ThemeIcon>
            <Text c="dimmed">Connect to manage firewall</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconShield size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Firewall Manager</Title>
            <Text size="xs" c="dimmed">UFW - Complete Port Management</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Tooltip label="Reload">
            <ActionIcon variant="subtle" color="blue" onClick={fetchUfwData} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Settings">
            <ActionIcon variant="subtle" color="gray" onClick={() => setShowSettingsModal(true)}>
              <IconSettings size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {overview && (
        <>
          {/* Status Card */}
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
            <Group justify="space-between">
              <Group gap="md">
                <ThemeIcon
                  size="xl"
                  variant="gradient"
                  gradient={{ from: overview.active ? 'green' : 'red', to: overview.active ? 'teal' : 'orange' }}
                >
                  {overview.active ? <IconShieldCheck size={28} /> : <IconShieldOff size={28} />}
                </ThemeIcon>
                <Stack gap={0}>
                  <Text fw={700} size="lg">
                    Firewall is {overview.active ? 'Active' : 'Inactive'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {overview.open_ports.length} ports open · {overview.blocked_ports.length} ports blocked
                  </Text>
                </Stack>
              </Group>
              <Switch
                size="lg"
                checked={overview.active}
                onChange={(e) => handleToggleFirewall(e.currentTarget.checked)}
                onLabel={<IconCheck size={16} />}
                offLabel={<IconX size={16} />}
                color={overview.active ? 'green' : 'red'}
              />
            </Group>
          </Paper>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'overview')} variant="pills">
            <Tabs.List grow>
              <Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>
                Port Overview
              </Tabs.Tab>
              <Tabs.Tab value="open" leftSection={<IconDoorEnter size={16} />}>
                Open Ports ({overview.open_ports.length})
              </Tabs.Tab>
              <Tabs.Tab value="blocked" leftSection={<IconDoorOff size={16} />}>
                Blocked ({overview.blocked_ports.length})
              </Tabs.Tab>
              <Tabs.Tab value="listening" leftSection={<IconServer size={16} />}>
                Listening ({listeningPorts.length})
              </Tabs.Tab>
              <Tabs.Tab value="rules" leftSection={<IconList size={16} />}>
                All Rules ({overview.all_rules.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* Overview Tab */}
            <Tabs.Panel value="overview" pt="md">
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, lg: 8 }}>
                  <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon variant="light" color="green" size="md">
                          <IconDoorEnter size={18} />
                        </ThemeIcon>
                        <Text fw={600}>Open Ports</Text>
                      </Group>
                      <Badge variant="light" color="green">{overview.open_ports.length} allowed</Badge>
                    </Group>
                    {overview.open_ports.length === 0 ? (
                      <Text c="dimmed" size="sm">No ports are currently allowed through the firewall</Text>
                    ) : (
                      <SimpleGrid cols={{ base: 2, sm: 3 }}>
                        {overview.open_ports.map((port, idx) => (
                          <Card key={idx} withBorder p="sm" radius="md" bg="var(--mantine-color-dark-7)">
                            <Group justify="space-between">
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Text fw={700} size="lg">{port.port}</Text>
                                  <Text size="xs" c="dimmed">/{port.protocol}</Text>
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {getServiceName(port.port) || port.service_name || 'Custom'}
                                </Text>
                              </Stack>
                              <ThemeIcon variant="light" color="green" size="sm">
                                <IconCheck size={14} />
                              </ThemeIcon>
                            </Group>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, lg: 4 }}>
                  <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon variant="light" color="red" size="md">
                          <IconDoorOff size={18} />
                        </ThemeIcon>
                        <Text fw={600}>Blocked Ports</Text>
                      </Group>
                      <Badge variant="light" color="red">{overview.blocked_ports.length} denied</Badge>
                    </Group>
                    {overview.blocked_ports.length === 0 ? (
                      <Text c="dimmed" size="sm">No explicit deny rules</Text>
                    ) : (
                      <Stack gap="xs">
                        {overview.blocked_ports.map((port, idx) => (
                          <Group key={idx} justify="space-between">
                            <Group gap="xs">
                              <Text fw={600}>{port.port}</Text>
                              <Text size="xs" c="dimmed">/{port.protocol}</Text>
                            </Group>
                            <ThemeIcon variant="light" color="red" size="sm">
                              <IconX size={14} />
                            </ThemeIcon>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Paper>

                  <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)" mt="md">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon variant="light" color="blue" size="md">
                          <IconServer size={18} />
                        </ThemeIcon>
                        <Text fw={600}>Listening</Text>
                      </Group>
                      <Badge variant="light" color="blue">{listeningPorts.length} ports</Badge>
                    </Group>
                    {listeningPorts.length === 0 ? (
                      <Text c="dimmed" size="sm">No listening ports detected</Text>
                    ) : (
                      <ScrollArea.Autosize mah={200}>
                        <Stack gap="xs">
                          {listeningPorts.map((port, idx) => (
                            <Group key={idx} justify="space-between">
                              <Group gap="xs">
                                <Text fw={600}>{port.port}</Text>
                                <Text size="xs" c="dimmed">- {port.service_name || 'Unknown'}</Text>
                              </Group>
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea.Autosize>
                    )}
                  </Paper>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            {/* Open Ports Tab */}
            <Tabs.Panel value="open" pt="md">
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="green" size="md">
                      <IconDoorEnter size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Open Ports (Allowed Through Firewall)</Text>
                  </Group>
                  <Button size="sm" variant="filled" color="green" leftSection={<IconPlus size={16} />} onClick={() => setShowAddRuleModal(true)}>
                    Add Port
                  </Button>
                </Group>
                {overview.open_ports.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
                      <ThemeIcon size="xl" variant="light" color="gray">
                        <IconDoorOff size={32} />
                      </ThemeIcon>
                      <Text c="dimmed">No ports are allowed through the firewall</Text>
                      <Button size="sm" variant="filled" color="green" onClick={() => setShowAddRuleModal(true)}>
                        Allow First Port
                      </Button>
                    </Stack>
                  </Center>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {overview.open_ports.map((port, idx) => (
                      <Card key={idx} withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={700} size="xl">{port.port}</Text>
                            <Text size="sm" c="dimmed">/{port.protocol}</Text>
                          </Group>
                          <ThemeIcon variant="light" color="green" size="md">
                            <IconLockOpen size={18} />
                          </ThemeIcon>
                        </Group>
                        <Text size="sm" fw={500} mb="xs">
                          {getServiceName(port.port) || port.service_name || 'Custom Service'}
                        </Text>
                        <Divider mb="xs" />
                        <Text size="xs" c="dimmed">Source: {port.source}</Text>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Paper>
            </Tabs.Panel>

            {/* Blocked Ports Tab */}
            <Tabs.Panel value="blocked" pt="md">
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="red" size="md">
                      <IconDoorOff size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Blocked Ports (Denied by Firewall)</Text>
                  </Group>
                </Group>
                {overview.blocked_ports.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
                      <ThemeIcon size="xl" variant="light" color="green">
                        <IconCheck size={32} />
                      </ThemeIcon>
                      <Text c="dimmed">No explicit deny rules configured</Text>
                      <Text size="sm" c="dimmed">Default policy: {overview.stats.deny_rules === 0 ? 'Likely DENY' : 'Mixed'}</Text>
                    </Stack>
                  </Center>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {overview.blocked_ports.map((port, idx) => (
                      <Card key={idx} withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={700} size="xl">{port.port}</Text>
                            <Text size="sm" c="dimmed">/{port.protocol}</Text>
                          </Group>
                          <ThemeIcon variant="light" color="red" size="md">
                            <IconLock size={18} />
                          </ThemeIcon>
                        </Group>
                        <Text size="sm" fw={500} mb="xs">
                          {getServiceName(port.port) || port.service_name || 'Custom Service'}
                        </Text>
                        <Divider mb="xs" />
                        <Text size="xs" c="dimmed">Source: {port.source}</Text>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Paper>
            </Tabs.Panel>

            {/* Listening Ports Tab */}
            <Tabs.Panel value="listening" pt="md">
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="blue" size="md">
                      <IconServer size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Listening Ports (Services Running on Server)</Text>
                  </Group>
                  <Badge variant="light" color="blue">{listeningPorts.length} services</Badge>
                </Group>
                {listeningPorts.length === 0 ? (
                  <Center p="xl">
                    <Text c="dimmed">No listening TCP ports detected</Text>
                  </Center>
                ) : (
                  <Stack gap="xs">
                    {listeningPorts.map((port, idx) => {
                      const isOpenInFirewall = overview.open_ports.some(p => p.port === port.port);
                      return (
                        <Card key={idx} withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
                          <Group justify="space-between">
                            <Group gap="md">
                              <ThemeIcon
                                variant="light"
                                color={isOpenInFirewall ? 'green' : 'orange'}
                                size="md"
                              >
                                {isOpenInFirewall ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                              </ThemeIcon>
                              <Stack gap={0}>
                                <Group gap="xs">
                                  <Text fw={700} size="lg">{port.port}</Text>
                                  <Text size="sm" c="dimmed">/{port.protocol}</Text>
                                  {isOpenInFirewall ? (
                                    <Badge size="sm" variant="light" color="green">Open in firewall</Badge>
                                  ) : (
                                    <Badge size="sm" variant="light" color="orange">Blocked by firewall</Badge>
                                  )}
                                </Group>
                                <Text size="sm" c="dimmed">{port.service_name || 'Unknown service'}</Text>
                              </Stack>
                            </Group>
                            {!isOpenInFirewall && (
                              <Button
                                size="compact-sm"
                                variant="light"
                                color="green"
                                onClick={async () => {
                                  try {
                                    await invoke('ufw_add_rule', {
                                      ruleType: 'allow',
                                      port: port.port,
                                      protocol: 'tcp',
                                    });
                                    addToast(`Port ${port.port} opened`, 'success');
                                    fetchUfwData();
                                  } catch (error: any) {
                                    addToast(`Failed: ${error.message}`, 'error');
                                  }
                                }}
                              >
                                Allow
                              </Button>
                            )}
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Tabs.Panel>

            {/* All Rules Tab */}
            <Tabs.Panel value="rules" pt="md">
              <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="blue" size="md">
                      <IconList size={18} />
                    </ThemeIcon>
                    <Text fw={600}>All Firewall Rules</Text>
                  </Group>
                  <Badge variant="light">{overview.all_rules.length} rules</Badge>
                </Group>
                {overview.all_rules.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
                      <ThemeIcon size="xl" variant="light" color="gray">
                        <IconShieldOff size={32} />
                      </ThemeIcon>
                      <Text c="dimmed">No firewall rules configured</Text>
                    </Stack>
                  </Center>
                ) : (
                  <ScrollArea.Autosize mah={400}>
                    <Stack gap="xs">
                      {overview.all_rules.map((rule, idx) => (
                        <Card key={idx} withBorder p="sm" radius="md" bg="var(--mantine-color-dark-7)">
                          <Group justify="space-between">
                            <Group gap="md">
                              <ThemeIcon
                                variant="light"
                                color={rule.action.toUpperCase().includes('ALLOW') ? 'green' : rule.action.toUpperCase().includes('DENY') ? 'red' : 'yellow'}
                                size="md"
                              >
                                {rule.action.toUpperCase().includes('ALLOW') ? <IconCheck size={16} /> : rule.action.toUpperCase().includes('DENY') ? <IconX size={16} /> : <IconAlertTriangle size={16} />}
                              </ThemeIcon>
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Badge
                                    variant="filled"
                                    color={rule.action.toUpperCase().includes('ALLOW') ? 'green' : rule.action.toUpperCase().includes('DENY') ? 'red' : 'yellow'}
                                    size="sm"
                                  >
                                    {rule.action.toUpperCase()}
                                  </Badge>
                                  {rule.port && (
                                    <Text size="sm" fw={600}>Port {rule.port}</Text>
                                  )}
                                </Group>
                                <Text size="xs" c="dimmed">From: {rule.from}</Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => setDeleteConfirm(idx + 1)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Paper>
            </Tabs.Panel>
          </Tabs>

          {/* Quick Add Ports */}
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <ThemeIcon variant="light" color="violet" size="md">
                  <IconFlame size={18} />
                </ThemeIcon>
                <Text fw={600}>Quick Add Common Ports</Text>
              </Group>
            </Group>
            <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }}>
              {getQuickPorts().map(({ port, name, default: proto }) => {
                const isAlreadyOpen = overview.open_ports.some(p => p.port === port);
                return (
                  <Button
                    key={port}
                    variant={isAlreadyOpen ? 'light' : 'outline'}
                    color={isAlreadyOpen ? 'green' : 'gray'}
                    size="sm"
                    disabled={isAlreadyOpen}
                    onClick={async () => {
                      try {
                        await invoke('ufw_add_rule', {
                          ruleType: 'allow',
                          port,
                          protocol: proto,
                        });
                        addToast(`Port ${port} (${name}) opened`, 'success');
                        fetchUfwData();
                      } catch (error: any) {
                        addToast(`Failed: ${error.message}`, 'error');
                      }
                    }}
                  >
                    {port} {name}
                  </Button>
                );
              })}
            </SimpleGrid>
          </Paper>
        </>
      )}

      {/* Add Rule Modal */}
      <Modal opened={showAddRuleModal} onClose={() => setShowAddRuleModal(false)} title="Allow Port" size="md">
        <Stack gap="md">
          <TextInput
            label="Port"
            placeholder="e.g., 80, 443, 22"
            value={newRule.port}
            onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
          />
          <Select
            label="Protocol"
            value={newRule.protocol}
            onChange={(v) => setNewRule({ ...newRule, protocol: v || 'tcp' })}
            data={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }]}
          />
          <TextInput
            label="From IP (optional)"
            placeholder="any"
            value={newRule.fromIp}
            onChange={(e) => setNewRule({ ...newRule, fromIp: e.target.value })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setShowAddRuleModal(false)}>Cancel</Button>
            <Button variant="filled" color="green" onClick={handleAddRule}>Allow Port</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation */}
      <Modal opened={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Delete Rule" size="sm">
        <Stack gap="md">
          <Alert icon={<IconAlertTriangle size={18} />} color="orange">
            Delete rule #{deleteConfirm}? This cannot be undone.
          </Alert>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="filled" color="red" onClick={() => deleteConfirm && handleDeleteRule(deleteConfirm)}>Delete</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Settings Modal */}
      <Modal opened={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Firewall Settings" size="md">
        <Stack gap="md">
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm" size="sm">Default Policies</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">Incoming</Text>
                <Group gap="xs">
                  <Button size="compact-xs" variant={settings.defaultIncoming === 'deny' ? 'filled' : 'outline'} color="red" onClick={() => { setSettings({ ...settings, defaultIncoming: 'deny' }); handleSetDefault('incoming', 'deny'); }}>Deny</Button>
                  <Button size="compact-xs" variant={settings.defaultIncoming === 'allow' ? 'filled' : 'outline'} color="green" onClick={() => { setSettings({ ...settings, defaultIncoming: 'allow' }); handleSetDefault('incoming', 'allow'); }}>Allow</Button>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Outgoing</Text>
                <Group gap="xs">
                  <Button size="compact-xs" variant={settings.defaultOutgoing === 'deny' ? 'filled' : 'outline'} color="red" onClick={() => { setSettings({ ...settings, defaultOutgoing: 'deny' }); handleSetDefault('outgoing', 'deny'); }}>Deny</Button>
                  <Button size="compact-xs" variant={settings.defaultOutgoing === 'allow' ? 'filled' : 'outline'} color="green" onClick={() => { setSettings({ ...settings, defaultOutgoing: 'allow' }); handleSetDefault('outgoing', 'allow'); }}>Allow</Button>
                </Group>
              </Group>
            </Stack>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm" size="sm">Logging Level</Text>
            <Group gap="xs" wrap="wrap">
              {['off', 'low', 'medium', 'high', 'full'].map((level) => (
                <Button key={level} size="compact-xs" variant={settings.logging === level ? 'filled' : 'outline'} color="blue" onClick={() => { setSettings({ ...settings, logging: level }); handleSetLogging(level); }}>{level}</Button>
              ))}
            </Group>
          </Paper>
          <Alert icon={<IconAlertTriangle size={18} />} color="yellow">
            <Text size="sm"><strong>Warning:</strong> Be careful not to lock yourself out by denying SSH (port 22).</Text>
          </Alert>
        </Stack>
      </Modal>
    </Stack>
  );
}
