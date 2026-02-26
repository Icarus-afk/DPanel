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
  Box,
  Loader,
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
              <IconShield size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Firewall Manager</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage firewall rules
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
            <IconShield size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Firewall Manager
            </Title>
            <Text size="xs" c="var(--text-tertiary)">UFW - Complete Port Management</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Tooltip label="Reload">
            <ActionIcon
              variant="subtle"
              onClick={fetchUfwData}
              loading={loading}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--primary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Settings">
            <ActionIcon
              variant="subtle"
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--text-secondary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              <IconSettings size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {overview && (
        <>
          {/* Status Card */}
          <Card className="card card-hover" style={{ marginBottom: 'var(--space-4)' }}>
            <Group justify="space-between">
              <Group gap="md">
                <Box
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-lg)',
                    background: overview.active ? 'hsl(var(--success-subtle))' : 'hsl(var(--error-subtle))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: overview.active ? 'hsl(var(--success))' : 'hsl(var(--error))',
                  }}
                >
                  {overview.active ? <IconShieldCheck size={28} /> : <IconShieldOff size={28} />}
                </Box>
                <Stack gap={0}>
                  <Text fw={700} size="lg" style={{ color: 'hsl(var(--text-primary))' }}>
                    Firewall is {overview.active ? 'Active' : 'Inactive'}
                  </Text>
                  <Text size="sm" c="var(--text-tertiary)">
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
          </Card>

          {/* Stats Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} style={{ marginBottom: 'var(--space-4)' }}>
            {/* Open Ports */}
            <Card className="card card-hover metric-card metric-card--success">
              <Group gap="xs">
                <Box className="metric-card__icon metric-card__icon--success">
                  <IconDoorEnter size={18} />
                </Box>
                <Stack gap={0}>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Open Ports</Text>
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--success))' }}>{overview.open_ports.length}</Text>
                </Stack>
              </Group>
            </Card>

            {/* Blocked Ports */}
            <Card className="card card-hover metric-card metric-card--error">
              <Group gap="xs">
                <Box className="metric-card__icon metric-card__icon--error">
                  <IconDoorOff size={18} />
                </Box>
                <Stack gap={0}>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Blocked</Text>
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--error))' }}>{overview.blocked_ports.length}</Text>
                </Stack>
              </Group>
            </Card>

            {/* Listening Ports */}
            <Card className="card card-hover metric-card metric-card--info">
              <Group gap="xs">
                <Box className="metric-card__icon metric-card__icon--info">
                  <IconServer size={18} />
                </Box>
                <Stack gap={0}>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Listening</Text>
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--info))' }}>{listeningPorts.length}</Text>
                </Stack>
              </Group>
            </Card>

            {/* Total Rules */}
            <Card className="card card-hover metric-card metric-card--warning">
              <Group gap="xs">
                <Box className="metric-card__icon metric-card__icon--warning">
                  <IconList size={18} />
                </Box>
                <Stack gap={0}>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Total Rules</Text>
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--warning))' }}>{overview.all_rules.length}</Text>
                </Stack>
              </Group>
            </Card>
          </SimpleGrid>

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
                  <Card className="card">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--success-subtle))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--success))',
                          }}
                        >
                          <IconDoorEnter size={18} />
                        </Box>
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Open Ports</Text>
                      </Group>
                      <Badge
                        variant="light"
                        size="sm"
                        style={{
                          background: 'hsl(var(--success-subtle))',
                          color: 'hsl(var(--success))',
                          border: '1px solid hsl(var(--success-border))',
                        }}
                      >
                        {overview.open_ports.length} allowed
                      </Badge>
                    </Group>
                    {overview.open_ports.length === 0 ? (
                      <Text c="var(--text-tertiary)" size="sm">No ports are currently allowed through the firewall</Text>
                    ) : (
                      <SimpleGrid cols={{ base: 2, sm: 3 }}>
                        {overview.open_ports.map((port, idx) => (
                          <Card key={idx} className="card card-hover" style={{ background: 'hsl(var(--bg-tertiary))' }}>
                            <Group justify="space-between">
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Text fw={700} size="lg" style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                                  <Text size="xs" c="var(--text-tertiary)">/{port.protocol}</Text>
                                </Group>
                                <Text size="xs" c="var(--text-tertiary)">
                                  {getServiceName(port.port) || port.service_name || 'Custom'}
                                </Text>
                              </Stack>
                              <Box
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 'var(--radius-md)',
                                  background: 'hsl(var(--success-subtle))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'hsl(var(--success))',
                                }}
                              >
                                <IconCheck size={14} />
                              </Box>
                            </Group>
                          </Card>
                        ))}
                      </SimpleGrid>
                    )}
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, lg: 4 }}>
                  <Card className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--error-subtle))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--error))',
                          }}
                        >
                          <IconDoorOff size={18} />
                        </Box>
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Blocked Ports</Text>
                      </Group>
                      <Badge
                        variant="light"
                        size="sm"
                        style={{
                          background: 'hsl(var(--error-subtle))',
                          color: 'hsl(var(--error))',
                          border: '1px solid hsl(var(--error-border))',
                        }}
                      >
                        {overview.blocked_ports.length} denied
                      </Badge>
                    </Group>
                    {overview.blocked_ports.length === 0 ? (
                      <Text c="var(--text-tertiary)" size="sm">No explicit deny rules</Text>
                    ) : (
                      <Stack gap="xs">
                        {overview.blocked_ports.map((port, idx) => (
                          <Group key={idx} justify="space-between">
                            <Group gap="xs">
                              <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                              <Text size="xs" c="var(--text-tertiary)">/{port.protocol}</Text>
                            </Group>
                            <Box
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--radius-md)',
                                background: 'hsl(var(--error-subtle))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'hsl(var(--error))',
                              }}
                            >
                              <IconX size={14} />
                            </Box>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Card>

                  <Card className="card">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--info-subtle))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--info))',
                          }}
                        >
                          <IconServer size={18} />
                        </Box>
                        <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Listening</Text>
                      </Group>
                      <Badge
                        variant="light"
                        size="sm"
                        style={{
                          background: 'hsl(var(--info-subtle))',
                          color: 'hsl(var(--info))',
                          border: '1px solid hsl(var(--info-border))',
                        }}
                      >
                        {listeningPorts.length} ports
                      </Badge>
                    </Group>
                    {listeningPorts.length === 0 ? (
                      <Text c="var(--text-tertiary)" size="sm">No listening ports detected</Text>
                    ) : (
                      <ScrollArea.Autosize mah={200}>
                        <Stack gap="xs">
                          {listeningPorts.map((port, idx) => (
                            <Group key={idx} justify="space-between">
                              <Group gap="xs">
                                <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                                <Text size="xs" c="var(--text-tertiary)">- {port.service_name || 'Unknown'}</Text>
                              </Group>
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea.Autosize>
                    )}
                  </Card>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            {/* Open Ports Tab */}
            <Tabs.Panel value="open" pt="md">
              <Card className="card">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--success-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--success))',
                      }}
                    >
                      <IconDoorEnter size={18} />
                    </Box>
                    <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Open Ports (Allowed Through Firewall)</Text>
                  </Group>
                  <Button
                    size="sm"
                    variant="filled"
                    color="green"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowAddRuleModal(true)}
                    style={{
                      background: 'hsl(var(--success))',
                      color: 'white',
                    }}
                  >
                    Add Port
                  </Button>
                </Group>
                {overview.open_ports.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
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
                        <IconDoorOff size={32} />
                      </Box>
                      <Text c="var(--text-tertiary)">No ports are allowed through the firewall</Text>
                      <Button
                        size="sm"
                        variant="filled"
                        color="green"
                        onClick={() => setShowAddRuleModal(true)}
                        style={{
                          background: 'hsl(var(--success))',
                          color: 'white',
                        }}
                      >
                        Allow First Port
                      </Button>
                    </Stack>
                  </Center>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {overview.open_ports.map((port, idx) => (
                      <Card key={idx} className="card card-hover" style={{ background: 'hsl(var(--bg-tertiary))' }}>
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={700} size="xl" style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                            <Text size="sm" c="var(--text-tertiary)">/{port.protocol}</Text>
                          </Group>
                          <Box
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 'var(--radius-md)',
                              background: 'hsl(var(--success-subtle))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'hsl(var(--success))',
                            }}
                          >
                            <IconLockOpen size={18} />
                          </Box>
                        </Group>
                        <Text size="sm" fw={500} mb="xs" style={{ color: 'hsl(var(--text-primary))' }}>
                          {getServiceName(port.port) || port.service_name || 'Custom Service'}
                        </Text>
                        <Divider mb="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                        <Text size="xs" c="var(--text-tertiary)">Source: {port.source}</Text>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Card>
            </Tabs.Panel>

            {/* Blocked Ports Tab */}
            <Tabs.Panel value="blocked" pt="md">
              <Card className="card">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--error-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--error))',
                      }}
                    >
                      <IconDoorOff size={18} />
                    </Box>
                    <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Blocked Ports (Denied by Firewall)</Text>
                  </Group>
                </Group>
                {overview.blocked_ports.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
                      <Box
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 'var(--radius-full)',
                          background: 'hsl(var(--success-subtle))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'hsl(var(--success))',
                        }}
                      >
                        <IconCheck size={32} />
                      </Box>
                      <Text c="var(--text-tertiary)">No explicit deny rules configured</Text>
                      <Text size="sm" c="var(--text-tertiary)">Default policy: {overview.stats.deny_rules === 0 ? 'Likely DENY' : 'Mixed'}</Text>
                    </Stack>
                  </Center>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {overview.blocked_ports.map((port, idx) => (
                      <Card key={idx} className="card card-hover" style={{ background: 'hsl(var(--bg-tertiary))' }}>
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={700} size="xl" style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                            <Text size="sm" c="var(--text-tertiary)">/{port.protocol}</Text>
                          </Group>
                          <Box
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 'var(--radius-md)',
                              background: 'hsl(var(--error-subtle))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'hsl(var(--error))',
                            }}
                          >
                            <IconLock size={18} />
                          </Box>
                        </Group>
                        <Text size="sm" fw={500} mb="xs" style={{ color: 'hsl(var(--text-primary))' }}>
                          {getServiceName(port.port) || port.service_name || 'Custom Service'}
                        </Text>
                        <Divider mb="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                        <Text size="xs" c="var(--text-tertiary)">Source: {port.source}</Text>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Card>
            </Tabs.Panel>

            {/* Listening Ports Tab */}
            <Tabs.Panel value="listening" pt="md">
              <Card className="card">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--info-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--info))',
                      }}
                    >
                      <IconServer size={18} />
                    </Box>
                    <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Listening Ports (Services Running on Server)</Text>
                  </Group>
                  <Badge
                    variant="light"
                    size="sm"
                    style={{
                      background: 'hsl(var(--info-subtle))',
                      color: 'hsl(var(--info))',
                      border: '1px solid hsl(var(--info-border))',
                    }}
                  >
                    {listeningPorts.length} services
                  </Badge>
                </Group>
                {listeningPorts.length === 0 ? (
                  <Center p="xl">
                    <Text c="var(--text-tertiary)">No listening TCP ports detected</Text>
                  </Center>
                ) : (
                  <Stack gap="xs">
                    {listeningPorts.map((port, idx) => {
                      const isOpenInFirewall = overview.open_ports.some(p => p.port === port.port);
                      return (
                        <Card key={idx} className="card card-hover" style={{ background: 'hsl(var(--bg-tertiary))' }}>
                          <Group justify="space-between">
                            <Group gap="md">
                              <Box
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 'var(--radius-md)',
                                  background: isOpenInFirewall ? 'hsl(var(--success-subtle))' : 'hsl(var(--warning-subtle))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isOpenInFirewall ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                                }}
                              >
                                {isOpenInFirewall ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                              </Box>
                              <Stack gap={0}>
                                <Group gap="xs">
                                  <Text fw={700} size="lg" style={{ color: 'hsl(var(--text-primary))' }}>{port.port}</Text>
                                  <Text size="sm" c="var(--text-tertiary)">/{port.protocol}</Text>
                                  {isOpenInFirewall ? (
                                    <Badge
                                      size="sm"
                                      variant="light"
                                      style={{
                                        background: 'hsl(var(--success-subtle))',
                                        color: 'hsl(var(--success))',
                                        border: '1px solid hsl(var(--success-border))',
                                      }}
                                    >
                                      Open in firewall
                                    </Badge>
                                  ) : (
                                    <Badge
                                      size="sm"
                                      variant="light"
                                      style={{
                                        background: 'hsl(var(--warning-subtle))',
                                        color: 'hsl(var(--warning))',
                                        border: '1px solid hsl(var(--warning-border))',
                                      }}
                                    >
                                      Blocked by firewall
                                    </Badge>
                                  )}
                                </Group>
                                <Text size="sm" c="var(--text-tertiary)">{port.service_name || 'Unknown service'}</Text>
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
                                style={{
                                  background: 'hsl(var(--success-subtle))',
                                  color: 'hsl(var(--success))',
                                  border: '1px solid hsl(var(--success-border))',
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
              </Card>
            </Tabs.Panel>

            {/* All Rules Tab */}
            <Tabs.Panel value="rules" pt="md">
              <Card className="card">
                <Group justify="space-between" mb="md">
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
                      <IconList size={18} />
                    </Box>
                    <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>All Firewall Rules</Text>
                  </Group>
                  <Badge
                    variant="light"
                    size="sm"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      color: 'hsl(var(--text-secondary))',
                      border: '1px solid hsl(var(--border-default))',
                    }}
                  >
                    {overview.all_rules.length} rules
                  </Badge>
                </Group>
                {overview.all_rules.length === 0 ? (
                  <Center p="xl">
                    <Stack align="center" gap="md">
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
                        <IconShieldOff size={32} />
                      </Box>
                      <Text c="var(--text-tertiary)">No firewall rules configured</Text>
                    </Stack>
                  </Center>
                ) : (
                  <ScrollArea.Autosize mah={400}>
                    <Stack gap="xs">
                      {overview.all_rules.map((rule, idx) => (
                        <Card key={idx} className="card card-hover" style={{ background: 'hsl(var(--bg-tertiary))' }}>
                          <Group justify="space-between">
                            <Group gap="md">
                              <Box
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 'var(--radius-md)',
                                  background: rule.action.toUpperCase().includes('ALLOW')
                                    ? 'hsl(var(--success-subtle))'
                                    : rule.action.toUpperCase().includes('DENY')
                                      ? 'hsl(var(--error-subtle))'
                                      : 'hsl(var(--warning-subtle))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: rule.action.toUpperCase().includes('ALLOW')
                                    ? 'hsl(var(--success))'
                                    : rule.action.toUpperCase().includes('DENY')
                                      ? 'hsl(var(--error))'
                                      : 'hsl(var(--warning))',
                                }}
                              >
                                {rule.action.toUpperCase().includes('ALLOW') ? (
                                  <IconCheck size={16} />
                                ) : rule.action.toUpperCase().includes('DENY') ? (
                                  <IconX size={16} />
                                ) : (
                                  <IconAlertTriangle size={16} />
                                )}
                              </Box>
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Badge
                                    variant="filled"
                                    size="sm"
                                    style={{
                                      background: rule.action.toUpperCase().includes('ALLOW')
                                        ? 'hsl(var(--success))'
                                        : rule.action.toUpperCase().includes('DENY')
                                          ? 'hsl(var(--error))'
                                          : 'hsl(var(--warning))',
                                      color: 'white',
                                    }}
                                  >
                                    {rule.action.toUpperCase()}
                                  </Badge>
                                  {rule.port && (
                                    <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Port {rule.port}</Text>
                                  )}
                                </Group>
                                <Text size="xs" c="var(--text-tertiary)">From: {rule.from}</Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              variant="subtle"
                              onClick={() => setDeleteConfirm(idx + 1)}
                              style={{
                                background: 'hsl(var(--error-subtle))',
                                color: 'hsl(var(--error))',
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>

          {/* Quick Add Ports */}
          <Card className="card" style={{ marginTop: 'var(--space-4)' }}>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: 'hsl(var(--violet-subtle, var(--bg-tertiary)))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'hsl(var(--chart-6))',
                  }}
                >
                  <IconFlame size={18} />
                </Box>
                <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Quick Add Common Ports</Text>
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
                    style={{
                      background: isAlreadyOpen
                        ? 'hsl(var(--success-subtle))'
                        : 'hsl(var(--bg-tertiary))',
                      color: isAlreadyOpen
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--text-secondary))',
                      border: `1px solid hsl(var(--${isAlreadyOpen ? 'success' : 'border-default'}-border))`,
                    }}
                  >
                    {port} {name}
                  </Button>
                );
              })}
            </SimpleGrid>
          </Card>
        </>
      )}

      {/* Add Rule Modal */}
      <Modal
        opened={showAddRuleModal}
        onClose={() => setShowAddRuleModal(false)}
        title={
          <Group gap="sm">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--success-subtle))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--success))',
              }}
            >
              <IconPlus size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Allow Port</Text>
          </Group>
        }
        size="md"
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
          <TextInput
            label="Port"
            placeholder="e.g., 80, 443, 22"
            value={newRule.port}
            onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <Select
            label="Protocol"
            value={newRule.protocol}
            onChange={(v) => setNewRule({ ...newRule, protocol: v || 'tcp' })}
            data={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }]}
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <TextInput
            label="From IP (optional)"
            placeholder="any"
            value={newRule.fromIp}
            onChange={(e) => setNewRule({ ...newRule, fromIp: e.target.value })}
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setShowAddRuleModal(false)}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="green"
              onClick={handleAddRule}
              style={{
                background: 'hsl(var(--success))',
                color: 'white',
              }}
            >
              Allow Port
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={
          <Group gap="sm">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--error-subtle))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--error))',
              }}
            >
              <IconTrash size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Delete Rule</Text>
          </Group>
        }
        size="sm"
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
          <Alert
            icon={<IconAlertTriangle size={18} />}
            color="orange"
            style={{
              background: 'hsl(var(--warning-subtle))',
              border: '1px solid hsl(var(--warning-border))',
              color: 'hsl(var(--text-primary))',
            }}
          >
            <Text size="sm">Delete rule #{deleteConfirm}? This cannot be undone.</Text>
          </Alert>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => setDeleteConfirm(null)}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={() => deleteConfirm && handleDeleteRule(deleteConfirm)}
              style={{
                background: 'hsl(var(--error))',
                color: 'white',
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Settings Modal */}
      <Modal
        opened={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
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
              <IconSettings size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Firewall Settings</Text>
          </Group>
        }
        size="md"
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
          <Card className="card">
            <Text fw={600} mb="sm" size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Default Policies</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" style={{ color: 'hsl(var(--text-secondary))' }}>Incoming</Text>
                <Group gap="xs">
                  <Button
                    size="compact-xs"
                    variant={settings.defaultIncoming === 'deny' ? 'filled' : 'outline'}
                    color="red"
                    onClick={() => {
                      setSettings({ ...settings, defaultIncoming: 'deny' });
                      handleSetDefault('incoming', 'deny');
                    }}
                    style={{
                      background: settings.defaultIncoming === 'deny' ? 'hsl(var(--error))' : 'transparent',
                      color: settings.defaultIncoming === 'deny' ? 'white' : 'hsl(var(--error))',
                      border: `1px solid hsl(var(--error-border))`,
                    }}
                  >
                    Deny
                  </Button>
                  <Button
                    size="compact-xs"
                    variant={settings.defaultIncoming === 'allow' ? 'filled' : 'outline'}
                    color="green"
                    onClick={() => {
                      setSettings({ ...settings, defaultIncoming: 'allow' });
                      handleSetDefault('incoming', 'allow');
                    }}
                    style={{
                      background: settings.defaultIncoming === 'allow' ? 'hsl(var(--success))' : 'transparent',
                      color: settings.defaultIncoming === 'allow' ? 'white' : 'hsl(var(--success))',
                      border: `1px solid hsl(var(--success-border))`,
                    }}
                  >
                    Allow
                  </Button>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm" style={{ color: 'hsl(var(--text-secondary))' }}>Outgoing</Text>
                <Group gap="xs">
                  <Button
                    size="compact-xs"
                    variant={settings.defaultOutgoing === 'deny' ? 'filled' : 'outline'}
                    color="red"
                    onClick={() => {
                      setSettings({ ...settings, defaultOutgoing: 'deny' });
                      handleSetDefault('outgoing', 'deny');
                    }}
                    style={{
                      background: settings.defaultOutgoing === 'deny' ? 'hsl(var(--error))' : 'transparent',
                      color: settings.defaultOutgoing === 'deny' ? 'white' : 'hsl(var(--error))',
                      border: `1px solid hsl(var(--error-border))`,
                    }}
                  >
                    Deny
                  </Button>
                  <Button
                    size="compact-xs"
                    variant={settings.defaultOutgoing === 'allow' ? 'filled' : 'outline'}
                    color="green"
                    onClick={() => {
                      setSettings({ ...settings, defaultOutgoing: 'allow' });
                      handleSetDefault('outgoing', 'allow');
                    }}
                    style={{
                      background: settings.defaultOutgoing === 'allow' ? 'hsl(var(--success))' : 'transparent',
                      color: settings.defaultOutgoing === 'allow' ? 'white' : 'hsl(var(--success))',
                      border: `1px solid hsl(var(--success-border))`,
                    }}
                  >
                    Allow
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Card>

          <Card className="card">
            <Text fw={600} mb="sm" size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Logging Level</Text>
            <Group gap="xs" wrap="wrap">
              {['off', 'low', 'medium', 'high', 'full'].map((level) => (
                <Button
                  key={level}
                  size="compact-xs"
                  variant={settings.logging === level ? 'filled' : 'outline'}
                  color="blue"
                  onClick={() => {
                    setSettings({ ...settings, logging: level });
                    handleSetLogging(level);
                  }}
                  style={{
                    background: settings.logging === level ? 'hsl(var(--primary))' : 'transparent',
                    color: settings.logging === level ? 'white' : 'hsl(var(--primary))',
                    border: `1px solid hsl(var(--primary-border))`,
                  }}
                >
                  {level}
                </Button>
              ))}
            </Group>
          </Card>

          <Alert
            icon={<IconAlertTriangle size={18} />}
            color="yellow"
            style={{
              background: 'hsl(var(--warning-subtle))',
              border: '1px solid hsl(var(--warning-border))',
              color: 'hsl(var(--text-primary))',
            }}
          >
            <Text size="sm">
              <strong style={{ color: 'hsl(var(--text-primary))' }}>Warning:</strong> Be careful not to lock yourself out by denying SSH (port 22).
            </Text>
          </Alert>
        </Stack>
      </Modal>
    </div>
  );
}
