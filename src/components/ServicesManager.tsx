import { useState, useEffect, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper, Text, Group, Title, Button, Stack, ScrollArea, Table, Badge, ActionIcon, Modal, Box, Loader, Center, Divider, TextInput, Card, SimpleGrid,
} from '@mantine/core';
import {
  IconRefresh, IconPlayerPlay, IconPlayerStop, IconReload, IconSettings, IconFileText, IconSearch, IconServer,
} from '@tabler/icons-react';

interface ServiceInfo {
  name: string;
  state: string;
  sub_state: string;
  description: string;
}

const ServicesManager = memo(function ServicesManager() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [serviceLogs, setServiceLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('all');

  const fetchServices = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await invoke<ServiceInfo[]>('get_services');
      setServices(data);
    } catch (err: any) {
      addToast(`Failed to fetch services: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isConnected, addToast]);

  useEffect(() => {
    if (isConnected) {
      fetchServices();
    }
  }, [isConnected, fetchServices]);

  const handleServiceAction = async (action: string, serviceName: string) => {
    try {
      await invoke('service_action', { action, serviceName });
      addToast(`Service ${serviceName} ${action}ed`, 'success');
      fetchServices();
    } catch (err: any) {
      addToast(`Failed to ${action} service: ${err.message}`, 'error');
    }
  };

  const fetchServiceLogs = async (service: ServiceInfo) => {
    setSelectedService(service);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const logs = await invoke<string>('get_service_logs', { serviceName: service.name, lines: 200 });
      setServiceLogs(logs);
    } catch (err: any) {
      addToast(`Failed to fetch logs: ${err.message}`, 'error');
      setServiceLogs('');
    } finally {
      setLogsLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'gray';
      case 'failed':
        return 'red';
      case 'activating':
        return 'blue';
      case 'deactivating':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterState === 'all' || service.state.toLowerCase() === filterState.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: services.length,
    active: services.filter(s => s.state.toLowerCase() === 'active').length,
    failed: services.filter(s => s.state.toLowerCase() === 'failed').length,
    inactive: services.filter(s => s.state.toLowerCase() === 'inactive').length,
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
              <IconSettings size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Systemd Services</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage services
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
              background: 'hsl(var(--warning-subtle))',
              border: '1px solid hsl(var(--warning-border))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(var(--warning))',
            }}
          >
            <IconSettings size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Systemd Services
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              Manage system services and view logs
            </Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={fetchServices}
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

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} style={{ marginBottom: 'var(--space-4)' }}>
        {/* Total Services */}
        <Card className="card card-hover metric-card metric-card--primary">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--primary">
              <IconServer size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Total Services</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{stats.total}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Active */}
        <Card className="card card-hover metric-card metric-card--success">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--success">
              <IconPlayerPlay size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Active</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--success))' }}>{stats.active}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Failed */}
        <Card className="card card-hover metric-card metric-card--error">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--error">
              <IconPlayerStop size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Failed</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--error))' }}>{stats.failed}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Inactive */}
        <Card className="card card-hover metric-card metric-card--info">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--info">
              <IconSettings size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Inactive</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--info))' }}>{stats.inactive}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Card className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <Group gap="sm">
          <TextInput
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
            style={{ width: 250 }}
            variant="filled"
            size="sm"
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <Group gap="xs">
            {['all', 'active', 'failed', 'inactive'].map((state) => (
              <Badge
                key={state}
                variant={filterState === state ? 'filled' : 'light'}
                color={state === 'all' ? 'blue' : state === 'active' ? 'green' : state === 'failed' ? 'red' : 'gray'}
                size="sm"
                onClick={() => setFilterState(state)}
                style={{
                  cursor: 'pointer',
                  background: filterState === state
                    ? `hsl(var(--${state === 'all' ? 'primary' : state === 'active' ? 'success' : state === 'failed' ? 'error' : 'bg-tertiary'}))`
                    : state === 'active' && filterState !== state
                      ? 'hsl(var(--success-subtle))'
                      : state === 'failed' && filterState !== state
                        ? 'hsl(var(--error-subtle))'
                        : state === 'all' && filterState !== state
                          ? 'hsl(var(--primary-subtle))'
                          : 'hsl(var(--bg-tertiary))',
                  color: filterState === state
                    ? 'white'
                    : state === 'active'
                      ? 'hsl(var(--success))'
                      : state === 'failed'
                        ? 'hsl(var(--error))'
                        : state === 'all'
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--text-tertiary))',
                  border: `1px solid hsl(var(--${state === 'active' ? 'success' : state === 'failed' ? 'error' : state === 'all' ? 'primary' : 'border-default'}-border))`,
                }}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </Badge>
            ))}
          </Group>
        </Group>
      </Card>

      {/* Services Table */}
      <Card className="card" style={{ flex: 1, overflow: 'hidden', minHeight: 400 }}>
        <ScrollArea.Autosize style={{ height: '100%' }}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Service Name</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>State</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Sub State</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Description</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && services.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" color="hsl(var(--primary))" />
                        <Text c="var(--text-tertiary">Loading services...</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : filteredServices.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text c="var(--text-tertiary)">
                        {searchTerm || filterState !== 'all' ? 'No matching services found' : 'No services found'}
                      </Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredServices.map((service) => (
                  <Table.Tr key={service.name}>
                    <Table.Td>
                      <Text fw={500} style={{ fontFamily: 'monospace', color: 'hsl(var(--text-primary))' }}>{service.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStateColor(service.state)}
                        variant="light"
                        size="sm"
                        style={{
                          background: service.state.toLowerCase() === 'active'
                            ? 'hsl(var(--success-subtle))'
                            : service.state.toLowerCase() === 'failed'
                              ? 'hsl(var(--error-subtle))'
                              : 'hsl(var(--bg-tertiary))',
                          color: service.state.toLowerCase() === 'active'
                            ? 'hsl(var(--success))'
                            : service.state.toLowerCase() === 'failed'
                              ? 'hsl(var(--error))'
                              : 'hsl(var(--text-secondary))',
                          border: `1px solid hsl(var(--${service.state.toLowerCase() === 'active' ? 'success' : service.state.toLowerCase() === 'failed' ? 'error' : 'border-default'}-border))`,
                        }}
                      >
                        {service.state}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="var(--text-tertiary)">{service.sub_state}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c="var(--text-secondary)"
                        style={{
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {service.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {service.state.toLowerCase() === 'active' ? (
                          <ActionIcon
                            style={{
                              background: 'hsl(var(--error-subtle))',
                              color: 'hsl(var(--error))',
                            }}
                            size="sm"
                            onClick={() => handleServiceAction('stop', service.name)}
                            title="Stop"
                          >
                            <IconPlayerStop size={16} />
                          </ActionIcon>
                        ) : (
                          <ActionIcon
                            style={{
                              background: 'hsl(var(--success-subtle))',
                              color: 'hsl(var(--success))',
                            }}
                            size="sm"
                            onClick={() => handleServiceAction('start', service.name)}
                            title="Start"
                          >
                            <IconPlayerPlay size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          style={{
                            background: 'hsl(var(--primary-subtle))',
                            color: 'hsl(var(--primary))',
                          }}
                          size="sm"
                          onClick={() => handleServiceAction('restart', service.name)}
                          title="Restart"
                        >
                          <IconReload size={16} />
                        </ActionIcon>
                        <ActionIcon
                          style={{
                            background: 'hsl(var(--bg-tertiary))',
                            color: 'hsl(var(--text-secondary))',
                          }}
                          size="sm"
                          onClick={() => fetchServiceLogs(service)}
                          title="View Logs"
                        >
                          <IconFileText size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      </Card>

      {/* Logs Modal */}
      <Modal
        opened={showLogsModal}
        onClose={() => setShowLogsModal(false)}
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
              <IconFileText size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Logs: {selectedService?.name}</Text>
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
          <Group justify="space-between">
            <Text size="sm" c="var(--text-tertiary)">Last 200 lines</Text>
            <Button
              size="compact-sm"
              variant="subtle"
              onClick={() => selectedService && fetchServiceLogs(selectedService)}
              loading={logsLoading}
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
          <Divider style={{ borderColor: 'hsl(var(--border-subtle))' }} />
          <Box
            style={{
              maxHeight: 500,
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              backgroundColor: 'hsl(var(--bg-tertiary))',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid hsl(var(--border-subtle))',
            }}
          >
            {logsLoading ? (
              <Center py="xl">
                <Loader size="sm" color="hsl(var(--primary))" />
              </Center>
            ) : serviceLogs ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'hsl(var(--text-secondary))' }}>
                {serviceLogs}
              </pre>
            ) : (
              <Text c="var(--text-tertiary)" ta="center">No logs available</Text>
            )}
          </Box>
        </Stack>
      </Modal>
    </div>
  );
});

export default ServicesManager;
