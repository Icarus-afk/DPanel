import { useState, useEffect, useCallback, memo } from 'react';
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

const CronManager = memo(function CronManager() {
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
              <IconClock size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Cron Job Manager</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage cron jobs
            </Text>
          </Stack>
        </Card>
      </div>
    );
  }

  const userLines = parseCrontabLines(userCrontab);
  const systemLines = parseCrontabLines(systemCrontab);

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
            <IconClock size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Cron Job Manager
            </Title>
            <Text size="xs" c="var(--text-tertiary)">Manage scheduled tasks and cron jobs</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => {
              fetchUserCrontab();
              fetchSystemCrontab();
              fetchCronDJobs();
              fetchCronFolders();
            }}
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
          <Button
            size="compact-sm"
            style={{
              background: 'hsl(var(--success))',
              color: 'white',
            }}
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowAddModal(true)}
          >
            Add Job
          </Button>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={viewLogs}
            leftSection={<IconFileText size={16} />}
            style={{
              background: 'hsl(var(--bg-tertiary))',
              color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-default))',
            }}
          >
            View Logs
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'user')} variant="pills">
        <Tabs.List style={{ marginBottom: 'var(--space-4)' }}>
          <Tabs.Tab value="user">User Crontab</Tabs.Tab>
          <Tabs.Tab value="system">System Crontab</Tabs.Tab>
          <Tabs.Tab value="crond">/etc/cron.d ({cronDJobs.length})</Tabs.Tab>
          <Tabs.Tab value="folders">Cron Folders</Tabs.Tab>
        </Tabs.List>

        {/* User Crontab Tab */}
        <Tabs.Panel value="user" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card className="card">
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Edit User Crontab</Text>
                  <Button
                    size="sm"
                    style={{
                      background: 'hsl(var(--success))',
                      color: 'white',
                    }}
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
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    background: 'hsl(var(--bg-tertiary))',
                    border: '1px solid hsl(var(--border-subtle))',
                    color: 'hsl(var(--text-primary))',
                  }}
                  placeholder="# Format: minute hour day month weekday command"
                />
                <Text size="xs" c="var(--text-tertiary)" mt="sm">
                  Format: minute hour day month weekday command<br />
                  Example: */5 * * * * /usr/local/bin/backup.sh
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card className="card">
                <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))', marginBottom: 'var(--space-4)' }}>Current Jobs</Text>
                <ScrollArea.Autosize mah={400}>
                  <Stack gap="xs">
                    {userLines.filter(l => l.isValid).map((job, idx) => (
                      <Paper
                        key={idx}
                        withBorder
                        p="sm"
                        radius="md"
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          border: '1px solid hsl(var(--border-subtle))',
                        }}
                      >
                        <Group justify="space-between">
                          <Stack gap={0} style={{ flex: 1 }}>
                            <Text size="xs" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--primary))' }}>
                              {job.line.split(' ').slice(0, 5).join(' ')}
                            </Text>
                            <Text size="xs" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
                              {job.line.split(' ').slice(5).join(' ')}
                            </Text>
                          </Stack>
                          <Group gap="xs">
                            <ActionIcon
                              size="sm"
                              style={{
                                background: job.line.trim().startsWith('#') ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--success-subtle))',
                                color: job.line.trim().startsWith('#') ? 'hsl(var(--text-tertiary))' : 'hsl(var(--success))',
                              }}
                              onClick={() => handleToggleJob(job.index, job.line.trim().startsWith('#'))}
                            >
                              {job.line.trim().startsWith('#') ? <IconToggleRight size={18} /> : <IconToggleLeft size={18} />}
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              style={{
                                background: 'hsl(var(--error-subtle))',
                                color: 'hsl(var(--error))',
                              }}
                              onClick={() => handleDeleteJob(job.index)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                    {userLines.filter(l => l.isValid).length === 0 && (
                      <Text c="var(--text-tertiary)" ta="center" size="sm">No cron jobs configured</Text>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* System Crontab Tab */}
        <Tabs.Panel value="system" pt="md">
          <Card className="card">
            <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))', marginBottom: 'var(--space-4)' }}>/etc/crontab (Read-only)</Text>
            <ScrollArea.Autosize mah={500}>
              <Box
                component="pre"
                p="md"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  backgroundColor: 'hsl(var(--bg-tertiary))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid hsl(var(--border-subtle))',
                  color: 'hsl(var(--text-secondary))',
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
            <Card className="card card-elevated">
              <Center>
                <Text c="var(--text-tertiary)">No jobs in /etc/cron.d</Text>
              </Center>
            </Card>
          ) : (
            <Card className="card">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Schedule</Table.Th>
                    <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>User</Table.Th>
                    <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Command</Table.Th>
                    <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Source</Table.Th>
                    <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {cronDJobs.map((job) => (
                    <Table.Tr key={`${job.source}-${job.id}`}>
                      <Table.Td>
                        <Code style={{ background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary-border))' }}>
                          {job.schedule}
                        </Code>
                      </Table.Td>
                      <Table.Td style={{ color: 'hsl(var(--text-primary))' }}>{job.user}</Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-primary))' }}>{job.command}</Text>
                      </Table.Td>
                      <Table.Td c="var(--text-tertiary)">{job.source}</Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="light"
                          style={{
                            background: job.enabled ? 'hsl(var(--success-subtle))' : 'hsl(var(--bg-tertiary))',
                            color: job.enabled ? 'hsl(var(--success))' : 'hsl(var(--text-tertiary))',
                            border: `1px solid hsl(var(--${job.enabled ? 'success' : 'border-default'}-border))`,
                          }}
                        >
                          {job.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Tabs.Panel>

        {/* Cron Folders Tab */}
        <Tabs.Panel value="folders" pt="md">
          <Grid gutter="md">
            {cronFolders.map((folder) => (
              <Grid.Col span={{ base: 12, md: 6 }} key={folder.name}>
                <Card className="card card-hover">
                  <Group mb="sm">
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
                      <IconFolder size={20} />
                    </Box>
                    <Stack gap={0}>
                      <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>{folder.name}</Text>
                      <Text size="xs" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
                        {folder.path}
                      </Text>
                    </Stack>
                  </Group>
                  <Divider my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                  <ScrollArea.Autosize mah={200}>
                    <Stack gap="xs">
                      {folder.scripts.map((script) => (
                        <Group key={script} gap="xs">
                          <IconFileText size={14} style={{ color: 'hsl(var(--text-tertiary))' }} />
                          <Text size="sm" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-primary))' }}>{script}</Text>
                        </Group>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </Card>
              </Grid.Col>
            ))}
            {cronFolders.length === 0 && (
              <Grid.Col span={12}>
                <Card className="card card-elevated">
                  <Center>
                    <Text c="var(--text-tertiary)">No cron folders found</Text>
                  </Center>
                </Card>
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
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--warning-subtle))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--warning))',
              }}
            >
              <IconClock size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Add Cron Job</Text>
          </Group>
        }
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
          <Select
            label="Schedule Preset (optional)"
            placeholder="Select a preset or enter custom schedule"
            data={SCHEDULE_PRESETS}
            value={newSchedule}
            onChange={(v) => setNewSchedule(v || '')}
            searchable
            clearable
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <TextInput
            label="Cron Schedule"
            placeholder="*/5 * * * *"
            value={newSchedule}
            onChange={(e) => setNewSchedule(e.target.value)}
            description="Format: minute hour day month weekday"
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
            }}
          />
          <TextInput
            label="Command"
            placeholder="/usr/local/bin/script.sh"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            description="Full path to the command or script"
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
              onClick={() => setShowAddModal(false)}
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
              onClick={handleAddJob}
              loading={loading}
            >
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
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Cron Logs</Text>
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
        <ScrollArea.Autosize mah={500}>
          <Box
            component="pre"
            p="md"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              backgroundColor: 'hsl(var(--bg-tertiary))',
              borderRadius: 'var(--radius-md)',
              border: '1px solid hsl(var(--border-subtle))',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            {cronLogs || 'No cron logs found'}
          </Box>
        </ScrollArea.Autosize>
      </Modal>
    </div>
  );
});

export default CronManager;
