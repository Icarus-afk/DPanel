import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Stack, UnstyledButton, Group, Text, Tooltip, Divider } from '@mantine/core';
import { useServer } from '../../context/ServerContext';
import { Icons } from '../../lib/icons';
import logo from '../../assets/logo.png';

type View = 'dashboard' | 'docker' | 'services' | 'nginx' | 'cron' | 'logs' | 'commands' | 'firewall' | 'users' | 'infrastructure';

interface NavigationRailProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard size={20} /> },
  { id: 'docker', label: 'Docker', icon: <Icons.Docker size={20} /> },
  { id: 'services', label: 'Services', icon: <Icons.Settings size={20} /> },
  { id: 'nginx', label: 'Nginx', icon: <Icons.World size={20} /> },
  { id: 'cron', label: 'Cron', icon: <Icons.Clock size={20} /> },
  { id: 'logs', label: 'Logs', icon: <Icons.FileStack size={20} /> },
  { id: 'commands', label: 'Commands', icon: <Icons.Terminal size={20} /> },
  { id: 'firewall', label: 'Firewall', icon: <Icons.Shield size={20} /> },
  { id: 'users', label: 'Users', icon: <Icons.Users size={20} /> },
  { id: 'infrastructure', label: 'Infrastructure', icon: <Icons.TopologyStar size={20} /> },
];

const SIDEBAR_TRANSITION = {
  duration: 0.3,
  ease: [0.4, 0.0, 0.2, 1],
};

export function NavigationRail({ currentView, onViewChange }: NavigationRailProps) {
  const [expanded, setExpanded] = useState(false);
  const { isConnected } = useServer();

  return (
    <motion.nav
      className="nav-rail"
      style={{
        width: expanded ? 260 : 72,
      }}
      animate={{ width: expanded ? 260 : 72 }}
      transition={SIDEBAR_TRANSITION}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo Section */}
      <Box className="nav-rail__header">
        <Group gap="md" justify="center" wrap="nowrap">
          <Box className="nav-rail__logo">
            <img src={logo} alt="DPanel" style={{ width: 40, height: 40, objectFit: 'contain' }} />
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
                  c="var(--text-primary)"
                  style={{ letterSpacing: '-1px', whiteSpace: 'nowrap' }}
                >
                  DPanel
                </Text>
              </motion.div>
            )}
          </AnimatePresence>
        </Group>
      </Box>

      <Divider my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />

      {/* Navigation Items */}
      <Stack gap={2} className="nav-rail__body">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const isDisabled = !isConnected;

          return (
            <Tooltip
              key={item.id}
              label={!expanded ? item.label : ''}
              position="right"
              withArrow
              arrowSize={6}
              disabled={expanded}
              transitionProps={{ duration: 100 }}
            >
              <UnstyledButton
                onClick={() => !isDisabled && onViewChange(item.id)}
                disabled={isDisabled}
                style={{ width: '100%' }}
              >
                <Box
                  className={`nav-item ${isActive ? 'nav-item--active' : ''} ${isDisabled ? 'nav-item--disabled' : ''}`}
                  style={{
                    background: isActive && expanded ? 'hsl(var(--bg-elevated))' : 'transparent',
                    border: isActive && expanded ? '1px solid hsl(var(--border-default))' : '1px solid transparent',
                    color: isActive ? 'hsl(var(--text-primary))' : 'hsl(var(--text-tertiary))',
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    position: 'relative',
                  }}
                >
                  <Box
                    className="nav-item__icon"
                    style={{
                      background: isActive ? 'hsl(var(--primary))' : 'transparent',
                      color: isActive ? 'white' : 'currentColor',
                      boxShadow: isActive ? 'var(--shadow-glow-primary)' : 'none',
                    }}
                  >
                    {item.icon}
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
                          c={isActive ? 'var(--text-primary)' : 'var(--text-tertiary)'}
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

      {/* Footer spacer */}
      <Box className="nav-rail__footer" />
    </motion.nav>
  );
}
