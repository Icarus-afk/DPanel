import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Box,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  Button,
  Badge,
  Modal,
  ScrollArea,
  Divider,
  Tabs,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  SimpleGrid,
  Code,
} from '@mantine/core';
import {
  IconBrandUbuntu,
  IconPackage,
  IconShield,
  IconServer,
  IconFileText,
  IconRefresh,
  IconCopy,
  IconTerminal,
  IconWorld,
  IconPlayerPlay,
  IconCheck,
  IconX,
} from '@tabler/icons-react';

interface QuickCommand {
  id: string;
  label: string;
  command: string;
  description: string;
  icon: React.ReactNode;
  category: 'system' | 'docker' | 'network' | 'services' | 'logs';
  requiresSudo: boolean;
  color: string;
}

const UBUNTU_COMMANDS: QuickCommand[] = [
  // System Updates
  {
    id: 'apt-update',
    label: 'Update Packages',
    command: 'sudo apt update',
    description: 'Update package lists',
    icon: <IconRefresh size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'blue',
  },
  {
    id: 'apt-upgrade',
    label: 'Upgrade Packages',
    command: 'sudo apt upgrade -y',
    description: 'Upgrade all installed packages',
    icon: <IconPackage size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'blue',
  },
  {
    id: 'apt-dist-upgrade',
    label: 'Dist Upgrade',
    command: 'sudo apt dist-upgrade -y',
    description: 'Handle changing dependencies',
    icon: <IconPackage size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'blue',
  },
  {
    id: 'apt-autoremove',
    label: 'Auto Remove',
    command: 'sudo apt autoremove -y',
    description: 'Remove unused packages',
    icon: <IconPackage size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'blue',
  },
  {
    id: 'check-updates',
    label: 'Check Updates',
    command: 'apt list --upgradable',
    description: 'List available updates',
    icon: <IconRefresh size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'blue',
  },
  {
    id: 'disk-usage',
    label: 'Disk Usage',
    command: 'df -h',
    description: 'Show disk usage',
    icon: <IconServer size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'cyan',
  },
  {
    id: 'memory-usage',
    label: 'Memory Usage',
    command: 'free -h',
    description: 'Show memory usage',
    icon: <IconServer size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'cyan',
  },
  {
    id: 'cpu-info',
    label: 'CPU Info',
    command: 'lscpu | grep -E "Model name|CPU\\(s\\)|Architecture"',
    description: 'Show CPU information',
    icon: <IconServer size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'cyan',
  },
  {
    id: 'uptime',
    label: 'System Uptime',
    command: 'uptime',
    description: 'Show uptime and load',
    icon: <IconServer size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'cyan',
  },
  {
    id: 'top-processes',
    label: 'Top Processes',
    command: 'ps aux --sort=-%mem | head -11',
    description: 'Top 10 memory processes',
    icon: <IconServer size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'cyan',
  },

  // Firewall (UFW)
  {
    id: 'ufw-status',
    label: 'Firewall Status',
    command: 'sudo ufw status verbose',
    description: 'Show firewall status',
    icon: <IconShield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'green',
  },
  {
    id: 'ufw-enable',
    label: 'Enable Firewall',
    command: 'sudo ufw enable',
    description: 'Enable the firewall',
    icon: <IconShield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'green',
  },
  {
    id: 'ufw-allow-ssh',
    label: 'Allow SSH',
    command: 'sudo ufw allow ssh',
    description: 'Allow SSH (port 22)',
    icon: <IconShield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'green',
  },
  {
    id: 'ufw-allow-http',
    label: 'Allow HTTP/HTTPS',
    command: 'sudo ufw allow http && sudo ufw allow https',
    description: 'Allow web traffic',
    icon: <IconShield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'green',
  },

  // Docker
  {
    id: 'docker-ps',
    label: 'Running Containers',
    command: 'docker ps',
    description: 'List running containers',
    icon: <IconTerminal size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
  },
  {
    id: 'docker-ps-a',
    label: 'All Containers',
    command: 'docker ps -a',
    description: 'List all containers',
    icon: <IconTerminal size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
  },
  {
    id: 'docker-images',
    label: 'Docker Images',
    command: 'docker images',
    description: 'List Docker images',
    icon: <IconTerminal size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
  },
  {
    id: 'docker-system',
    label: 'Docker System',
    command: 'docker system df',
    description: 'Show Docker disk usage',
    icon: <IconTerminal size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
  },
  {
    id: 'docker-prune',
    label: 'Docker Prune',
    command: 'docker system prune -a',
    description: 'Remove unused data',
    icon: <IconTerminal size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
  },

  // Services
  {
    id: 'systemd-failed',
    label: 'Failed Services',
    command: 'systemctl --failed',
    description: 'List failed services',
    icon: <IconServer size={18} />,
    category: 'services',
    requiresSudo: false,
    color: 'orange',
  },
  {
    id: 'docker-status',
    label: 'Docker Service',
    command: 'sudo systemctl status docker --no-pager',
    description: 'Check Docker status',
    icon: <IconServer size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'orange',
  },
  {
    id: 'nginx-status',
    label: 'Nginx Service',
    command: 'sudo systemctl status nginx --no-pager',
    description: 'Check Nginx status',
    icon: <IconWorld size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'orange',
  },
  {
    id: 'ssh-status',
    label: 'SSH Service',
    command: 'sudo systemctl status sshd --no-pager',
    description: 'Check SSH status',
    icon: <IconServer size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'orange',
  },

  // Logs
  {
    id: 'last-logins',
    label: 'Recent Logins',
    command: 'last -n 10',
    description: 'Show recent logins',
    icon: <IconFileText size={18} />,
    category: 'logs',
    requiresSudo: false,
    color: 'pink',
  },
  {
    id: 'auth-log',
    label: 'Auth Log',
    command: 'sudo tail -50 /var/log/auth.log',
    description: 'Authentication logs',
    icon: <IconFileText size={18} />,
    category: 'logs',
    requiresSudo: true,
    color: 'pink',
  },
  {
    id: 'syslog',
    label: 'System Log',
    command: 'sudo tail -50 /var/log/syslog',
    description: 'System logs',
    icon: <IconFileText size={18} />,
    category: 'logs',
    requiresSudo: true,
    color: 'pink',
  },
  {
    id: 'disk-errors',
    label: 'Disk Errors',
    command: 'dmesg | grep -i error | tail -20',
    description: 'Show disk errors',
    icon: <IconFileText size={18} />,
    category: 'logs',
    requiresSudo: false,
    color: 'pink',
  },
];

