import { Box, Group, Text, Badge, ActionIcon } from '@mantine/core';
import { Icons } from '../../lib/icons';
import { useServer } from '../../context/ServerContext';

interface TopBarProps {
  onDisconnect: () => void;
}

export function TopBar({ onDisconnect }: TopBarProps) {
  const { isConnected, activeServer } = useServer();

  return (
    <Box className="topbar">
      {/* Left Section - Server Status */}
      <Group gap="md">
        {isConnected && activeServer && (
          <Box
            className="topbar__server-status"
            style={{
              background: 'hsl(var(--bg-secondary))',
              border: '1px solid hsl(var(--border-subtle))',
            }}
          >
            <Box
              className="topbar__status-indicator topbar__status-indicator--connected"
              style={{
                background: isConnected ? 'hsl(var(--success))' : 'hsl(var(--error))',
                boxShadow: isConnected ? '0 0 8px hsl(var(--success-glow))' : '0 0 8px hsl(var(--error-glow))',
              }}
            />

            <div className="topbar__server-info">
              <Text size="xs" c="var(--text-tertiary)" fw={500}>
                Server
              </Text>
              <Text size="sm" fw={600} c="var(--text-primary)">
                {activeServer.name}
              </Text>
            </div>

            <Badge
              size="sm"
              variant="light"
              className={`topbar__status-badge ${isConnected ? 'topbar__status-badge--connected' : 'topbar__status-badge--disconnected'}`}
              style={{
                background: isConnected ? 'hsl(var(--success-subtle))' : 'hsl(var(--error-subtle))',
                color: isConnected ? 'hsl(var(--success))' : 'hsl(var(--error))',
              }}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Box>
        )}
      </Group>

      {/* Center Section - Search */}
      <Box className="topbar__center">
        <Box
          className="topbar__search"
          style={{
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-subtle))',
          }}
        >
          <Icons.Search className="topbar__search-icon" size={18} />
          <Text size="sm" c="var(--text-tertiary)" style={{ flex: 1 }}>
            Search...
          </Text>
          <Box
            className="topbar__search-shortcut"
            style={{
              background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-default))',
            }}
          >
            ⌘K
          </Box>
        </Box>
      </Box>

      {/* Right Section - Actions */}
      <Group gap="sm">
        {/* Notifications - Commented out for now
        <ActionIcon
          size="lg"
          variant="light"
          className="topbar__action"
          style={{
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-subtle))',
            color: 'hsl(var(--text-secondary))',
          }}
        >
          <Box style={{ position: 'relative' }}>
            <Icons.Bell size={20} />
            <Box className="topbar__notification-dot" />
          </Box>
        </ActionIcon>

        Settings
        <ActionIcon
          size="lg"
          variant="light"
          className="topbar__action"
          style={{
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--border-subtle))',
            color: 'hsl(var(--text-secondary))',
          }}
        >
          <Icons.Settings size={20} />
        </ActionIcon>
        */}

        {/* Disconnect Button */}
        {isConnected && (
          <Box
            className="topbar__disconnect"
            onClick={onDisconnect}
            style={{
              background: 'hsl(var(--error-subtle))',
              border: '1px solid hsl(var(--error-border))',
              color: 'hsl(var(--error))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--error))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--error-border))';
            }}
          >
            <Icons.WifiOff size={18} />
            <Text size="sm" fw={600}>
              Disconnect
            </Text>
          </Box>
        )}
      </Group>
    </Box>
  );
}
