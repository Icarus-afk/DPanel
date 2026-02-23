import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper, Text, Group, Title, Button, Stack, Grid, Card, ThemeIcon, Badge, ActionIcon, Modal, Box, Loader, Center, Divider, Tabs, Textarea, Table, ScrollArea, TextInput, Select, Code,
} from '@mantine/core';
import {
  IconClock, IconRefresh, IconPlus, IconTrash, IconToggleLeft, IconToggleRight, IconFileText, IconFolder,
} from '@tabler/icons-react';

interface CronJob {
  id: number;
  schedule: string;
  command: string;
  user: string;
  enabled: boolean;
  source: string;
}

interface CronFolder {
  name: string;
  path: string;
  scripts: string[];
}

const SCHEDULE_PRESETS = [
  { label: '@reboot - Run once at startup', value: '@reboot' },
  { label: '@yearly - Run once a year (0 0 1 1 *)', value: '0 0 1 1 *' },
  { label: '@monthly - Run once a month (0 0 1 * *)', value: '0 0 1 * *' },
  { label: '@weekly - Run once a week (0 0 * * 0)', value: '0 0 * * 0' },
  { label: '@daily - Run once a day (0 0 * * *)', value: '0 0 * * *' },
  { label: '@hourly - Run once an hour (0 * * * *)', value: '0 * * * *' },
  { label: 'Every 5 minutes (*/5 * * * *)', value: '*/5 * * * *' },
  { label: 'Every 15 minutes (*/15 * * * *)', value: '*/15 * * * *' },
  { label: 'Every 30 minutes (*/30 * * * *)', value: '*/30 * * * *' },
];

