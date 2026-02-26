import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import {
  Box,
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
  SimpleGrid,
  Code,
  Card,
} from '@mantine/core';
import { Icons } from '../lib/icons';

interface QuickCommand {
  id: string;
  label: string;
  command: string;
  description: string;
  icon: React.ReactNode;
  category: 'system' | 'docker' | 'network' | 'services' | 'logs';
  requiresSudo: boolean;
  color: string;
  colorVar: string;
}

const UBUNTU_COMMANDS: QuickCommand[] = [
  // System Updates
  {
    id: 'apt-update',
    label: 'Update Packages',
    command: 'sudo apt update',
    description: 'Update package lists',
    icon: <Icons.Refresh size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'primary',
    colorVar: 'primary',
  },
  {
    id: 'apt-upgrade',
    label: 'Upgrade Packages',
    command: 'sudo apt upgrade -y',
    description: 'Upgrade all installed packages',
    icon: <Icons.Package size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'primary',
    colorVar: 'primary',
  },
  {
    id: 'apt-dist-upgrade',
    label: 'Dist Upgrade',
    command: 'sudo apt dist-upgrade -y',
    description: 'Handle changing dependencies',
    icon: <Icons.Package size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'primary',
    colorVar: 'primary',
  },
  {
    id: 'apt-autoremove',
    label: 'Auto Remove',
    command: 'sudo apt autoremove -y',
    description: 'Remove unused packages',
    icon: <Icons.Package size={18} />,
    category: 'system',
    requiresSudo: true,
    color: 'primary',
    colorVar: 'primary',
  },
  {
    id: 'check-updates',
    label: 'Check Updates',
    command: 'apt list --upgradable',
    description: 'List available updates',
    icon: <Icons.Refresh size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'primary',
    colorVar: 'primary',
  },
  {
    id: 'disk-usage',
    label: 'Disk Usage',
    command: 'df -h',
    description: 'Show disk usage',
    icon: <Icons.Server size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'info',
    colorVar: 'info',
  },
  {
    id: 'memory-usage',
    label: 'Memory Usage',
    command: 'free -h',
    description: 'Show memory usage',
    icon: <Icons.Database size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'info',
    colorVar: 'info',
  },
  {
    id: 'cpu-info',
    label: 'CPU Info',
    command: 'lscpu | grep -E "Model name|CPU\\(s\\)|Architecture"',
    description: 'Show CPU information',
    icon: <Icons.Cpu size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'info',
    colorVar: 'info',
  },
  {
    id: 'uptime',
    label: 'System Uptime',
    command: 'uptime',
    description: 'Show uptime and load',
    icon: <Icons.Clock size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'info',
    colorVar: 'info',
  },
  {
    id: 'top-processes',
    label: 'Top Processes',
    command: 'ps aux --sort=-%mem | head -11',
    description: 'Top 10 memory processes',
    icon: <Icons.Activity size={18} />,
    category: 'system',
    requiresSudo: false,
    color: 'info',
    colorVar: 'info',
  },

  // Firewall (UFW)
  {
    id: 'ufw-status',
    label: 'Firewall Status',
    command: 'sudo ufw status verbose',
    description: 'Show firewall status',
    icon: <Icons.Shield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'success',
    colorVar: 'success',
  },
  {
    id: 'ufw-enable',
    label: 'Enable Firewall',
    command: 'sudo ufw enable',
    description: 'Enable the firewall',
    icon: <Icons.Shield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'success',
    colorVar: 'success',
  },
  {
    id: 'ufw-allow-ssh',
    label: 'Allow SSH',
    command: 'sudo ufw allow ssh',
    description: 'Allow SSH (port 22)',
    icon: <Icons.Shield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'success',
    colorVar: 'success',
  },
  {
    id: 'ufw-allow-http',
    label: 'Allow HTTP/HTTPS',
    command: 'sudo ufw allow http && sudo ufw allow https',
    description: 'Allow web traffic',
    icon: <Icons.Shield size={18} />,
    category: 'network',
    requiresSudo: true,
    color: 'success',
    colorVar: 'success',
  },

  // Docker
  {
    id: 'docker-ps',
    label: 'Running Containers',
    command: 'docker ps',
    description: 'List running containers',
    icon: <Icons.Container size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
    colorVar: 'chart-6',
  },
  {
    id: 'docker-ps-a',
    label: 'All Containers',
    command: 'docker ps -a',
    description: 'List all containers',
    icon: <Icons.Container size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
    colorVar: 'chart-6',
  },
  {
    id: 'docker-images',
    label: 'Docker Images',
    command: 'docker images',
    description: 'List Docker images',
    icon: <Icons.Box size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
    colorVar: 'chart-6',
  },
  {
    id: 'docker-system',
    label: 'Docker System',
    command: 'docker system df',
    description: 'Show Docker disk usage',
    icon: <Icons.Database size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
    colorVar: 'chart-6',
  },
  {
    id: 'docker-prune',
    label: 'Docker Prune',
    command: 'docker system prune -a',
    description: 'Remove unused data',
    icon: <Icons.Trash size={18} />,
    category: 'docker',
    requiresSudo: false,
    color: 'violet',
    colorVar: 'chart-6',
  },

  // Services
  {
    id: 'systemd-failed',
    label: 'Failed Services',
    command: 'systemctl --failed',
    description: 'List failed services',
    icon: <Icons.AlertTriangle size={18} />,
    category: 'services',
    requiresSudo: false,
    color: 'warning',
    colorVar: 'warning',
  },
  {
    id: 'docker-status',
    label: 'Docker Service',
    command: 'sudo systemctl status docker --no-pager',
    description: 'Check Docker status',
    icon: <Icons.Container size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'warning',
    colorVar: 'warning',
  },
  {
    id: 'nginx-status',
    label: 'Nginx Service',
    command: 'sudo systemctl status nginx --no-pager',
    description: 'Check Nginx status',
    icon: <Icons.World size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'warning',
    colorVar: 'warning',
  },
  {
    id: 'ssh-status',
    label: 'SSH Service',
    command: 'sudo systemctl status sshd --no-pager',
    description: 'Check SSH status',
    icon: <Icons.Server size={18} />,
    category: 'services',
    requiresSudo: true,
    color: 'warning',
    colorVar: 'warning',
  },

  // Logs
  {
    id: 'last-logins',
    label: 'Recent Logins',
    command: 'last -n 10',
    description: 'Show recent logins',
    icon: <Icons.Users size={18} />,
    category: 'logs',
    requiresSudo: false,
    color: 'pink',
    colorVar: 'chart-7',
  },
  {
    id: 'auth-log',
    label: 'Auth Log',
    command: 'sudo tail -50 /var/log/auth.log',
    description: 'Authentication logs',
    icon: <Icons.FileText size={18} />,
    category: 'logs',
    requiresSudo: true,
    color: 'pink',
    colorVar: 'chart-7',
  },
  {
    id: 'syslog',
    label: 'System Log',
    command: 'sudo tail -50 /var/log/syslog',
    description: 'System logs',
    icon: <Icons.FileText size={18} />,
    category: 'logs',
    requiresSudo: true,
    color: 'pink',
    colorVar: 'chart-7',
  },
  {
    id: 'disk-errors',
    label: 'Disk Errors',
    command: 'dmesg | grep -i error | tail -20',
    description: 'Show disk errors',
    icon: <Icons.AlertCircle size={18} />,
    category: 'logs',
    requiresSudo: false,
    color: 'pink',
    colorVar: 'chart-7',
  },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; colorVar: string }> = {
  all: { label: 'All Commands', icon: Icons.FileStack, color: 'primary', colorVar: 'primary' },
  system: { label: 'System', icon: Icons.Package, color: 'primary', colorVar: 'primary' },
  network: { label: 'Network', icon: Icons.Shield, color: 'success', colorVar: 'success' },
  docker: { label: 'Docker', icon: Icons.Container, color: 'violet', colorVar: 'chart-6' },
  services: { label: 'Services', icon: Icons.Server, color: 'warning', colorVar: 'warning' },
  logs: { label: 'Logs', icon: Icons.FileText, color: 'pink', colorVar: 'chart-7' },
};

