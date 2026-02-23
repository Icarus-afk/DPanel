import { motion } from 'framer-motion';
import { Box, Stack, Text } from '@mantine/core';
import logo from '../../assets/logo.png';

export function LoadingScreen() {
  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        zIndex: 9999,
      }}
    >
      {/* Main Content */}
      <Stack align="center" gap="xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
        >
          <Box
            style={{
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={logo}
              alt="DPanel"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
              }}
            />
          </Box>
        </motion.div>

        {/* App Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Text
            size="4xl"
            fw={800}
            c="white"
            style={{ letterSpacing: '-2px' }}
          >
            DPanel
          </Text>
        </motion.div>

        {/* Loading Bar */}
        <Box style={{ width: 200, height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              height: '100%',
              background: '#ffffff',
              borderRadius: 2,
            }}
          />
        </Box>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Text c="dimmed" size="sm" fw={500}>
            Initializing...
          </Text>
        </motion.div>
      </Stack>

      {/* Version Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Text c="dimmed" size="xs" style={{ opacity: 0.5 }}>
          v0.1.0
        </Text>
      </motion.div>
    </Box>
  );
}
