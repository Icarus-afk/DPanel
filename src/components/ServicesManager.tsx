import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper, Text, Group, Title, Button, Stack, ScrollArea, Table, Badge, ActionIcon, Modal, Box, Loader, Center, ThemeIcon, Divider, TextInput, Card, SimpleGrid,
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

export default function ServicesManager() {
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
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconSettings size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to a server to manage services</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md" h="calc(100vh - 140px)">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
            <IconSettings size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Systemd Services</Title>
            <Text size="xs" c="dimmed">Manage system services and view logs</Text>
          </Stack>
        </Group>
        <Button
          variant="outline"
          color="blue"
          leftSection={<IconRefresh size={18} />}
          onClick={fetchServices}
          loading={loading}
        >
          Refresh
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue" size="md">
              <IconServer size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Total Services</Text>
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
              <Text size="xs" c="dimmed">Active</Text>
              <Text size="xl" fw={700} c="green">{stats.active}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="red" size="md">
              <IconPlayerStop size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Failed</Text>
              <Text size="xl" fw={700} c="red">{stats.failed}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="gray" size="md">
              <IconSettings size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Inactive</Text>
              <Text size="xl" fw={700} c="gray">{stats.inactive}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Group gap="sm">
        <TextInput
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftSection={<IconSearch size={16} />}
          style={{ width: 250 }}
          variant="filled"
          size="sm"
        />
        <Group gap="xs">
          {['all', 'active', 'failed', 'inactive'].map((state) => (
            <Badge
              key={state}
              variant={filterState === state ? 'filled' : 'light'}
              color={state === 'all' ? 'blue' : state === 'active' ? 'green' : state === 'failed' ? 'red' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilterState(state)}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </Badge>
          ))}
        </Group>
      </Group>

      {/* Services Table */}
      <Paper withBorder radius="md" bg="var(--mantine-color-dark-6)" style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollArea.Autosize style={{ height: '100%' }}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Service Name</Table.Th>
                <Table.Th>State</Table.Th>
                <Table.Th>Sub State</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && services.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text c="dimmed">Loading services...</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : filteredServices.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text c="dimmed">
                        {searchTerm || filterState !== 'all' ? 'No matching services found' : 'No services found'}
                      </Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredServices.map((service) => (
                  <Table.Tr key={service.name}>
                    <Table.Td>
                      <Text fw={500} style={{ fontFamily: 'monospace' }}>{service.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStateColor(service.state)} variant="light">
                        {service.state}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{service.sub_state}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {service.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {service.state.toLowerCase() === 'active' ? (
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={() => handleServiceAction('stop', service.name)}
                            title="Stop"
                          >
                            <IconPlayerStop size={16} />
                          </ActionIcon>
                        ) : (
                          <ActionIcon
                            color="green"
                            variant="light"
                            size="sm"
                            onClick={() => handleServiceAction('start', service.name)}
                            title="Start"
                          >
                            <IconPlayerPlay size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          color="blue"
                          variant="light"
                          size="sm"
                          onClick={() => handleServiceAction('restart', service.name)}
                          title="Restart"
                        >
                          <IconReload size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="gray"
                          variant="light"
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
      </Paper>

      {/* Logs Modal */}
      <Modal
        opened={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={
          <Group gap="sm">
            <IconFileText size={20} />
            <Text fw={600}>Logs: {selectedService?.name}</Text>
          </Group>
        }
        size="xl"
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Last 200 lines</Text>
            <Button
              size="compact-sm"
              variant="outline"
              leftSection={<IconRefresh size={16} />}
              onClick={() => selectedService && fetchServiceLogs(selectedService)}
              loading={logsLoading}
            >
              Refresh
            </Button>
          </Group>
          <Divider />
          <Box
            style={{
              maxHeight: 500,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
              backgroundColor: 'var(--mantine-color-dark-8)',
              padding: 'var(--mantine-spacing-md)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            {logsLoading ? (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            ) : serviceLogs ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {serviceLogs}
              </pre>
            ) : (
              <Text c="dimmed" ta="center">No logs available</Text>
            )}
          </Box>
        </Stack>
      </Modal>
    </Stack>
  );
}
