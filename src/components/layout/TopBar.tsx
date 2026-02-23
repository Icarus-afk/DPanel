import { Box, Group, Text, ThemeIcon, ActionIcon, Badge } from '@mantine/core';
import {
  IconWifi,
  IconWifiOff,
  IconSearch,
  IconBell,
  IconSettings,
} from '@tabler/icons-react';
import { useServer } from '../../context/ServerContext';

interface TopBarProps {
  onDisconnect: () => void;
}

export function TopBar({ onDisconnect }: TopBarProps) {
  const { isConnected, activeServer } = useServer();

  return (
    <Box
      style={{
        height: 64,
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left Section - Server Status */}
      <Group gap="md">
        {isConnected && activeServer && (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: '#111',
              borderRadius: '10px',
              border: '1px solid #222',
            }}
          >
            <ThemeIcon
              size="sm"
              variant="light"
              color={isConnected ? 'green' : 'red'}
              style={{
                background: isConnected ? '#10b981' : '#ef4444',
                color: '#fff',
              }}
            >
              {isConnected ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
            </ThemeIcon>
            
            <div>
              <Text size="xs" c="dimmed" fw={500}>
                Server
              </Text>
              <Text size="sm" fw={600} c="white">
                {activeServer.name}
              </Text>
            </div>

            <Badge
              size="sm"
              variant="light"
              color={isConnected ? 'green' : 'red'}
              style={{
                background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isConnected ? '#10b981' : '#ef4444',
              }}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Box>
        )}
      </Group>

      {/* Right Section - Actions */}
      <Group gap="sm">
        {/* Search Bar */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: '#111',
            borderRadius: '10px',
            border: '1px solid #222',
            minWidth: 280,
          }}
        >
          <IconSearch size={18} color="#666" />
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            Search...
          </Text>
          <Box
            style={{
              padding: '4px 8px',
              background: '#1a1a1a',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#666',
            }}
          >
            ⌘K
          </Box>
        </Box>

        {/* Notifications */}
        <ActionIcon
          size="lg"
          variant="light"
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: '10px',
          }}
        >
          <Box style={{ position: 'relative' }}>
            <IconBell size={20} color="#666" />
            <Box
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                background: '#ef4444',
                borderRadius: '50%',
                border: '2px solid #0a0a0a',
              }}
            />
          </Box>
        </ActionIcon>

        {/* Settings */}
        <ActionIcon
          size="lg"
          variant="light"
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: '10px',
          }}
        >
          <IconSettings size={20} color="#666" />
        </ActionIcon>

        {/* Disconnect Button */}
        {isConnected && (
          <Box
            onClick={onDisconnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <IconWifiOff size={18} color="#ef4444" />
            <Text size="sm" fw={600} c="#ef4444">
              Disconnect
            </Text>
          </Box>
        )}
      </Group>
    </Box>
  );
}