const getColorSubtle = (colorVar: string) => {
  const colorMap: Record<string, string> = {
    primary: 'var(--primary-subtle)',
    success: 'var(--success-subtle)',
    warning: 'var(--warning-subtle)',
    error: 'var(--error-subtle)',
    info: 'var(--info-subtle)',
    'chart-6': 'hsl(var(--chart-6) / 0.1)',
    'chart-7': 'hsl(var(--chart-7) / 0.1)',
  };
  return colorMap[colorVar] || 'var(--bg-tertiary)';
};

const getColor = (colorVar: string) => {
  const colorMap: Record<string, string> = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--error)',
    info: 'var(--info)',
    'chart-6': 'hsl(var(--chart-6))',
    'chart-7': 'hsl(var(--chart-7))',
  };
  return colorMap[colorVar] || 'var(--text-secondary)';
};

const getColorBorder = (colorVar: string) => {
  const colorMap: Record<string, string> = {
    primary: 'var(--primary-border)',
    success: 'var(--success-border)',
    warning: 'var(--warning-border)',
    error: 'var(--error-border)',
    info: 'var(--info-border)',
    'chart-6': 'hsl(var(--chart-6) / 0.3)',
    'chart-7': 'hsl(var(--chart-7) / 0.3)',
  };
  return colorMap[colorVar] || 'var(--border-subtle)';
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
              <Icons.Terminal size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">Quick Commands</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to use quick commands
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
            <Icons.Terminal size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              Quick Commands
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              Ubuntu Server Management
            </Text>
          </Stack>
        </Group>
        <Badge
          size="sm"
          variant="light"
          style={{
            background: 'hsl(var(--primary-subtle))',
            color: 'hsl(var(--primary))',
            border: '1px solid hsl(var(--primary-border))',
          }}
        >
          {filteredCommands.length} commands
        </Badge>
      </Group>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(value) => value && setSelectedCategory(value)}
        variant="pills"
        style={{ marginBottom: 'var(--space-4)' }}
      >
        <Tabs.List>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Tabs.Tab
                key={key}
                value={key}
                leftSection={
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 'var(--radius-sm)',
                      background: getColorSubtle(config.colorVar),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getColor(config.colorVar),
                    }}
                  >
                    <Icon size={14} />
                  </Box>
                }
                style={{
                  color: selectedCategory === key ? 'white' : 'hsl(var(--text-secondary))',
                  background: selectedCategory === key ? `hsl(var(--${config.colorVar === 'primary' ? 'primary' : config.colorVar === 'success' ? 'success' : config.colorVar === 'warning' ? 'warning' : config.colorVar === 'chart-6' ? 'chart-6' : config.colorVar === 'chart-7' ? 'chart-7' : 'bg-tertiary'}))` : 'transparent',
                  border: `1px solid ${selectedCategory === key ? 'transparent' : 'hsl(var(--border-subtle))'}`,
                }}
              >
                {config.label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs>

      {/* Commands Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" verticalSpacing="md">
        {filteredCommands.map((cmd) => (
          <Card
            key={cmd.id}
            className="card card-hover"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Stack gap="sm" style={{ flex: 1 }}>
              <Group justify="space-between">
                <Group gap="sm">
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-md)',
                      background: getColorSubtle(cmd.colorVar),
                      border: `1px solid ${getColorBorder(cmd.colorVar)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getColor(cmd.colorVar),
                      flexShrink: 0,
                    }}
                  >
                    {cmd.icon}
                  </Box>
                  <Stack gap={0}>
                    <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>{cmd.label}</Text>
                    <Text size="xs" c="var(--text-tertiary)">{cmd.description}</Text>
                  </Stack>
                </Group>
                {cmd.requiresSudo && (
                  <Badge
                    size="sm"
                    variant="light"
                    style={{
                      background: 'hsl(var(--warning-subtle))',
                      color: 'hsl(var(--warning))',
                      border: '1px solid hsl(var(--warning-border))',
                    }}
                  >
                    sudo
                  </Badge>
                )}
              </Group>

              <Code
                block
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  color: 'hsl(var(--text-secondary))',
                  border: '1px solid hsl(var(--border-subtle))',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {cmd.command}
              </Code>

              <Button
                fullWidth
                variant={loading === cmd.id ? 'filled' : 'light'}
                size="sm"
                onClick={() => executeCommand(cmd)}
                loading={loading === cmd.id}
                leftSection={loading === cmd.id ? null : <Icons.Play size={14} />}
                style={{
                  marginTop: 'auto',
                  background: loading === cmd.id
                    ? `hsl(var(--${cmd.colorVar === 'primary' ? 'primary' : cmd.colorVar === 'success' ? 'success' : cmd.colorVar === 'warning' ? 'warning' : cmd.colorVar === 'chart-6' ? 'chart-6' : cmd.colorVar === 'chart-7' ? 'chart-7' : 'primary'}))`
                    : getColorSubtle(cmd.colorVar),
                  color: loading === cmd.id ? 'white' : getColor(cmd.colorVar),
                  border: `1px solid ${getColorBorder(cmd.colorVar)}`,
                }}
              >
                {loading === cmd.id ? 'Running...' : 'Run Command'}
              </Button>
            </Stack>
          </Card>
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
            backgroundColor: 'hsl(var(--bg-primary))',
            border: '1px solid hsl(var(--border-default))',
          },
          header: {
            borderBottom: '1px solid hsl(var(--border-subtle))',
            backgroundColor: 'hsl(var(--bg-primary))',
          },
          body: {
            backgroundColor: 'hsl(var(--bg-primary))',
          },
        }}
      >
        <Stack gap="md">
          {/* Modal Header */}
          <Group justify="space-between">
            <Group gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  background: loading
                    ? 'hsl(var(--primary-subtle))'
                    : output.includes('error') || output.includes('Error')
                      ? 'hsl(var(--error-subtle))'
                      : 'hsl(var(--success-subtle))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: loading
                    ? 'hsl(var(--primary))'
                    : output.includes('error') || output.includes('Error')
                      ? 'hsl(var(--error))'
                      : 'hsl(var(--success))',
                }}
              >
                {loading ? (
                  <Icons.Refresh size={16} className="animate-spin" />
                ) : output.includes('error') || output.includes('Error') ? (
                  <Icons.X size={16} />
                ) : (
                  <Icons.Check size={16} />
                )}
              </Box>
              <Stack gap={0}>
                <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>
                  {loading ? 'Executing Command' : 'Command Output'}
                </Text>
                <Text size="xs" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
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
                  style={{
                    background: 'hsl(var(--bg-tertiary))',
                    color: 'hsl(var(--text-secondary))',
                    border: '1px solid hsl(var(--border-subtle))',
                  }}
                >
                  <Icons.Copy size={16} />
                </ActionIcon>
              </Tooltip>
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() => setShowOutput(false)}
                style={{
                  background: 'hsl(var(--bg-tertiary))',
                  color: 'hsl(var(--text-primary))',
                  border: '1px solid hsl(var(--border-default))',
                }}
              >
                Close
              </Button>
            </Group>
          </Group>

          <Divider style={{ borderColor: 'hsl(var(--border-subtle))' }} />

          {/* Output Area */}
          <ScrollArea.Autosize mah={500}>
            <Box
              component="pre"
              p="md"
              style={{
                background: 'hsl(var(--bg-tertiary))',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-subtle))',
                minHeight: 200,
              }}
            >
              {loading ? (
                <Group gap="sm">
                  <Icons.Refresh size={16} className="animate-spin" />
                  <Text c="var(--text-tertiary)">Executing command...</Text>
                </Group>
              ) : (
                <Text
                  component="span"
                  c={output.includes('error') || output.includes('Error') ? 'var(--error)' : 'var(--text-secondary)'}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {output}
                </Text>
              )}
            </Box>
          </ScrollArea.Autosize>
        </Stack>
      </Modal>
    </div>
  );
}