const CATEGORY_CONFIG = {
  all: { label: 'All Commands', icon: IconBrandUbuntu, color: 'blue' },
  system: { label: 'System', icon: IconPackage, color: 'blue' },
  network: { label: 'Network', icon: IconShield, color: 'green' },
  docker: { label: 'Docker', icon: IconTerminal, color: 'violet' },
  services: { label: 'Services', icon: IconServer, color: 'orange' },
  logs: { label: 'Logs', icon: IconFileText, color: 'pink' },
};

export default function QuickCommands() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [showOutput, setShowOutput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [executedCommand, setExecutedCommand] = useState<string>('');

  const executeCommand = async (cmd: QuickCommand) => {
    if (!isConnected) {
      addToast('Not connected to server', 'error');
      return;
    }

    setLoading(cmd.id);
    setExecutedCommand(cmd.command);
    try {
      const result = await invoke('execute_command', { command: cmd.command });
      const resultStr = String(result);
      setOutput(resultStr);
      setShowOutput(true);
      addToast(`Command executed: ${cmd.label}`, 'success');
    } catch (error: any) {
      addToast(`Command failed: ${error.message || String(error)}`, 'error');
      setOutput(String(error));
      setShowOutput(true);
    } finally {
      setLoading(null);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
    addToast('Output copied to clipboard', 'success');
  };

  const filteredCommands = selectedCategory === 'all'
    ? UBUNTU_COMMANDS
    : UBUNTU_COMMANDS.filter(cmd => cmd.category === selectedCategory);

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconTerminal size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to a server to use quick commands</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconBrandUbuntu size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Quick Commands</Title>
            <Text size="xs" c="dimmed">Ubuntu Server Management</Text>
          </Stack>
        </Group>
        <Badge variant="light" size="md" color="blue">
          {filteredCommands.length} commands
        </Badge>
      </Group>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(value) => value && setSelectedCategory(value)}
        variant="pills"
      >
        <Tabs.List grow>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Tabs.Tab key={key} value={key} leftSection={<Icon size={14} />}>
                {config.label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs>

      {/* Commands Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" verticalSpacing="md">
        {filteredCommands.map((cmd) => (
          <Paper
            key={cmd.id}
            withBorder
            p="md"
            radius="md"
            bg="var(--mantine-color-dark-6)"
            style={{
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon variant="light" color={cmd.color} size="md">
                    {cmd.icon}
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text fw={600} size="sm">{cmd.label}</Text>
                    <Text size="xs" c="dimmed">{cmd.description}</Text>
                  </Stack>
                </Group>
                {cmd.requiresSudo && (
                  <Badge size="sm" variant="light" color="orange">
                    sudo
                  </Badge>
                )}
              </Group>

              <Code block bg="var(--mantine-color-dark-8)" p="xs" style={{ fontSize: 11 }}>
                {cmd.command}
              </Code>

              <Button
                fullWidth
                variant={loading === cmd.id ? 'filled' : 'light'}
                color={cmd.color}
                size="sm"
                onClick={() => executeCommand(cmd)}
                loading={loading === cmd.id}
                leftSection={loading === cmd.id ? null : <IconPlayerPlay size={14} />}
              >
                {loading === cmd.id ? 'Running...' : 'Run Command'}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Output Modal */}
      <Modal
        opened={showOutput}
        onClose={() => setShowOutput(false)}
        title={null}
        size="xl"
        centered
        styles={{
          content: {
            backgroundColor: 'var(--mantine-color-dark-7)',
          },
        }}
      >
        <Stack gap="md">
          {/* Modal Header */}
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon
                size="md"
                variant={loading ? 'light' : 'filled'}
                color={loading ? 'blue' : output.includes('error') || output.includes('Error') ? 'red' : 'green'}
              >
                {loading ? <IconRefresh size={16} /> : output.includes('error') || output.includes('Error') ? <IconX size={16} /> : <IconCheck size={16} />}
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={600} size="sm">
                  {loading ? 'Executing Command' : 'Command Output'}
                </Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                  {executedCommand}
                </Text>
              </Stack>
            </Group>
            <Group gap="xs">
              <Tooltip label="Copy output">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={handleCopyOutput}
                  disabled={!output || !!loading}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() => setShowOutput(false)}
              >
                Close
              </Button>
            </Group>
          </Group>

          <Divider />

          {/* Output Area */}
          <ScrollArea.Autosize mah={500}>
            <Box
              component="pre"
              p="md"
              bg="var(--mantine-color-dark-8)"
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                borderRadius: 'var(--mantine-radius-md)',
                minHeight: 200,
              }}
            >
              {loading ? (
                <Group gap="sm">
                  <IconRefresh size={16} className="animate-spin" />
                  <Text c="dimmed">Executing command...</Text>
                </Group>
              ) : (
                <Text
                  component="span"
                  c={output.includes('error') || output.includes('Error') ? 'red.4' : 'gray.3'}
                  style={{ fontFamily: 'monospace' }}
                >
                  {output}
                </Text>
              )}
            </Box>
          </ScrollArea.Autosize>
        </Stack>
      </Modal>
    </Stack>
  );
}
