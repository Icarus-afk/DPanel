import { useState, useEffect, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { SystemUser, CreateUserRequest } from '../types';
import {
  Paper, Text, Group, Title, Button, Stack, Table, Badge, ActionIcon, Modal, Box, Loader, Center, Divider, TextInput, Card, SimpleGrid, Switch, Tooltip, ScrollArea, Select,
} from '@mantine/core';
import { Icons } from '../lib/icons';

interface SystemGroup {
  name: string;
  gid: number;
}

const UserManager = memo(function UserManager() {
  const { isConnected } = useServer();
  const { addToast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [groups, setGroups] = useState<SystemGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newUser, setNewUser] = useState<CreateUserRequest>({
    username: '',
    password: '',
    home: '',
    shell: '/bin/bash',
    groups: [],
    create_home: true,
  });

  const fetchUsers = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const usersData = await invoke<SystemUser[]>('get_system_users');
      setUsers(usersData);
    } catch (err: any) {
      addToast(`Failed to fetch users: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isConnected, addToast]);

  const fetchGroups = useCallback(async () => {
    if (!isConnected) return;
    try {
      const groupsData = await invoke<SystemGroup[]>('get_system_groups');
      setGroups(groupsData);
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
    }
  }, [isConnected, addToast]);

  useEffect(() => {
    if (isConnected) {
      fetchUsers();
      fetchGroups();
    }
  }, [isConnected, fetchUsers, fetchGroups]);

  const handleCreateUser = async () => {
    if (!newUser.username) {
      addToast('Username is required', 'error');
      return;
    }
    setLoading(true);
    try {
      await invoke('create_user', { request: newUser });
      addToast(`User '${newUser.username}' created`, 'success');
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', home: '', shell: '/bin/bash', groups: [], create_home: true });
      fetchUsers();
    } catch (err: any) {
      addToast(`Failed to create user: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Delete user '${username}'? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      await invoke('delete_user', { username, removeHome: false });
      addToast(`User '${username}' deleted`, 'success');
      fetchUsers();
    } catch (err: any) {
      addToast(`Failed to delete user: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLockUser = async (username: string, lock: boolean) => {
    setLoading(true);
    try {
      await invoke(lock ? 'lock_user' : 'unlock_user', { username });
      addToast(`User '${username}' ${lock ? 'locked' : 'unlocked'}`, 'success');
      fetchUsers();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableGroups = groups.map(g => g.name).filter(g => g !== newUser.username);

  const stats = {
    total: users.length,
    groups: groups.length,
    locked: users.filter(u => u.locked).length,
    noPassword: users.filter(u => !u.has_password).length,
  };

  if (!isConnected) {
    return (
      <div className="page-container animate-fade-in-up">
        <Card className="card card-elevated" style={{ maxWidth: 500, margin: '0 auto' }}>
          <Stack align="center" gap="md" style={{ padding: 'var(--space-8)' }}>
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'hsl(var(--bg-tertiary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--text-tertiary))',
              }}
            >
              <Icons.Users size={32} />
            </Box>
            <Text size="xl" fw={600} c="var(--text-primary)">User Management</Text>
            <Text size="sm" c="var(--text-secondary)" style={{ textAlign: 'center' }}>
              Connect to a server to manage system users
            </Text>
          </Stack>
        </Card>
      </div>
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
            <Icons.Users size={24} />
          </Box>
          <Stack gap={0}>
            <Title order={3} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              User Management
            </Title>
            <Text size="xs" c="var(--text-tertiary)">
              {users.length} system users configured
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => { fetchUsers(); fetchGroups(); }}
            loading={loading}
            leftSection={<Icons.Refresh size={16} />}
            style={{
              background: 'hsl(var(--bg-tertiary))',
              color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-default))',
            }}
          >
            Refresh
          </Button>
          <Button
            size="compact-sm"
            style={{
              background: 'hsl(var(--success))',
              color: 'white',
            }}
            leftSection={<Icons.Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Create User
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} style={{ marginBottom: 'var(--space-4)' }}>
        {/* Total Users */}
        <Card className="card card-hover metric-card metric-card--primary">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--primary">
              <Icons.Users size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Total Users</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--text-primary))' }}>{stats.total}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Groups */}
        <Card className="card card-hover metric-card metric-card--success">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--success">
              <Icons.Shield size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Groups</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--success))' }}>{stats.groups}</Text>
            </Stack>
          </Group>
        </Card>

        {/* Locked Users */}
        <Card className="card card-hover metric-card metric-card--warning">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--warning">
              <Icons.Lock size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>Locked</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--warning))' }}>{stats.locked}</Text>
            </Stack>
          </Group>
        </Card>

        {/* No Password */}
        <Card className="card card-hover metric-card metric-card--error">
          <Group gap="xs">
            <Box className="metric-card__icon metric-card__icon--error">
              <Icons.LockOpen size={18} />
            </Box>
            <Stack gap={0}>
              <Text size="sm" c="var(--text-tertiary)" fw={500}>No Password</Text>
              <Text size="2xl" fw={700} style={{ color: 'hsl(var(--error))' }}>{stats.noPassword}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Users Table */}
      <Card className="card" style={{ flex: 1, overflow: 'hidden', minHeight: 400 }}>
        <ScrollArea.Autosize style={{ height: '100%' }}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Username</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>UID/GID</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Groups</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Home</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Shell</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Status</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Last Login</Table.Th>
                <Table.Th style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" color="hsl(var(--primary))" />
                        <Text c="var(--text-tertiary)">Loading users...</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Text c="var(--text-tertiary)">No users found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                users.map((user) => (
                  <Table.Tr key={user.username}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500} style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-primary))' }}>{user.username}</Text>
                        {user.uid === 0 && (
                          <Badge
                            size="xs"
                            variant="light"
                            style={{
                              background: 'hsl(var(--error-subtle))',
                              color: 'hsl(var(--error))',
                              border: '1px solid hsl(var(--error-border))',
                            }}
                          >
                            root
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ color: 'hsl(var(--text-secondary))' }}>{user.uid}/{user.gid}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {user.groups.slice(0, 3).map((g) => (
                          <Badge
                            key={g}
                            size="xs"
                            variant="light"
                            style={{
                              background: 'hsl(var(--bg-tertiary))',
                              color: 'hsl(var(--text-secondary))',
                              border: '1px solid hsl(var(--border-subtle))',
                            }}
                          >
                            {g}
                          </Badge>
                        ))}
                        {user.groups.length > 3 && (
                          <Badge
                            size="xs"
                            variant="light"
                            style={{
                              background: 'hsl(var(--bg-tertiary))',
                              color: 'hsl(var(--text-tertiary))',
                              border: '1px solid hsl(var(--border-subtle))',
                            }}
                          >
                            +{user.groups.length - 3}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c="var(--text-tertiary)"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.home}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>{user.shell}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          variant="light"
                          style={{
                            background: user.locked ? 'hsl(var(--warning-subtle))' : 'hsl(var(--success-subtle))',
                            color: user.locked ? 'hsl(var(--warning))' : 'hsl(var(--success))',
                            border: `1px solid hsl(var(--${user.locked ? 'warning' : 'success'}-border))`,
                          }}
                        >
                          {user.locked ? 'Locked' : 'Active'}
                        </Badge>
                        {user.has_password && (
                          <Icons.Lock size={14} style={{ color: 'hsl(var(--success))' }} />
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="var(--text-tertiary)">{user.last_login || 'Never'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label={user.locked ? 'Unlock' : 'Lock'}>
                          <ActionIcon
                            size="sm"
                            style={{
                              background: user.locked ? 'hsl(var(--success-subtle))' : 'hsl(var(--warning-subtle))',
                              color: user.locked ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                            }}
                            onClick={() => handleLockUser(user.username, !user.locked)}
                            disabled={user.uid === 0}
                            title={user.locked ? 'Unlock' : 'Lock'}
                          >
                            {user.locked ? <Icons.LockOpen size={16} /> : <Icons.Lock size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            size="sm"
                            style={{
                              background: 'hsl(var(--error-subtle))',
                              color: 'hsl(var(--error))',
                            }}
                            onClick={() => handleDeleteUser(user.username)}
                            disabled={user.uid === 0}
                            title="Delete"
                          >
                            <Icons.Trash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      </Card>

      {/* Create User Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
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
              <Icons.Users size={16} />
            </Box>
            <Text fw={600} style={{ color: 'hsl(var(--text-primary))' }}>Create New User</Text>
          </Group>
        }
        size="md"
        centered
        styles={{
          content: {
            backgroundColor: 'hsl(var(--bg-primary))',
            border: '1px solid hsl(var(--border-default))',
          },
          header: {
            borderBottom: '1px solid hsl(var(--border-subtle))',
          },
          body: {
            backgroundColor: 'hsl(var(--bg-primary))',
          },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Username"
            placeholder="john"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
            }}
          />
          <TextInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            description="Leave empty for no password"
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
              description: {
                color: 'hsl(var(--text-tertiary))',
                fontSize: 'var(--text-xs)',
              },
            }}
          />
          <TextInput
            label="Home Directory"
            placeholder={`/home/${newUser.username || 'username'}`}
            value={newUser.home}
            onChange={(e) => setNewUser({ ...newUser, home: e.target.value })}
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
            }}
          />
          <Select
            label="Shell"
            value={newUser.shell}
            onChange={(v) => setNewUser({ ...newUser, shell: v || '/bin/bash' })}
            data={[
              { value: '/bin/bash', label: 'Bash (/bin/bash)' },
              { value: '/bin/sh', label: 'Sh (/bin/sh)' },
              { value: '/usr/sbin/nologin', label: 'No Login (/usr/sbin/nologin)' },
              { value: '/bin/false', label: 'False (/bin/false)' },
            ]}
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
            }}
          />
          <Select
            label="Additional Groups"
            placeholder="Select groups"
            value={newUser.groups}
            onChange={(v) => setNewUser({ ...newUser, groups: v as string[] })}
            data={availableGroups}
            clearable
            searchable
            maxDropdownHeight={200}
            description="User will be added to these groups"
            styles={{
              input: {
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-subtle))',
                color: 'hsl(var(--text-primary))',
              },
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
              description: {
                color: 'hsl(var(--text-tertiary))',
                fontSize: 'var(--text-xs)',
              },
            }}
          />
          <Switch
            label="Create home directory"
            checked={newUser.create_home}
            onChange={(e) => setNewUser({ ...newUser, create_home: e.currentTarget.checked })}
            styles={{
              label: {
                color: 'hsl(var(--text-secondary))',
                fontWeight: 500,
              },
            }}
          />
          <Divider style={{ borderColor: 'hsl(var(--border-subtle))' }} />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setShowCreateModal(false)}
              style={{
                background: 'hsl(var(--bg-tertiary))',
                color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              loading={loading}
              style={{
                background: 'hsl(var(--success))',
                color: 'white',
              }}
            >
              Create User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
});

export default UserManager;
