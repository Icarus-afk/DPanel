import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Paper,
  Text,
  Group,
  TextInput,
  Button,
  Title,
  Stack,
  ScrollArea,
  Checkbox,
  Badge,
  Grid,
  ActionIcon,
  Divider,
  Loader,
  Center,
  ThemeIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  IconSearch,
  IconDownload,
  IconRefresh,
  IconFileText,
  IconBrandDocker,
  IconWorld,
  IconCopy,
  IconTrash,
  IconTerminal,
  IconSettings,
  IconDatabase,
} from '@tabler/icons-react';

type LogType = 'system' | 'service' | 'file' | 'docker' | 'custom';

interface LogPreset {
  id: string;
  label: string;
  type: LogType;
  value: string;
  icon: React.ReactNode;
  description: string;
  color: string;
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
  },
  {
    id: 'docker',
    label: 'Docker Service',
    type: 'service',
    value: 'docker',
    icon: <IconBrandDocker size={18} />,
    description: 'Docker daemon logs',
    color: 'violet',
  },
  {
    id: 'nginx-error',
    label: 'Nginx Error',
    type: 'file',
    value: '/var/log/nginx/error.log',
    icon: <IconWorld size={18} />,
    description: 'Nginx error log',
    color: 'green',
  },
  {
    id: 'nginx-access',
    label: 'Nginx Access',
    type: 'file',
    value: '/var/log/nginx/access.log',
    icon: <IconWorld size={18} />,
    description: 'Nginx access log',
    color: 'green',
  },
  {
    id: 'syslog-file',
    label: 'Syslog',
    type: 'file',
    value: '/var/log/syslog',
    icon: <IconFileText size={18} />,
    description: 'Traditional syslog file',
    color: 'cyan',
  },
  {
    id: 'auth-log',
    label: 'Auth Log',
    type: 'file',
    value: '/var/log/auth.log',
    icon: <IconSettings size={18} />,
    description: 'Authentication logs',
    color: 'orange',
  },
  {
    id: 'messages',
    label: 'System Messages',
    type: 'file',
    value: '/var/log/messages',
    icon: <IconFileText size={18} />,
    description: 'System messages (RHEL/CentOS)',
    color: 'cyan',
  },
  {
    id: 'mysql',
    label: 'MySQL/MariaDB',
    type: 'file',
    value: '/var/log/mysql/error.log',
    icon: <IconDatabase size={18} />,
    description: 'MySQL error log',
    color: 'blue',
  },
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    type: 'file',
    value: '/var/log/postgresql/postgresql.log',
    icon: <IconDatabase size={18} />,
    description: 'PostgreSQL log',
    color: 'blue',
  },
  {
    id: 'redis',
    label: 'Redis',
    type: 'file',
    value: '/var/log/redis/redis-server.log',
    icon: <IconDatabase size={18} />,
    description: 'Redis server log',
    color: 'red',
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
        // Try journalctl for system logs
        result = await invoke('execute_command', { command: 'journalctl -n 300 --no-pager 2>&1' });
      } else if (type === 'service') {
        // Use dedicated service logs command with fallback logic
        result = await invoke('get_service_logs', { serviceName: value, lines: 300 });
      } else if (type === 'file') {
        result = await invoke('execute_command', { command: `tail -n 300 ${value} 2>&1` });
      } else {
        result = await invoke('execute_command', { command: `docker logs --tail 300 ${value} 2>&1` });
      }

      const resultStr = String(result);

      // Check for error indicators
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
        ? <mark key={i} style={{ background: 'var(--mantine-color-yellow-6)', padding: '0 4px', borderRadius: 2, color: 'black', fontWeight: 600 }}>{part}</mark>
        : part
    );
  };

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconFileText size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to a server to view logs</Text>
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
            <IconFileText size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Log Viewer</Title>
            <Text size="xs" c="dimmed">
              {selectedPreset ? selectedPreset.label : showCustomInput ? 'Custom Path' : 'Select a log source'}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          {logs.length > 0 && (
            <>
              <Badge variant="light" size="md" color="blue">
                {filteredLogs.length} / {logs.length} entries
              </Badge>
              {searchTerm && (
                <Badge variant="light" size="md" color="yellow">
                  Filtered
                </Badge>
              )}
            </>
          )}
        </Group>
      </Group>

      <Grid gutter="md" style={{ flex: 'none' }}>
        {/* Left Sidebar - Log Sources */}
        <Grid.Col span={{ base: 12, lg: 3 }}>
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)" h="100%">
            <Text fw={600} mb="md" size="sm">Log Sources</Text>
            <Stack gap="xs">
              {LOG_PRESETS.map((preset) => (
                <Paper
                  key={preset.id}
                  p="sm"
                  radius="md"
                  bg={selectedPreset?.id === preset.id ? `var(--mantine-color-${preset.color}-filled)` : 'var(--mantine-color-dark-5)'}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handlePresetClick(preset)}
                >
                  <Group gap="sm">
                    <ThemeIcon
                      variant={selectedPreset?.id === preset.id ? 'white' : 'light'}
                      color={selectedPreset?.id === preset.id ? preset.color : preset.color}
                      size="md"
                    >
                      {preset.icon}
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text
                        size="sm"
                        fw={600}
                        c={selectedPreset?.id === preset.id ? 'white' : undefined}
                      >
                        {preset.label}
                      </Text>
                      <Text
                        size="xs"
                        c={selectedPreset?.id === preset.id ? 'white' : 'dimmed'}
                        style={{ opacity: selectedPreset?.id === preset.id ? 0.9 : 1 }}
                      >
                        {preset.description}
                      </Text>
                    </Box>
                  </Group>
                </Paper>
              ))}

              {/* Custom Path Option */}
              <Paper
                p="sm"
                radius="md"
                bg={showCustomInput ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-dark-5)'}
                style={{ cursor: 'pointer' }}
                onClick={handleCustomSelect}
              >
                <Group gap="sm">
                  <ThemeIcon
                    variant={showCustomInput ? 'white' : 'light'}
                    color={showCustomInput ? 'blue' : 'gray'}
                    size="md"
                  >
                    <IconTerminal size={18} />
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text
                      size="sm"
                      fw={600}
                      c={showCustomInput ? 'white' : undefined}
                    >
                      Custom Path
                    </Text>
                    <Text
                      size="xs"
                      c={showCustomInput ? 'white' : 'dimmed'}
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
                    size="xs"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomLoad()}
                  />
                  <Button
                    size="xs"
                    fullWidth
                    onClick={handleCustomLoad}
                    loading={loading}
                    variant="filled"
                  >
                    Load Log File
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right - Log Output */}
        <Grid.Col span={{ base: 12, lg: 9 }}>
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 280px)' }}>
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
                />
                <Checkbox
                  label="Auto-scroll"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  size="xs"
                />
              </Group>
              <Group gap="xs">
                <Tooltip label="Copy to clipboard">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={handleCopy}
                    disabled={!logs.length}
                  >
                    <IconCopy size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Download">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={handleDownload}
                    disabled={!logs.length}
                  >
                    <IconDownload size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Clear">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleClear}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
                <Divider orientation="vertical" />
                <Tooltip label="Refresh">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => selectedPreset && fetchLogs(selectedPreset.type, selectedPreset.value || customPath)}
                    loading={loading}
                  >
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Divider mb="md" />

            {/* Log Content */}
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              {loading && logs.length === 0 ? (
                <Center h="100%">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading logs...</Text>
                  </Stack>
                </Center>
              ) : error ? (
                <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-red-9)" h="100%">
                  <Stack align="center" gap="md">
                    <ThemeIcon size="lg" variant="filled" color="red">
                      <IconFileText size={24} />
                    </ThemeIcon>
                    <Text c="red.2" fw={600}>Unable to load logs</Text>
                    <Text c="red.4" size="sm" ta="center">{error}</Text>
                    <Text c="red.6" size="xs" ta="center">
                      Tip: Try a different log source or check if the service is running.
                    </Text>
                  </Stack>
                </Paper>
              ) : logs.length > 0 ? (
                <ScrollArea.Autosize style={{ height: '100%' }}>
                  <Box
                    component="pre"
                    p="md"
                    bg="var(--mantine-color-dark-8)"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1.7,
                      minWidth: '100%',
                      borderRadius: 'var(--mantine-radius-md)',
                    }}
                  >
                    {filteredLogs.map((line, i) => (
                      <Box key={i} style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--mantine-color-dark-6)', paddingBottom: 4, marginBottom: 4 }}>
                        <Text
                          component="span"
                          c="dimmed"
                          style={{
                            minWidth: 48,
                            textAlign: 'right',
                            userSelect: 'none',
                            flexShrink: 0,
                            fontSize: 11,
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
                            color: line.toLowerCase().includes('error') ? 'var(--mantine-color-red-4)' :
                                   line.toLowerCase().includes('warn') ? 'var(--mantine-color-yellow-4)' :
                                   line.toLowerCase().includes('fail') ? 'var(--mantine-color-orange-4)' :
                                   'var(--mantine-color-gray-3)',
                          }}
                        >
                          {highlightSearch(line)}
                        </Text>
                      </Box>
                    ))}
                    <div ref={logsEndRef} />
                  </Box>
                </ScrollArea.Autosize>
              ) : (
                <Center h="100%">
                  <Stack align="center" gap="md">
                    <ThemeIcon size="xl" variant="light" color="gray">
                      <IconFileText size={32} />
                    </ThemeIcon>
                    <Text c="dimmed" fw={500}>
                      {showCustomInput ? 'Enter a path and click Load to view logs' : 'Select a log source to view entries'}
                    </Text>
                    {!showCustomInput && (
                      <Text c="dimmed" size="sm">
                        Or choose Custom Path to load a specific file
                      </Text>
                    )}
                  </Stack>
                </Center>
              )}
            </Box>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
