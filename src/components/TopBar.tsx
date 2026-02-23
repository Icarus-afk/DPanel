import { Group, Text, Button } from '@mantine/core';
import { IconLogout, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useServer } from '../context/ServerContext';
import { invoke } from '@tauri-apps/api/core';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { activeServer, isConnected, setIsConnected, setActiveServer } = useServer();

  const handleDisconnect = async () => {
    try {
      await invoke('disconnect_server');
      setIsConnected(false);
      setActiveServer(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="xs">
        <Button variant="subtle" size="compact-sm" onClick={onMenuClick} visibleFrom="sm">
          ☰
        </Button>
        {activeServer ? (
          <Group gap="xs">
            <Text fw={500}>{activeServer.name}</Text>
            <Text size="sm" c="dimmed">
              {activeServer.host}:{activeServer.port}
            </Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">Not connected</Text>
        )}
      </Group>

      <Group gap="xs">
        {isConnected ? (
          <>
            <Group gap="xs">
              <IconWifi size={16} stroke={1.5} color="var(--mantine-color-green-filled)" />
              <Text size="sm" c="green.4">Connected</Text>
            </Group>
            <Button
              variant="subtle"
              size="compact-sm"
              color="red"
              onClick={handleDisconnect}
              leftSection={<IconLogout size={16} />}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Group gap="xs">
            <IconWifiOff size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">Disconnected</Text>
          </Group>
        )}
      </Group>
    </Group>
  );
}
