import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Stack, UnstyledButton, Group, Text, Tooltip, Divider } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconBrandDocker,
  IconSettings,
  IconWorld,
  IconClock,
  IconFileStack,
  IconTerminal,
  IconShield,
  IconUsers,
  IconTopologyStar,
} from '@tabler/icons-react';
import { useServer } from '../../context/ServerContext';
import logo from '../../assets/logo.png';

type View = 'dashboard' | 'docker' | 'services' | 'nginx' | 'cron' | 'logs' | 'commands' | 'firewall' | 'users' | 'infrastructure';

interface NavigationRailProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={20} /> },
  { id: 'docker', label: 'Docker', icon: <IconBrandDocker size={20} /> },
  { id: 'services', label: 'Services', icon: <IconSettings size={20} /> },
  { id: 'nginx', label: 'Nginx', icon: <IconWorld size={20} /> },
  { id: 'cron', label: 'Cron', icon: <IconClock size={20} /> },
  { id: 'logs', label: 'Logs', icon: <IconFileStack size={20} /> },
  { id: 'commands', label: 'Commands', icon: <IconTerminal size={20} /> },
  { id: 'firewall', label: 'Firewall', icon: <IconShield size={20} /> },
  { id: 'users', label: 'Users', icon: <IconUsers size={20} /> },
  { id: 'infrastructure', label: 'Infrastructure', icon: <IconTopologyStar size={20} /> },
];

const SIDEBAR_TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0.0, 0.2, 1],
};

export function NavigationRail({ currentView, onViewChange }: NavigationRailProps) {
  const [expanded, setExpanded] = useState(false);
  const { isConnected } = useServer();

  return (
    <motion.div
      style={{
        width: expanded ? 240 : 72,
        height: '100vh',
        background: '#0a0a0a',
        borderRight: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
      animate={{ width: expanded ? 240 : 72 }}
      transition={SIDEBAR_TRANSITION}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo Section */}
      <Box style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <Group gap="md" justify="center" wrap="nowrap">
          <Box
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={logo}
              alt="DPanel"
              style={{
                width: 40,
                height: 40,
                objectFit: 'contain',
              }}
            />
          </Box>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={SIDEBAR_TRANSITION}
                style={{ overflow: 'hidden' }}
              >
                <Text
                  size="xl"
                  fw={800}
                  c="white"
                  style={{ letterSpacing: '-1px', whiteSpace: 'nowrap' }}
                >
                  DPanel
                </Text>
              </motion.div>
            )}
          </AnimatePresence>
        </Group>
      </Box>

      <Divider my="xs" style={{ borderColor: '#1a1a1a' }} />

      {/* Navigation Items */}
      <Stack gap={2} style={{ padding: '8px', flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = currentView === item.id;

          return (
            <Tooltip
              key={item.id}
              label={!expanded ? item.label : ''}
              position="right"
              withArrow
              arrowSize={6}
              disabled={expanded}
            >
              <UnstyledButton
                onClick={() => isConnected && onViewChange(item.id)}
                disabled={!isConnected}
                style={{ width: '100%' }}
              >
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: isActive ? '#1a1a1a' : 'transparent',
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    opacity: isConnected ? 1 : 0.5,
                    transition: 'background 0.15s ease',
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => {
                    if (isConnected && !isActive) {
                      e.currentTarget.style.background = '#151515';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isConnected && !isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      background: isActive ? '#ffffff' : 'transparent',
                      flexShrink: 0,
                    }}
                  >
                    <Box style={{ color: isActive ? '#000000' : '#888888' }}>
                      {item.icon}
                    </Box>
                  </Box>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={SIDEBAR_TRANSITION}
                        style={{ overflow: 'hidden' }}
                      >
                        <Text
                          size="sm"
                          fw={isActive ? 600 : 500}
                          c={isActive ? 'white' : 'dimmed'}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {item.label}
                        </Text>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Box>
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </Stack>
    </motion.div>
  );
}
