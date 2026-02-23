import { Group, Text, UnstyledButton, Stack, Divider, Box } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconBrandDocker,
  IconFileStack,
  IconServer,
  IconTerminal,
  IconShield,
  IconSettings,
  IconWorld,
  IconClock
} from '@tabler/icons-react';
import { useServer } from '../context/ServerContext';

type View = 'dashboard' | 'docker' | 'services' | 'nginx' | 'cron' | 'logs' | 'commands' | 'firewall';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={18} /> },
  { id: 'docker', label: 'Docker', icon: <IconBrandDocker size={18} /> },
  { id: 'services', label: 'Services', icon: <IconSettings size={18} /> },
  { id: 'nginx', label: 'Nginx', icon: <IconWorld size={18} /> },
  { id: 'cron', label: 'Cron', icon: <IconClock size={18} /> },
  { id: 'logs', label: 'Logs', icon: <IconFileStack size={18} /> },
  { id: 'commands', label: 'Quick Commands', icon: <IconTerminal size={18} /> },
  { id: 'firewall', label: 'Firewall', icon: <IconShield size={18} /> },
];

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { activeServer, isConnected } = useServer();

  return (
    <Stack gap="xs" h="100%">
      <Box mb="lg">
        <Group gap="xs">
          <IconServer size={24} stroke={1.5} />
          <Text fw={600} size="lg">DPanel</Text>
        </Group>
      </Box>

      <Divider my="xs" />

      {activeServer && (
        <Box mb="md">
          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
            Connected Server
          </Text>
          <Text size="sm" fw={500} mt={4}>
            {activeServer.name}
          </Text>
          <Text size="xs" c="dimmed">
            {activeServer.host}:{activeServer.port}
          </Text>
        </Box>
      )}

      <Divider my="xs" />

      <Stack gap={2}>
        {menuItems.map((item) => (
          <UnstyledButton
            key={item.id}
            onClick={() => onViewChange(item.id)}
            disabled={!isConnected}
            style={{
              backgroundColor: currentView === item.id ? 'var(--mantine-color-blue-filled)' : 'transparent',
              borderRadius: 'var(--mantine-radius-md)',
              padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
              cursor: !isConnected ? 'not-allowed' : 'pointer',
              opacity: !isConnected ? 0.5 : 1,
            }}
          >
            <Group gap="sm">
              <Box
                style={{
                  color: currentView === item.id ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
                }}
              >
                {item.icon}
              </Box>
              <Text
                size="sm"
                fw={500}
                style={{
                  color: currentView === item.id ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
                }}
              >
                {item.label}
              </Text>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Stack>
  );
}