export default function CronManager() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('user');
  const [userCrontab, setUserCrontab] = useState('');
  const [systemCrontab, setSystemCrontab] = useState('');
  const [cronDJobs, setCronDJobs] = useState<CronJob[]>([]);
  const [cronFolders, setCronFolders] = useState<CronFolder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [cronLogs, setCronLogs] = useState('');

  const fetchUserCrontab = useCallback(async () => {
    if (!isConnected) return;
    try {
      const crontab = await invoke<string>('get_user_crontab');
      setUserCrontab(crontab.includes('command not found') ? '' : crontab);
    } catch (err: any) {
      console.log('User crontab error:', err.message);
    }
  }, [isConnected]);

  const fetchSystemCrontab = useCallback(async () => {
    if (!isConnected) return;
    try {
      const crontab = await invoke<string>('get_system_crontab');
      setSystemCrontab(crontab);
    } catch (err: any) {
      console.log('System crontab error:', err.message);
    }
  }, [isConnected]);

  const fetchCronDJobs = useCallback(async () => {
    if (!isConnected) return;
    try {
      const jobs = await invoke<CronJob[]>('get_cron_d_jobs');
      setCronDJobs(jobs);
    } catch (err: any) {
      console.log('Cron.d jobs error:', err.message);
    }
  }, [isConnected]);

  const fetchCronFolders = useCallback(async () => {
    if (!isConnected) return;
    try {
      const folders = await invoke<CronFolder[]>('get_cron_folders');
      setCronFolders(folders);
    } catch (err: any) {
      console.log('Cron folders error:', err.message);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      fetchUserCrontab();
      fetchSystemCrontab();
      fetchCronDJobs();
      fetchCronFolders();
    }
  }, [isConnected, fetchUserCrontab, fetchSystemCrontab, fetchCronDJobs, fetchCronFolders]);

  const handleSaveUserCrontab = async () => {
    setLoading(true);
    try {
      await invoke('save_user_crontab', { content: userCrontab });
      addToast('Crontab saved', 'success');
    } catch (err: any) {
      addToast(`Failed to save crontab: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async () => {
    if (!newSchedule || !newCommand) {
      addToast('Please fill in both schedule and command', 'error');
      return;
    }
    setLoading(true);
    try {
      await invoke('add_cron_job', { schedule: newSchedule, command: newCommand });
      addToast('Cron job added', 'success');
      setShowAddModal(false);
      setNewSchedule('');
      setNewCommand('');
      fetchUserCrontab();
    } catch (err: any) {
      addToast(`Failed to add job: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (lineNumber: number) => {
    if (!confirm('Delete this cron job?')) return;
    setLoading(true);
    try {
      await invoke('delete_cron_job', { lineNumber });
      addToast('Cron job deleted', 'success');
      fetchUserCrontab();
    } catch (err: any) {
      addToast(`Failed to delete job: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = async (lineNumber: number, enabled: boolean) => {
    setLoading(true);
    try {
      await invoke('toggle_cron_job', { lineNumber, enabled });
      addToast(`Job ${enabled ? 'enabled' : 'disabled'}`, 'success');
      fetchUserCrontab();
    } catch (err: any) {
      addToast(`Failed to toggle job: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewLogs = async () => {
    setLoading(true);
    try {
      const logs = await invoke<string>('get_cron_logs', { lines: 200 });
      setCronLogs(logs);
      setShowLogsModal(true);
    } catch (err: any) {
      addToast(`Failed to load logs: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const parseCrontabLines = (crontab: string) => {
    const lines = crontab.split('\n');
    const parsed: { line: string; isComment: boolean; isVariable: boolean; isValid: boolean; index: number }[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      parsed.push({
        line,
        isComment: trimmed.startsWith('#') || trimmed === '',
        isVariable: trimmed.startsWith('SHELL=') || trimmed.startsWith('PATH=') || trimmed.startsWith('MAILTO='),
        isValid: !trimmed.startsWith('#') && !trimmed.startsWith('SHELL=') && !trimmed.startsWith('PATH=') && !trimmed.startsWith('MAILTO=') && trimmed !== '',
        index: index + 1,
      });
    });

    return parsed;
  };

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconClock size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to a server to manage cron jobs</Text>
        </Stack>
      </Paper>
    );
  }

  const userLines = parseCrontabLines(userCrontab);
  const systemLines = parseCrontabLines(systemCrontab);

  return (
    <Stack gap="md" h="calc(100vh - 140px)">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
            <IconClock size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Cron Job Manager</Title>
            <Text size="xs" c="dimmed">Manage scheduled tasks and cron jobs</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="outline"
            color="blue"
            leftSection={<IconRefresh size={18} />}
            onClick={() => {
              fetchUserCrontab();
              fetchSystemCrontab();
              fetchCronDJobs();
              fetchCronFolders();
            }}
            loading={loading}
            size="sm"
          >
            Refresh
          </Button>
          <Button
            color="green"
            leftSection={<IconPlus size={18} />}
            onClick={() => setShowAddModal(true)}
            size="sm"
          >
            Add Job
          </Button>
          <Button
            variant="outline"
            leftSection={<IconFileText size={18} />}
            onClick={viewLogs}
            size="sm"
          >
            View Logs
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'user')}>
        <Tabs.List>
          <Tabs.Tab value="user">User Crontab</Tabs.Tab>
          <Tabs.Tab value="system">System Crontab</Tabs.Tab>
          <Tabs.Tab value="crond">/etc/cron.d ({cronDJobs.length})</Tabs.Tab>
          <Tabs.Tab value="folders">Cron Folders</Tabs.Tab>
        </Tabs.List>

        {/* User Crontab Tab */}
        <Tabs.Panel value="user" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Edit User Crontab</Text>
                  <Button
                    size="sm"
                    color="green"
                    onClick={handleSaveUserCrontab}
                    loading={loading}
                  >
                    Save Crontab
                  </Button>
                </Group>
                <Textarea
                  value={userCrontab}
                  onChange={(e) => setUserCrontab(e.target.value)}
                  autosize
                  minRows={15}
                  maxRows={25}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="# Format: minute hour day month weekday command"
                />
                <Text size="xs" c="dimmed" mt="sm">
                  Format: minute hour day month weekday command<br />
                  Example: */5 * * * * /usr/local/bin/backup.sh
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                <Text fw={600} mb="md">Current Jobs</Text>
                <ScrollArea.Autosize mah={400}>
                  <Stack gap="xs">
                    {userLines.filter(l => l.isValid).map((job, idx) => (
                      <Paper key={idx} withBorder p="sm" radius="md" bg="var(--mantine-color-dark-7)">
                        <Group justify="space-between">
                          <Stack gap={0} style={{ flex: 1 }}>
                            <Text size="xs" style={{ fontFamily: 'monospace' }} c="blue">
                              {job.line.split(' ').slice(0, 5).join(' ')}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                              {job.line.split(' ').slice(5).join(' ')}
                            </Text>
                          </Stack>
                          <Group gap="xs">
                            <ActionIcon
                              size="sm"
                              variant={job.line.trim().startsWith('#') ? 'light' : 'light'}
                              color={job.line.trim().startsWith('#') ? 'gray' : 'green'}
                              onClick={() => handleToggleJob(job.index, job.line.trim().startsWith('#'))}
                            >
                              {job.line.trim().startsWith('#') ? <IconToggleRight size={18} /> : <IconToggleLeft size={18} />}
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="red"
                              onClick={() => handleDeleteJob(job.index)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                    {userLines.filter(l => l.isValid).length === 0 && (
                      <Text c="dimmed" ta="center" size="sm">No cron jobs configured</Text>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* System Crontab Tab */}
        <Tabs.Panel value="system" pt="md">
          <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
            <Text fw={600} mb="md">/etc/crontab (Read-only)</Text>
            <ScrollArea.Autosize mah={500}>
              <Box
                component="pre"
                p="md"
                bg="var(--mantine-color-dark-8)"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  borderRadius: 'var(--mantine-radius-md)',
                }}
              >
                {systemCrontab || 'No system crontab found'}
              </Box>
            </ScrollArea.Autosize>
          </Card>
        </Tabs.Panel>

        {/* /etc/cron.d Tab */}
        <Tabs.Panel value="crond" pt="md">
          {cronDJobs.length === 0 ? (
            <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
              <Center>
                <Text c="dimmed">No jobs in /etc/cron.d</Text>
              </Center>
            </Paper>
          ) : (
            <Paper withBorder radius="md" bg="var(--mantine-color-dark-6)">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Schedule</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Command</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {cronDJobs.map((job) => (
                    <Table.Tr key={`${job.source}-${job.id}`}>
                      <Table.Td>
                        <Code>{job.schedule}</Code>
                      </Table.Td>
                      <Table.Td>{job.user}</Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ fontFamily: 'monospace' }}>{job.command}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{job.source}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={job.enabled ? 'green' : 'gray'} variant="light">
                          {job.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Cron Folders Tab */}
        <Tabs.Panel value="folders" pt="md">
          <Grid gutter="md">
            {cronFolders.map((folder) => (
              <Grid.Col span={{ base: 12, md: 6 }} key={folder.name}>
                <Card withBorder radius="md" bg="var(--mantine-color-dark-6)">
                  <Group mb="sm">
                    <IconFolder size={20} color="var(--mantine-color-blue-filled)" />
                    <Text fw={600}>{folder.name}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm" style={{ fontFamily: 'monospace' }}>
                    {folder.path}
                  </Text>
                  <Divider my="xs" />
                  <ScrollArea.Autosize mah={200}>
                    <Stack gap="xs">
                      {folder.scripts.map((script) => (
                        <Group key={script} gap="xs">
                          <IconFileText size={14} color="var(--mantine-color-dimmed)" />
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>{script}</Text>
                        </Group>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </Card>
              </Grid.Col>
            ))}
            {cronFolders.length === 0 && (
              <Grid.Col span={12}>
                <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
                  <Center>
                    <Text c="dimmed">No cron folders found</Text>
                  </Center>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Add Job Modal */}
      <Modal
        opened={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <Group gap="sm">
            <IconClock size={20} />
            <Text fw={600}>Add Cron Job</Text>
          </Group>
        }
      >
        <Stack gap="md">
          <Select
            label="Schedule Preset (optional)"
            placeholder="Select a preset or enter custom schedule"
            data={SCHEDULE_PRESETS}
            value={newSchedule}
            onChange={(v) => setNewSchedule(v || '')}
            searchable
            clearable
          />
          <TextInput
            label="Cron Schedule"
            placeholder="*/5 * * * *"
            value={newSchedule}
            onChange={(e) => setNewSchedule(e.target.value)}
            description="Format: minute hour day month weekday"
          />
          <TextInput
            label="Command"
            placeholder="/usr/local/bin/script.sh"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            description="Full path to the command or script"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJob} loading={loading}>
              Add Job
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Logs Modal */}
      <Modal
        opened={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={
          <Group gap="sm">
            <IconFileText size={20} />
            <Text fw={600}>Cron Logs</Text>
          </Group>
        }
        size="xl"
      >
        <ScrollArea.Autosize mah={500}>
          <Box
            component="pre"
            p="md"
            bg="var(--mantine-color-dark-8)"
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            {cronLogs || 'No cron logs found'}
          </Box>
        </ScrollArea.Autosize>
      </Modal>
    </Stack>
  );
}
