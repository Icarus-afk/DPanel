import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper, Text, Group, TextInput, Button, Title, Stack, ScrollArea,
  Badge, Grid, ActionIcon, Divider, Loader, Center, Box, Card, SimpleGrid,
} from '@mantine/core';
import {
  IconSearch, IconDownload, IconRefresh, IconFileText, IconBrandDocker,
  IconWorld, IconCopy, IconTrash, IconTerminal, IconSettings, IconDatabase,
} from '@tabler/icons-react';
import { Icons } from '../lib/icons';

type LogType = 'system' | 'service' | 'file' | 'docker' | 'custom';

interface LogPreset {
  id: string;
  label: string;
  type: LogType;
  value: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  colorVar: string;
}

const LOG_PRESETS: LogPreset[] = [
  {
    id: 'syslog',
    label: 'System Journal',
    type: 'system',
    value: '',
    icon: <IconWorld size={18} />,
    description: 'Latest system logs via journalctl',
    color: 'blue',
    colorVar: 'primary',
  },
  {
    id: 'docker',
    label: 'Docker Service',
    type: 'service',
    value: 'docker',
    icon: <IconBrandDocker size={18} />,
    description: 'Docker daemon logs',
    color: 'violet',
    colorVar: 'violet',
  },
  {
    id: 'nginx-error',
    label: 'Nginx Error',
    type: 'file',
    value: '/var/log/nginx/error.log',
    icon: <IconWorld size={18} />,
    description: 'Nginx error log',
    color: 'green',
    colorVar: 'success',
  },
  {
    id: 'nginx-access',
    label: 'Nginx Access',
    type: 'file',
    value: '/var/log/nginx/access.log',
    icon: <IconWorld size={18} />,
    description: 'Nginx access log',
    color: 'green',
    colorVar: 'success',
  },
  {
    id: 'syslog-file',
    label: 'Syslog',
    type: 'file',
    value: '/var/log/syslog',
    icon: <IconFileText size={18} />,
    description: 'Traditional syslog file',
    color: 'cyan',
    colorVar: 'info',
  },
  {
    id: 'auth-log',
    label: 'Auth Log',
    type: 'file',
    value: '/var/log/auth.log',
    icon: <IconSettings size={18} />,
    description: 'Authentication logs',
    color: 'orange',
    colorVar: 'warning',
  },
  {
    id: 'messages',
    label: 'System Messages',
    type: 'file',
    value: '/var/log/messages',
    icon: <IconFileText size={18} />,
    description: 'System messages (RHEL/CentOS)',
    color: 'cyan',
    colorVar: 'info',
  },
  {
    id: 'mysql',
    label: 'MySQL/MariaDB',
    type: 'file',
    value: '/var/log/mysql/error.log',
    icon: <IconDatabase size={18} />,
    description: 'MySQL error log',
    color: 'blue',
    colorVar: 'primary',
  },
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    type: 'file',
    value: '/var/log/postgresql/postgresql.log',
    icon: <IconDatabase size={18} />,
    description: 'PostgreSQL log',
    color: 'blue',
    colorVar: 'primary',
  },
  {
    id: 'redis',
    label: 'Redis',
    type: 'file',
    value: '/var/log/redis/redis-server.log',
    icon: <IconDatabase size={18} />,
    description: 'Redis server log',
    color: 'red',
    colorVar: 'error',
  },
];

