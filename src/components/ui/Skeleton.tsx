import { Box, Stack, Group } from '@mantine/core';
import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }: SkeletonProps) {
  return (
    <Box
      className="shimmer"
      style={{
        width,
        height,
        borderRadius: radius === 'sm' ? '6px' : radius === 'md' ? '10px' : radius === 'lg' ? '16px' : radius,
        background: 'linear-gradient(90deg, #1a1a25 0%, #222230 50%, #1a1a25 100%)',
        backgroundSize: '1000px 100%',
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <Box
      style={{
        background: '#12121a',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Skeleton width={120} height={20} />
          <Skeleton width={40} height={24} radius="md" />
        </Group>
        <Stack gap="xs">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={14} />
        </Stack>
        <Skeleton width="100%" height={100} radius="md" />
      </Stack>
    </Box>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <Box style={{ background: '#12121a', borderRadius: '16px', padding: '16px' }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Skeleton width={150} height={20} />
          <Skeleton width={100} height={32} radius="md" />
        </Group>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: rows }).map((_, i) => (
            <Group key={i} justify="space-between" gap="xl">
              <Skeleton width="20%" height={16} />
              <Skeleton width="15%" height={16} />
              <Skeleton width="25%" height={16} />
              <Skeleton width="15%" height={16} />
              <Skeleton width="10%" height={32} radius="md" />
            </Group>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

export function SkeletonDashboard() {
  return (
    <Stack gap="md">
      <Group gap="md" style={{ flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            style={{
              flex: '1 1 200px',
              background: '#12121a',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Stack gap="md">
              <Skeleton width={100} height={14} />
              <Skeleton width={80} height={32} />
            </Stack>
          </Box>
        ))}
      </Group>
      <Skeleton width="100%" height={300} radius="lg" />
    </Stack>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={16} />
      ))}
    </Stack>
  );
}
