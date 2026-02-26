import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { SystemMetrics } from '../types';
import {
  Paper, Text, Group, SimpleGrid, Progress, Badge, Title, Stack, Grid,
  Divider, Tooltip, ActionIcon, Box, Skeleton, Card,
} from '@mantine/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Icons } from '../lib/icons';

const Dashboard = memo(function Dashboard() {
  const { cachedMetrics, setCachedMetrics } = useServer();
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [cpuCores, setCpuCores] = useState<number>(1);

  const fetchMetrics = useCallback(async () => {
    try {
      const result = await invoke('get_system_metrics') as SystemMetrics;
      setCachedMetrics(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metrics');
    }
  }, [setCachedMetrics]);

  useEffect(() => {
    const fetchCpuCores = async () => {
      try {
        const result = await invoke('execute_command', { command: 'nproc' });
        const cores = parseInt(String(result).trim(), 10);
        if (!isNaN(cores) && cores > 0) setCpuCores(cores);
      } catch (err) { console.error('Failed to get CPU cores:', err); }
    };
    fetchCpuCores();
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getLoadStatus = (load: number, cores: number) => {
    const percentage = (load / cores) * 100;
    if (percentage > 100) return 'text-red-400';
    if (percentage > 70) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getMetricColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'red';
    if (value >= warning) return 'yellow';
    return 'blue';
  };

  const getTrend = (history: number[] | null | undefined): 'up' | 'down' | 'stable' | null => {
    if (!history || history.length < 6) return null;
    const recent = history.slice(-3);
    const prev = history.slice(-6, -3);
    const diff = (recent.reduce((a, b) => a + b, 0) / recent.length) - (prev.reduce((a, b) => a + b, 0) / prev.length);
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' | null }) => {
    if (!trend) return null;
    if (trend === 'up') return <Icons.TrendingUp size={14} style={{ color: 'hsl(var(--error))' }} />;
    if (trend === 'down') return <Icons.TrendingDown size={14} style={{ color: 'hsl(var(--success))' }} />;
    return <Icons.Minus size={14} style={{ color: 'hsl(var(--text-tertiary))' }} />;
  };

  const preparePerformanceData = (cpuHistory: number[] | null, memHistory: number[] | null) => {
    const len = Math.min(cpuHistory?.length || 0, memHistory?.length || 0);
    if (len === 0) return [];
    return Array.from({ length: len }, (_, i) => ({
      time: i, cpu: cpuHistory![i].toFixed(1), memory: memHistory![i].toFixed(1),
    }));
  };

  const metrics = cachedMetrics;
  const performanceData = useMemo(
    () => preparePerformanceData(metrics?.cpu_history || [], metrics?.memory_history || []),
    [metrics?.cpu_history, metrics?.memory_history]
  );

  if (error) {
    return (
      <Card className="card card-elevated" style={{ maxWidth: 500, margin: '0 auto' }}>
        <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-full)',
              background: 'hsl(var(--error-subtle))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'hsl(var(--error))',
            }}
          >
            <Icons.AlertTriangle size={32} />
          </Box>
          <Text size="xl" fw={600} c="var(--text-primary)">Connection Error</Text>
          <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>{error}</Text>
          <ActionIcon
            onClick={fetchMetrics}
            size="lg"
            style={{
              background: 'hsl(var(--error))',
              color: 'white',
            }}
          >
            <Icons.Refresh size={18} />
          </ActionIcon>
        </Stack>
      </Card>
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
            <Icons.Gauge size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              System Dashboard
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              Live monitoring • Updated {lastUpdate.toLocaleTimeString()}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Badge
            size="sm"
            variant="light"
            leftSection={<Box className="animate-pulse" style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: 'hsl(var(--success))' }} />}
            style={{
              background: 'hsl(var(--success-subtle))',
              color: 'hsl(var(--success))',
              border: '1px solid hsl(var(--success-border))',
            }}
          >
            Live
          </Badge>
          <ActionIcon
            variant="subtle"
            onClick={fetchMetrics}
            style={{
              color: 'hsl(var(--primary))',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--primary-subtle))'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Icons.Refresh size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {!metrics ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="card">
              <Stack gap="xs">
                <Skeleton height={16} width={80} />
                <Skeleton height={32} />
                <Skeleton height={6} />
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <>
          {/* SECTION 1: Key Metrics */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} style={{ marginBottom: 'var(--space-4)' }}>
            {/* CPU */}
            <Card className="card card-hover metric-card metric-card--primary">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Box className="metric-card__icon metric-card__icon--primary">
                    <Icons.Cpu size={18} />
                  </Box>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>CPU Usage</Text>
                </Group>
                <TrendIcon trend={getTrend(metrics.cpu_history)} />
              </Group>

              <Stack gap="xs">
                <Group justify="space-between" align="flex-end">
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>
                    {metrics.cpu_percent > 0 ? metrics.cpu_percent.toFixed(1) : '< 0.1'}%
                  </Text>
                  <Text size="xs" c="var(--text-tertiary)">{cpuCores} cores</Text>
                </Group>
                <Progress
                  value={metrics.cpu_percent ?? 0}
                  h={6}
                  radius="full"
                  color={getMetricColor(metrics.cpu_percent ?? 0, 60, 80)}
                  style={{ background: 'hsl(var(--bg-tertiary))' }}
                />
                <Text size="xs" c="var(--text-tertiary)">
                  {metrics.cpu_percent > 80 ? 'High load' : metrics.cpu_percent > 60 ? 'Moderate' : metrics.cpu_percent > 0 ? 'Normal' : 'Idle'}
                </Text>
              </Stack>
            </Card>

            {/* Memory */}
            <Card className="card card-hover metric-card metric-card--success">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Box className="metric-card__icon metric-card__icon--success">
                    <Icons.Database size={18} />
                  </Box>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Memory</Text>
                </Group>
                <TrendIcon trend={getTrend(metrics.memory_history)} />
              </Group>

              <Stack gap="xs">
                <Group justify="space-between" align="flex-end">
                  <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>
                    {formatBytes(metrics.memory_used)}
                  </Text>
                  <Text size="xs" c="var(--text-tertiary)">
                    {metrics.memory_total > 0 ? ((metrics.memory_used / metrics.memory_total) * 100).toFixed(0) : '0'}%
                  </Text>
                </Group>
                <Progress
                  value={metrics.memory_total > 0 ? (metrics.memory_used / metrics.memory_total) * 100 : 0}
                  h={6}
                  radius="full"
                  color={getMetricColor(metrics.memory_total > 0 ? (metrics.memory_used / metrics.memory_total) * 100 : 0, 60, 80)}
                  style={{ background: 'hsl(var(--bg-tertiary))' }}
                />
                <Text size="xs" c="var(--text-tertiary)">
                  of {formatBytes(metrics.memory_total)} total
                </Text>
              </Stack>
            </Card>

            {/* Load Average */}
            <Card className="card card-hover metric-card metric-card--warning">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Box className="metric-card__icon metric-card__icon--warning">
                    <Icons.Activity size={18} />
                  </Box>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Load Average</Text>
                </Group>
              </Group>

              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={700} className={getLoadStatus(metrics.load_avg[0], cpuCores)}>
                      {metrics.load_avg[0].toFixed(2)}
                    </Text>
                    <Text size="xs" c="var(--text-tertiary)">1m</Text>
                  </Box>
                  <Divider orientation="vertical" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>
                      {metrics.load_avg[1].toFixed(2)}
                    </Text>
                    <Text size="xs" c="var(--text-tertiary)">5m</Text>
                  </Box>
                  <Divider orientation="vertical" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>
                      {metrics.load_avg[2].toFixed(2)}
                    </Text>
                    <Text size="xs" c="var(--text-tertiary)">15m</Text>
                  </Box>
                </Group>
                <Divider className="border-neutral-800" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                <Group justify="space-between">
                  <Text size="xs" c="var(--text-tertiary)">{metrics.process_count} processes</Text>
                  <Text size="xs" c="var(--text-tertiary)">{cpuCores} cores</Text>
                </Group>
              </Stack>
            </Card>

            {/* Uptime */}
            <Card className="card card-hover metric-card metric-card--info">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Box className="metric-card__icon metric-card__icon--info">
                    <Icons.Clock size={18} />
                  </Box>
                  <Text size="sm" c="var(--text-tertiary)" fw={500}>Uptime</Text>
                </Group>
              </Group>
              <Stack gap={1}>
                <Text size="lg" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>
                  {formatUptime(metrics.uptime)}
                </Text>
                <Text size="xs" c="var(--text-tertiary)">Since last boot</Text>
                <Divider className="border-neutral-800" my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                <Group justify="space-between">
                  <Text size="xs" c="var(--text-tertiary)">CPU Cores</Text>
                  <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{cpuCores}</Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* SECTION 2: Charts */}
          <Grid gutter="md" style={{ marginBottom: 'var(--space-4)' }}>
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card className="card" style={{ height: '100%' }}>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--primary-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      <Icons.Activity size={18} />
                    </Box>
                    <Stack gap={0}>
                      <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Performance History</Text>
                      <Text size="xs" c="var(--text-tertiary)">CPU & Memory usage over time</Text>
                    </Stack>
                  </Group>
                  <Badge
                    variant="light"
                    size="sm"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      color: 'hsl(var(--text-secondary))',
                      border: '1px solid hsl(var(--border-default))',
                    }}
                  >
                    {metrics.cpu_history.length * 5}s history
                  </Badge>
                </Group>

                <Box style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis
                        domain={[0, 100]}
                        stroke="hsl(var(--text-tertiary))"
                        fontSize={11}
                        tickFormatter={(v) => `${v}%`}
                        width={40}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Legend wrapperStyle={{ paddingTop: '16px' }} />
                      <Area
                        type="monotone"
                        dataKey="memory"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#memGradient)"
                        strokeWidth={3}
                        name="Memory"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="hsl(var(--chart-1))"
                        fill="url(#cpuGradient)"
                        strokeWidth={3}
                        name="CPU"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card className="card" style={{ height: '100%' }}>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--violet-subtle, var(--bg-tertiary)))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--chart-6))',
                      }}
                    >
                      <Icons.Wifi size={18} />
                    </Box>
                    <Stack gap={0}>
                      <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Network Summary</Text>
                      <Text size="xs" c="var(--text-tertiary)">{metrics.network.interface}</Text>
                    </Stack>
                  </Group>
                </Group>

                <Stack gap="md">
                  <SimpleGrid cols={2} spacing="sm">
                    <Paper
                      withBorder
                      p="sm"
                      radius="md"
                      style={{
                        background: 'hsl(var(--bg-tertiary))',
                        borderColor: 'hsl(var(--border-subtle))',
                      }}
                    >
                      <Group gap="xs" mb="xs">
                        <Icons.ArrowUp size={14} style={{ color: 'hsl(var(--success))' }} />
                        <Text size="xs" c="var(--text-tertiary)">Sent</Text>
                      </Group>
                      <Text fw={700} size="md" style={{ color: 'hsl(var(--success))' }}>
                        {formatBytes(metrics.network.bytes_sent)}
                      </Text>
                    </Paper>
                    <Paper
                      withBorder
                      p="sm"
                      radius="md"
                      style={{
                        background: 'hsl(var(--bg-tertiary))',
                        borderColor: 'hsl(var(--border-subtle))',
                      }}
                    >
                      <Group gap="xs" mb="xs">
                        <Icons.ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />
                        <Text size="xs" c="var(--text-tertiary)">Received</Text>
                      </Group>
                      <Text fw={700} size="md" style={{ color: 'hsl(var(--primary))' }}>
                        {formatBytes(metrics.network.bytes_recv)}
                      </Text>
                    </Paper>
                  </SimpleGrid>

                  <Paper
                    withBorder
                    p="sm"
                    radius="md"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      borderColor: 'hsl(var(--border-subtle))',
                    }}
                  >
                    <Text size="xs" c="var(--text-tertiary)" mb="xs">Network Packets</Text>
                    <Group justify="space-around">
                      <Stack align="center" gap={0}>
                        <Group gap="xs">
                          <Icons.ArrowDown size={14} style={{ color: 'hsl(var(--primary))' }} />
                          <Text size="sm" fw={500} style={{ color: 'hsl(var(--text-primary))' }}>
                            {metrics.network.packets_recv.toLocaleString()}
                          </Text>
                        </Group>
                        <Text size="xs" c="var(--text-tertiary)">Received</Text>
                      </Stack>
                      <Divider orientation="vertical" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                      <Stack align="center" gap={0}>
                        <Group gap="xs">
                          <Icons.ArrowUp size={14} style={{ color: 'hsl(var(--success))' }} />
                          <Text size="sm" fw={500} style={{ color: 'hsl(var(--text-primary))' }}>
                            {metrics.network.packets_sent.toLocaleString()}
                          </Text>
                        </Group>
                        <Text size="xs" c="var(--text-tertiary)">Sent</Text>
                      </Stack>
                    </Group>
                  </Paper>

                  <Paper
                    withBorder
                    p="sm"
                    radius="md"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      borderColor: 'hsl(var(--border-subtle))',
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="sm" c="var(--text-tertiary)">Interface</Text>
                      <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{metrics.network.interface}</Text>
                    </Group>
                    <Divider my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                    <Group justify="space-between">
                      <Text size="sm" c="var(--text-tertiary)">Status</Text>
                      <Badge
                        size="sm"
                        variant="light"
                        style={{
                          background: 'hsl(var(--success-subtle))',
                          color: 'hsl(var(--success))',
                          border: '1px solid hsl(var(--success-border))',
                        }}
                      >
                        Active
                      </Badge>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* SECTION 3: Storage */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card className="card">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--primary-subtle))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      <Icons.HardDrive size={18} />
                    </Box>
                    <Stack gap={0}>
                      <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Storage Usage</Text>
                      <Text size="xs" c="var(--text-tertiary)">All mount points</Text>
                    </Stack>
                  </Group>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {metrics.disk_usage.map((disk, index) => {
                    const isDocker = disk.mount_point.includes('/var/lib/docker');
                    const color = disk.percent > 80 ? 'error' : disk.percent > 60 ? 'warning' : 'primary';
                    const truncatePath = (path: string, max = 20) =>
                      path.length > max ? path.substring(0, max) + '...' : path;
                    return (
                      <Box key={index}>
                        <Group justify="space-between" mb={4}>
                          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <Icons.Database size={14} style={{ color: 'hsl(var(--text-tertiary))' }} />
                            <Tooltip label={disk.mount_point} withArrow>
                              <Text
                                size="sm"
                                fw={500}
                                style={{
                                  color: 'hsl(var(--text-primary))',
                                  maxWidth: 150,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {truncatePath(disk.mount_point)}
                              </Text>
                            </Tooltip>
                            {isDocker && (
                              <Badge
                                size="xs"
                                variant="light"
                                style={{
                                  background: 'hsl(var(--warning-subtle))',
                                  color: 'hsl(var(--warning))',
                                  border: '1px solid hsl(var(--warning-border))',
                                }}
                              >
                                Docker
                              </Badge>
                            )}
                          </Group>
                          <Text
                            size="sm"
                            fw={600}
                            style={{
                              color: color === 'error' ? 'hsl(var(--error))' : color === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                            }}
                          >
                            {disk.percent.toFixed(0)}%
                          </Text>
                        </Group>
                        <Box
                          style={{
                            width: '100%',
                            height: 6,
                            background: 'hsl(var(--bg-tertiary))',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                            marginBottom: 'var(--space-2)',
                          }}
                        >
                          <Box
                            style={{
                              width: `${disk.percent ?? 0}%`,
                              height: '100%',
                              background: color === 'error' ? 'hsl(var(--error))' : color === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                        <Text size="xs" c="var(--text-tertiary)">
                          {formatBytes(disk.used)} / {formatBytes(disk.total)}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card className="card" style={{ height: '100%' }}>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'hsl(var(--warning-subtle, var(--bg-tertiary)))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--warning))',
                      }}
                    >
                      <Icons.Server size={18} />
                    </Box>
                    <Stack gap={0}>
                      <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>System Info</Text>
                      <Text size="xs" c="var(--text-tertiary)">Quick overview</Text>
                    </Stack>
                  </Group>
                </Group>

                <Stack gap="md">
                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      borderColor: 'hsl(var(--border-subtle))',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="var(--text-tertiary)">CPU Cores</Text>
                      <Text size="lg" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{cpuCores}</Text>
                    </Group>
                    <Divider my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="var(--text-tertiary)">Processes</Text>
                      <Text size="lg" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{metrics.process_count}</Text>
                    </Group>
                    <Divider my="xs" style={{ borderColor: 'hsl(var(--border-subtle))' }} />
                    <Group justify="space-between">
                      <Text size="sm" c="var(--text-tertiary)">Network</Text>
                      <Text size="sm" fw={600} style={{ color: 'hsl(var(--text-primary))' }}>{metrics.network.interface}</Text>
                    </Group>
                  </Paper>

                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    style={{
                      background: 'hsl(var(--bg-tertiary))',
                      borderColor: 'hsl(var(--border-subtle))',
                    }}
                  >
                    <Text size="sm" c="var(--text-tertiary)" mb="md">Load Distribution</Text>
                    <Group gap="lg" justify="center">
                      <Stack gap={2} align="center">
                        <Box
                          style={{
                            width: 50,
                            height: 80,
                            background: 'hsl(var(--bg-elevated))',
                            borderRadius: 'var(--radius-md)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${Math.min((metrics.load_avg[0] / Math.max(cpuCores, 1)) * 100, 100)}%`,
                              background:
                                metrics.load_avg[0] / Math.max(cpuCores, 1) > 1
                                  ? 'hsl(var(--error))'
                                  : metrics.load_avg[0] / Math.max(cpuCores, 1) > 0.7
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--success))',
                              transition: 'height 0.3s ease',
                            }}
                          />
                        </Box>
                        <Text size="xs" c="var(--text-tertiary)">1m: {metrics.load_avg[0].toFixed(2)}</Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Box
                          style={{
                            width: 50,
                            height: 80,
                            background: 'hsl(var(--bg-elevated))',
                            borderRadius: 'var(--radius-md)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${Math.min((metrics.load_avg[1] / Math.max(cpuCores, 1)) * 100, 100)}%`,
                              background:
                                metrics.load_avg[1] / Math.max(cpuCores, 1) > 1
                                  ? 'hsl(var(--error))'
                                  : metrics.load_avg[1] / Math.max(cpuCores, 1) > 0.7
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--success))',
                              transition: 'height 0.3s ease',
                            }}
                          />
                        </Box>
                        <Text size="xs" c="var(--text-tertiary)">5m: {metrics.load_avg[1].toFixed(2)}</Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Box
                          style={{
                            width: 50,
                            height: 80,
                            background: 'hsl(var(--bg-elevated))',
                            borderRadius: 'var(--radius-md)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${Math.min((metrics.load_avg[2] / Math.max(cpuCores, 1)) * 100, 100)}%`,
                              background:
                                metrics.load_avg[2] / Math.max(cpuCores, 1) > 1
                                  ? 'hsl(var(--error))'
                                  : metrics.load_avg[2] / Math.max(cpuCores, 1) > 0.7
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--success))',
                              transition: 'height 0.3s ease',
                            }}
                          />
                        </Box>
                        <Text size="xs" c="var(--text-tertiary)">15m: {metrics.load_avg[2].toFixed(2)}</Text>
                      </Stack>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </>
      )}
    </div>
  );
});

export default Dashboard;