export default function LogViewer() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<LogPreset | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, autoScroll]);

  const fetchLogs = async (type: LogType, value: string) => {
    if (!isConnected) {
      addToast('Not connected to server', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: string;

      if (type === 'system') {
        result = await invoke('execute_command', { command: 'journalctl -n 300 --no-pager 2>&1' });
      } else if (type === 'service') {
        result = await invoke('get_service_logs', { serviceName: value, lines: 300 });
      } else if (type === 'file') {
        result = await invoke('execute_command', { command: `tail -n 300 ${value} 2>&1` });
      } else {
        result = await invoke('execute_command', { command: `docker logs --tail 300 ${value} 2>&1` });
      }

      const resultStr = String(result);

      if (resultStr.includes('command not found') ||
          resultStr.includes('No such file') ||
          resultStr.includes('permission denied') ||
          resultStr.includes('Failed to') ||
          resultStr.includes('No logs found')) {
        throw new Error(resultStr);
      }

      const lines = resultStr.split('\n').filter(line => line.trim());
      setLogs(lines);

      if (lines.length === 0) {
        addToast('Log file is empty or no entries found', 'warning');
      } else {
        addToast(`Loaded ${lines.length} log entries`, 'success');
      }
    } catch (err: any) {
      const errorMsg = String(err);
      let helpfulMessage = errorMsg;

      if (errorMsg.includes('journalctl') || errorMsg.includes('command not found')) {
        helpfulMessage = 'journalctl not available. Try file-based logs instead.';
      } else if (errorMsg.includes('No logs found') || errorMsg.includes('No entries')) {
        helpfulMessage = 'No logs found. This service may log to a custom file location.';
      } else if (errorMsg.includes('No such file') || errorMsg.includes('not found')) {
        helpfulMessage = 'Log file not found. Service may not be installed or uses custom path.';
      } else if (errorMsg.includes('permission') || errorMsg.includes('Permission') || errorMsg.includes('denied')) {
        helpfulMessage = 'Permission denied. Try running with sudo or check SSH user permissions.';
      } else if (errorMsg.includes('Not connected')) {
        helpfulMessage = 'Not connected. Please reconnect.';
      }

      setError(helpfulMessage);
      addToast(helpfulMessage, 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: LogPreset) => {
    setSelectedPreset(preset);
    setShowCustomInput(false);
    if (preset.type !== 'custom') {
      fetchLogs(preset.type, preset.value);
    }
  };

  const handleCustomSelect = () => {
    setSelectedPreset(null);
    setShowCustomInput(true);
    setLogs([]);
    setError(null);
  };

  const handleCustomLoad = () => {
    if (!customPath.trim()) {
      addToast('Please enter a file path', 'error');
      return;
    }
    fetchLogs('file', customPath);
  };

  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Logs downloaded', 'success');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    addToast('Logs copied to clipboard', 'success');
  };

  const handleClear = () => {
    setLogs([]);
    setError(null);
    setSelectedPreset(null);
    setCustomPath('');
    setShowCustomInput(false);
  };

  const filteredLogs = searchTerm
    ? logs.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
    : logs;

  const highlightSearch = (line: string) => {
    if (!searchTerm) return line;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = line.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? <mark key={i} style={{ background: 'hsl(var(--warning))', padding: '0 4px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--text-inverse))', fontWeight: 600 }}>{part}</mark>
        : part
    );
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
              <IconFileText size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Log Viewer</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to view logs
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
            <IconFileText size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Log Viewer
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              {selectedPreset ? selectedPreset.label : showCustomInput ? 'Custom Path' : 'Select a log source'}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          {logs.length > 0 && (
            <>
              <Badge
                size="sm"
                variant="light"
                style={{
                  background: 'hsl(var(--primary-subtle))',
                  color: 'hsl(var(--primary))',
                  border: '1px solid hsl(var(--primary-border))',
                }}
              >
                {filteredLogs.length} / {logs.length} entries
              </Badge>
              {searchTerm && (
                <Badge
                  size="sm"
                  variant="light"
                  style={{
                    background: 'hsl(var(--warning-subtle))',
                    color: 'hsl(var(--warning))',
                    border: '1px solid hsl(var(--warning-border))',
                  }}
                >
                  Filtered
                </Badge>
              )}
            </>
          )}
        </Group>
      </Group>

      <Grid gutter="md">
        {/* Left Sidebar - Log Sources */}
        <Grid.Col span={{ base: 12, lg: 3 }}>
          <Card className="card" style={{ height: '100%' }}>
            <Group gap="sm" mb="md">
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
              <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Log Sources</Text>
            </Group>
            <ScrollArea.Autosize mah={600}>
              <Stack gap="xs">
                {LOG_PRESETS.map((preset) => {
                  const isSelected = selectedPreset?.id === preset.id;
                  const colorVar = preset.colorVar;
                  return (
                    <Paper
                      key={preset.id}
                      p="sm"
                      radius="md"
                      bg={isSelected ? `hsl(var(--${colorVar}))` : 'hsl(var(--bg-tertiary))'}
                      style={{
                        cursor: 'pointer',
                        transition: 'all var(--duration-fast) var(--easing-default)',
                        border: `1px solid ${isSelected ? `hsl(var(--${colorVar}))` : 'hsl(var(--border-subtle))'}`,
                      }}
                      onClick={() => handlePresetClick(preset)}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'hsl(var(--bg-elevated))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'hsl(var(--bg-tertiary))';
                        }
                      }}
                    >
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'hsl(var(--bg-primary))' : `hsl(var(--${colorVar}-subtle))`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? `hsl(var(--${colorVar}))` : `hsl(var(--${colorVar}))`,
                            flexShrink: 0,
                          }}
                        >
                          {preset.icon}
                        </Box>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            size="sm"
                            fw={600}
                            c={isSelected ? 'white' : 'var(--text-primary)'}
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {preset.label}
                          </Text>
                          <Text
                            size="xs"
                            c={isSelected ? 'white' : 'var(--text-tertiary)'}
                            style={{ opacity: isSelected ? 0.9 : 1 }}
                          >
                            {preset.description}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  );
                })}

                {/* Custom Path Option */}
                <Paper
                  p="sm"
                  radius="md"
                  bg={showCustomInput ? 'hsl(var(--primary))' : 'hsl(var(--bg-tertiary))'}
                  style={{
                    cursor: 'pointer',
                    border: `1px solid ${showCustomInput ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
                  }}
                  onClick={handleCustomSelect}
                >
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: showCustomInput ? 'hsl(var(--bg-primary))' : 'hsl(var(--bg-elevated))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: showCustomInput ? 'hsl(var(--primary))' : 'hsl(var(--text-tertiary))',
                        flexShrink: 0,
                      }}
                    >
                      <IconTerminal size={18} />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text
                        size="sm"
                        fw={600}
                        c={showCustomInput ? 'white' : 'var(--text-primary)'}
                      >
                        Custom Path
                      </Text>
                      <Text
                        size="xs"
                        c={showCustomInput ? 'white' : 'var(--text-tertiary)'}
                      >
                        Enter a custom log file path
                      </Text>
                    </Box>
                  </Group>
                </Paper>

                {showCustomInput && (
                  <Stack gap="xs" mt="xs">
                    <TextInput
                      placeholder="/var/log/custom.log"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      size="sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomLoad()}
                      styles={{
                        input: {
                          background: 'hsl(var(--bg-tertiary))',
                          border: '1px solid hsl(var(--border-subtle))',
                          color: 'hsl(var(--text-primary))',
                        },
                      }}
                    />
                    <Button
                      size="sm"
                      fullWidth
                      onClick={handleCustomLoad}
                      loading={loading}
                      style={{
                        background: 'hsl(var(--success))',
                        color: 'white',
                      }}
                    >
                      Load Log File
                    </Button>
                  </Stack>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Card>
        </Grid.Col>

        {/* Right - Log Output */}
        <Grid.Col span={{ base: 12, lg: 9 }}>
          <Card className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <TextInput
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  style={{ width: 220 }}
                  variant="filled"
                  styles={{
                    input: {
                      background: 'hsl(var(--bg-tertiary))',
                      border: '1px solid hsl(var(--border-subtle))',
                      color: 'hsl(var(--text-primary))',
                    },
                  }}
                />
                <Paper
                  withBorder
                  p="xs"
                  radius="md"
                  style={{
                    background: autoScroll ? 'hsl(var(--primary-subtle))' : 'hsl(var(--bg-tertiary))',
                    border: `1px solid ${autoScroll ? 'hsl(var(--primary-border))' : 'hsl(var(--border-subtle))'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  <Box
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 'var(--radius-sm)',
                      background: autoScroll ? 'hsl(var(--primary))' : 'transparent',
                      border: `1px solid ${autoScroll ? 'hsl(var(--primary))' : 'hsl(var(--text-tertiary))'}`,
                    }}
                  />
                  <Text size="xs" c={autoScroll ? 'var(--text-primary)' : 'var(--text-tertiary)'}>Auto-scroll</Text>
                </Paper>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  onClick={handleCopy}
                  disabled={!logs.length}
                  style={{
                    background: logs.length ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--bg-tertiary))',
                    color: logs.length ? 'hsl(var(--text-secondary))' : 'hsl(var(--text-tertiary))',
                    border: '1px solid hsl(var(--border-subtle))',
                  }}
                  title="Copy to clipboard"
                >
                  <IconCopy size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  onClick={handleDownload}
                  disabled={!logs.length}
                  style={{
                    background: logs.length ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--bg-tertiary))',
                    color: logs.length ? 'hsl(var(--text-secondary))' : 'hsl(var(--text-tertiary))',
                    border: '1px solid hsl(var(--border-subtle))',
                  }}
                  title="Download"
                >
                  <IconDownload size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  onClick={handleClear}
                  style={{
                    background: 'hsl(var(--error-subtle))',
                    color: 'hsl(var(--error))',
                    border: '1px solid hsl(var(--error-border))',
                  }}
                  title="Clear"
                >
                  <IconTrash size={18} />
                </ActionIcon>
                <Divider orientation="vertical" style={{ borderColor: 'hsl(var(--border-subtle))', height: 24 }} />
                <ActionIcon
                  variant="subtle"
                  onClick={() => selectedPreset && fetchLogs(selectedPreset.type, selectedPreset.value || customPath)}
                  loading={loading}
                  style={{
                    background: 'hsl(var(--primary-subtle))',
                    color: 'hsl(var(--primary))',
                    border: '1px solid hsl(var(--primary-border))',
                  }}
                  title="Refresh"
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider mb="md" style={{ borderColor: 'hsl(var(--border-subtle))' }} />

            {/* Log Content */}
            <Box style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {loading && logs.length === 0 ? (
                <Center h="100%">
                  <Stack align="center" gap="md">
                    <Loader size="lg" color="hsl(var(--primary))" />
                    <Text c="var(--text-tertiary)">Loading logs...</Text>
                  </Stack>
                </Center>
              ) : error ? (
                <Card className="card card-elevated" style={{ height: '100%' }}>
                  <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
                    <Box
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 'var(--radius-full)',
                        background: 'hsl(var(--error-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--error))',
                      }}
                    >
                      <Icons.AlertTriangle size={32} />
                    </Box>
                    <Text c="var(--text-primary)" fw={600} size="lg">Unable to load logs</Text>
                    <Text c="var(--text-secondary)" size="sm" ta="center">{error}</Text>
                    <Text c="var(--text-tertiary)" size="xs" ta="center">
                      Tip: Try a different log source or check if the service is running.
                    </Text>
                  </Stack>
                </Card>
              ) : logs.length > 0 ? (
                <ScrollArea.Autosize style={{ height: '100%' }}>
                  <Box
                    component="pre"
                    p="md"
                    bg="hsl(var(--bg-tertiary))"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      lineHeight: 1.7,
                      minWidth: '100%',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid hsl(var(--border-subtle))',
                    }}
                  >
                    {filteredLogs.map((line, i) => {
                      const isError = line.toLowerCase().includes('error');
                      const isWarn = line.toLowerCase().includes('warn');
                      const isFail = line.toLowerCase().includes('fail');
                      return (
                        <Box key={i} style={{ display: 'flex', gap: 12, borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: 4, marginBottom: 4 }}>
                          <Text
                            component="span"
                            c="var(--text-tertiary)"
                            style={{
                              minWidth: 48,
                              textAlign: 'right',
                              userSelect: 'none',
                              flexShrink: 0,
                              fontSize: 'var(--text-xs)',
                              paddingTop: 2,
                            }}
                          >
                            {i + 1}
                          </Text>
                          <Text
                            component="span"
                            style={{
                              flex: 1,
                              wordBreak: 'break-all',
                              color: isError ? 'hsl(var(--error))' :
                                     isWarn ? 'hsl(var(--warning))' :
                                     isFail ? 'hsl(var(--error))' :
                                     'hsl(var(--text-secondary))',
                            }}
                          >
                            {highlightSearch(line)}
                          </Text>
                        </Box>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </Box>
                </ScrollArea.Autosize>
              ) : (
                <Center h="100%">
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
                      <IconFileText size={32} />
                    </Box>
                    <Text c="var(--text-secondary)" fw={500}>
                      {showCustomInput ? 'Enter a path and click Load to view logs' : 'Select a log source to view entries'}
                    </Text>
                    {!showCustomInput && (
                      <Text c="var(--text-tertiary)" size="sm">
                        Or choose Custom Path to load a specific file
                      </Text>
                    )}
                  </Stack>
                </Center>
              )}
            </Box>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
