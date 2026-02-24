import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { SystemMetrics } from '../types';
import {
  Paper, Text, Group, SimpleGrid, Progress, Badge, Title, Stack, Grid,
  ThemeIcon, Divider, Tooltip, ActionIcon, Box, Skeleton, Card,
} from '@mantine/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import {
  Cpu, Database, Activity, Clock, ArrowUp, ArrowDown, Wifi, Gauge,
  RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus, HardDrive, Server,
} from 'lucide-react';

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
    if (trend === 'up') return <TrendingUp size={14} className="text-red-400" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-emerald-400" />;
    return <Minus size={14} className="text-neutral-500" />;
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
      <Card className="bg-neutral-900 border border-neutral-800 p-6">
        <Stack align="center" gap="md">
          <AlertTriangle size={32} className="text-red-500" />
          <Text className="text-white font-semibold">Connection Error</Text>
          <Text className="text-neutral-400 text-sm">{error}</Text>
          <ActionIcon onClick={fetchMetrics} className="bg-red-600 hover:bg-red-500">
            <RefreshCw size={18} />
          </ActionIcon>
        </Stack>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Group justify="space-between" className="mb-2">
        <Group gap="sm">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Gauge size={20} className="text-blue-400" />
          </div>
          <Stack gap={0}>
            <Title order={3} className="text-white text-lg font-semibold">System Dashboard</Title>
            <Text size="xs" className="text-neutral-500">Live monitoring • Updated {lastUpdate.toLocaleTimeString()}</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            Live
          </Badge>
          <ActionIcon variant="subtle" onClick={fetchMetrics} className="text-blue-400 hover:bg-blue-500/10">
            <RefreshCw size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {!metrics ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-neutral-900 border border-neutral-800 p-4">
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
          {/* SECTION 1: Key Metrics - REDESIGNED */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {/* CPU */}
            <Card className="bg-neutral-900 border border-neutral-800 p-4">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Cpu size={18} className="text-blue-400" />
                  </div>
                  <Text size="sm" className="text-neutral-400 font-medium">CPU Usage</Text>
                </Group>
                <TrendIcon trend={getTrend(metrics.cpu_history)} />
              </Group>
              
              <Stack gap="xs">
                <Group justify="space-between" align="flex-end">
                  <Text size="2xl" fw={700} className="text-white">{metrics.cpu_percent > 0 ? metrics.cpu_percent.toFixed(1) : '< 0.1'}%</Text>
                  <Text size="xs" className="text-neutral-500">{cpuCores} cores</Text>
                </Group>
                <Progress
                  value={metrics.cpu_percent ?? 0}
                  h={8}
                  radius="md"
                  color={getMetricColor(metrics.cpu_percent ?? 0, 60, 80)}
                />
                <Group justify="space-between">
                  <Text size="xs" className="text-neutral-500">
                    {metrics.cpu_percent > 80 ? 'High load' : metrics.cpu_percent > 60 ? 'Moderate' : metrics.cpu_percent > 0 ? 'Normal' : 'Idle'}
                  </Text>
                </Group>
              </Stack>
            </Card>

            {/* Memory */}
            <Card className="bg-neutral-900 border border-neutral-800 p-4">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <Database size={18} className="text-emerald-400" />
                  </div>
                  <Text size="sm" className="text-neutral-400 font-medium">Memory</Text>
                </Group>
                <TrendIcon trend={getTrend(metrics.memory_history)} />
              </Group>

              <Stack gap="xs">
                <Group justify="space-between" align="flex-end">
                  <Text size="2xl" fw={700} className="text-white">{formatBytes(metrics.memory_used)}</Text>
                  <Text size="xs" className="text-neutral-500">{metrics.memory_total > 0 ? ((metrics.memory_used / metrics.memory_total) * 100).toFixed(0) : '0'}%</Text>
                </Group>
                <Progress
                  value={metrics.memory_total > 0 ? (metrics.memory_used / metrics.memory_total) * 100 : 0}
                  h={8}
                  radius="md"
                  color={getMetricColor(metrics.memory_total > 0 ? (metrics.memory_used / metrics.memory_total) * 100 : 0, 60, 80)}
                />
                <Text size="xs" className="text-neutral-500">
                  of {formatBytes(metrics.memory_total)} total
                </Text>
              </Stack>
            </Card>

            {/* Load Average */}
            <Card className="bg-neutral-900 border border-neutral-800 p-4">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                    <Activity size={18} className="text-orange-400" />
                  </div>
                  <Text size="sm" className="text-neutral-400 font-medium">Load Average</Text>
                </Group>
              </Group>
              
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={700} className={getLoadStatus(metrics.load_avg[0], cpuCores)}>{metrics.load_avg[0].toFixed(2)}</Text>
                    <Text size="xs" className="text-neutral-500">1m</Text>
                  </Box>
                  <Divider orientation="vertical" />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={600} className="text-white">{metrics.load_avg[1].toFixed(2)}</Text>
                    <Text size="xs" className="text-neutral-500">5m</Text>
                  </Box>
                  <Divider orientation="vertical" />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="lg" fw={600} className="text-white">{metrics.load_avg[2].toFixed(2)}</Text>
                    <Text size="xs" className="text-neutral-500">15m</Text>
                  </Box>
                </Group>
                <Divider className="border-neutral-800" />
                <Group justify="space-between">
                  <Text size="xs" className="text-neutral-500">{metrics.process_count} processes</Text>
                  <Text size="xs" className="text-neutral-500">{cpuCores} cores</Text>
                </Group>
              </Stack>
            </Card>

            {/* Uptime */}
            <Card className="bg-neutral-900 border border-neutral-800 p-4">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <div className="w-8 h-8 rounded-md bg-teal-500/10 flex items-center justify-center">
                    <Clock size={18} className="text-teal-400" />
                  </div>
                  <Text size="sm" className="text-neutral-400 font-medium">Uptime</Text>
                </Group>
              </Group>
              <Stack gap={1}>
                <Text size="lg" className="text-white font-bold">{formatUptime(metrics.uptime)}</Text>
                <Text size="xs" className="text-neutral-500">Since last boot</Text>
                <Divider className="border-neutral-800" my="xs" />
                <Group justify="space-between">
                  <Text size="xs" className="text-neutral-500">CPU Cores</Text>
                  <Text size="sm" className="text-white font-medium">{cpuCores}</Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* SECTION 2: Charts */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card className="bg-neutral-900 border border-neutral-800 p-4 h-full">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                      <Activity size={18} className="text-blue-400" />
                    </div>
                    <Stack gap={0}>
                      <Text className="text-white font-semibold text-sm">Performance History</Text>
                      <Text size="xs" className="text-neutral-500">CPU & Memory usage over time</Text>
                    </Stack>
                  </Group>
                  <Badge variant="light" size="sm" className="bg-neutral-800 text-neutral-400">
                    {metrics.cpu_history.length * 5}s history
                  </Badge>
                </Group>

                <Box style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} stroke="#555" fontSize={11} tickFormatter={(v) => `${v}%`} width={40} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="memory" stroke="#10b981" fill="url(#memGradient)" strokeWidth={2} name="Memory" isAnimationActive={false} />
                      <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGradient)" strokeWidth={2} name="CPU" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card className="bg-neutral-900 border border-neutral-800 p-4 h-full">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <div className="w-8 h-8 rounded-md bg-violet-500/10 flex items-center justify-center">
                      <Wifi size={18} className="text-violet-400" />
                    </div>
                    <Stack gap={0}>
                      <Text className="text-white font-semibold text-sm">Network Summary</Text>
                      <Text size="xs" className="text-neutral-500">{metrics.network.interface}</Text>
                    </Stack>
                  </Group>
                </Group>

                <Stack gap="md">
                  {/* Total Transfer */}
                  <SimpleGrid cols={2} spacing="sm">
                    <Paper withBorder p="sm" radius="md" className="bg-neutral-800/50 border-neutral-800">
                      <Group gap="xs" mb="xs">
                        <ArrowUp size={14} className="text-emerald-400" />
                        <Text size="xs" className="text-neutral-500">Sent</Text>
                      </Group>
                      <Text fw={700} size="md" className="text-emerald-400">{formatBytes(metrics.network.bytes_sent)}</Text>
                    </Paper>
                    <Paper withBorder p="sm" radius="md" className="bg-neutral-800/50 border-neutral-800">
                      <Group gap="xs" mb="xs">
                        <ArrowDown size={14} className="text-blue-400" />
                        <Text size="xs" className="text-neutral-500">Received</Text>
                      </Group>
                      <Text fw={700} size="md" className="text-blue-400">{formatBytes(metrics.network.bytes_recv)}</Text>
                    </Paper>
                  </SimpleGrid>

                  {/* Packets */}
                  <Paper withBorder p="sm" radius="md" className="bg-neutral-800/50 border-neutral-800">
                    <Text size="xs" className="text-neutral-500" mb="xs">Network Packets</Text>
                    <Group justify="space-around">
                      <Stack align="center" gap={0}>
                        <Group gap="xs">
                          <ArrowDown size={14} className="text-blue-400" />
                          <Text size="sm" className="text-white font-medium">{metrics.network.packets_recv.toLocaleString()}</Text>
                        </Group>
                        <Text size="xs" className="text-neutral-500">Received</Text>
                      </Stack>
                      <Divider orientation="vertical" />
                      <Stack align="center" gap={0}>
                        <Group gap="xs">
                          <ArrowUp size={14} className="text-emerald-400" />
                          <Text size="sm" className="text-white font-medium">{metrics.network.packets_sent.toLocaleString()}</Text>
                        </Group>
                        <Text size="xs" className="text-neutral-500">Sent</Text>
                      </Stack>
                    </Group>
                  </Paper>

                  {/* Drop Errors if available */}
                  <Paper withBorder p="sm" radius="md" className="bg-neutral-800/50 border-neutral-800">
                    <Group justify="space-between">
                      <Text size="sm" className="text-neutral-400">Interface</Text>
                      <Text size="sm" className="text-white font-medium">{metrics.network.interface}</Text>
                    </Group>
                    <Divider className="border-neutral-800" my="xs" />
                    <Group justify="space-between">
                      <Text size="sm" className="text-neutral-400">Status</Text>
                      <Badge size="sm" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</Badge>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* SECTION 3: Storage - Wider */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card className="bg-neutral-900 border border-neutral-800 p-4">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center">
                      <HardDrive size={18} className="text-cyan-400" />
                    </div>
                    <Stack gap={0}>
                      <Text className="text-white font-semibold text-sm">Storage Usage</Text>
                      <Text size="xs" className="text-neutral-500">All mount points</Text>
                    </Stack>
                  </Group>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {metrics.disk_usage.map((disk, index) => {
                    const isDocker = disk.mount_point.includes('/var/lib/docker');
                    const color = disk.percent > 80 ? 'red' : disk.percent > 60 ? 'yellow' : 'cyan';
                    const truncatePath = (path: string, max = 20) => path.length > max ? path.substring(0, max) + '...' : path;
                    return (
                      <Box key={index}>
                        <Group justify="space-between" mb={4}>
                          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <Database size={14} className="text-neutral-500" />
                            <Tooltip label={disk.mount_point} withArrow>
                              <Text size="sm" fw={500} className="text-white truncate" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {truncatePath(disk.mount_point)}
                              </Text>
                            </Tooltip>
                            {isDocker && <Badge size="xs" variant="light" color="orange" className="bg-orange-500/10 text-orange-400 border border-orange-500/30">Docker</Badge>}
                          </Group>
                          <Text size="sm" fw={600} className={color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-cyan-400'}>
                            {disk.percent.toFixed(0)}%
                          </Text>
                        </Group>
                        <Progress value={disk.percent} color={color} size="sm" radius="sm" mb={2} />
                        <Text size="xs" className="text-neutral-500">{formatBytes(disk.used)} / {formatBytes(disk.total)}</Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card className="bg-neutral-900 border border-neutral-800 p-4 h-full">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                      <Server size={18} className="text-amber-400" />
                    </div>
                    <Stack gap={0}>
                      <Text className="text-white font-semibold text-sm">System Info</Text>
                      <Text size="xs" className="text-neutral-500">Quick overview</Text>
                    </Stack>
                  </Group>
                </Group>

                <Stack gap="md">
                  <Paper withBorder p="md" radius="md" className="bg-neutral-800/50 border-neutral-800">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" className="text-neutral-400">CPU Cores</Text>
                      <Text size="lg" fw={700} className="text-white">{cpuCores}</Text>
                    </Group>
                    <Divider className="border-neutral-800" my="xs" />
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" className="text-neutral-400">Processes</Text>
                      <Text size="lg" fw={700} className="text-white">{metrics.process_count}</Text>
                    </Group>
                    <Divider className="border-neutral-800" my="xs" />
                    <Group justify="space-between">
                      <Text size="sm" className="text-neutral-400">Network</Text>
                      <Text size="sm" fw={600} className="text-white">{metrics.network.interface}</Text>
                    </Group>
                  </Paper>

                  <Paper withBorder p="md" radius="md" className="bg-neutral-800/50 border-neutral-800">
                    <Text size="sm" c="neutral-400" mb="md">Load Distribution</Text>
                    <Group gap="lg" justify="center">
                      <Stack gap={2} align="center">
                        <Box style={{ width: 50, height: 80, background: '#262626', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                          <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min((metrics.load_avg[0] / Math.max(cpuCores, 1)) * 100, 100)}%`, background: metrics.load_avg[0] / Math.max(cpuCores, 1) > 1 ? '#ef4444' : metrics.load_avg[0] / Math.max(cpuCores, 1) > 0.7 ? '#f59e0b' : '#10b981', transition: 'height 0.3s' }} />
                        </Box>
                        <Text size="xs" c="neutral-500">1m: {metrics.load_avg[0].toFixed(2)}</Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Box style={{ width: 50, height: 80, background: '#262626', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                          <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min((metrics.load_avg[1] / Math.max(cpuCores, 1)) * 100, 100)}%`, background: metrics.load_avg[1] / Math.max(cpuCores, 1) > 1 ? '#ef4444' : metrics.load_avg[1] / Math.max(cpuCores, 1) > 0.7 ? '#f59e0b' : '#10b981', transition: 'height 0.3s' }} />
                        </Box>
                        <Text size="xs" c="neutral-500">5m: {metrics.load_avg[1].toFixed(2)}</Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Box style={{ width: 50, height: 80, background: '#262626', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                          <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min((metrics.load_avg[2] / Math.max(cpuCores, 1)) * 100, 100)}%`, background: metrics.load_avg[2] / Math.max(cpuCores, 1) > 1 ? '#ef4444' : metrics.load_avg[2] / Math.max(cpuCores, 1) > 0.7 ? '#f59e0b' : '#10b981', transition: 'height 0.3s' }} />
                        </Box>
                        <Text size="xs" c="neutral-500">15m: {metrics.load_avg[2].toFixed(2)}</Text>
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
