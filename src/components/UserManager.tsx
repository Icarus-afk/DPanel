import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { SystemUser, CreateUserRequest } from '../types';
import {
  Paper, Text, Group, Title, Button, Stack, Table, Badge, ActionIcon, Modal, Box, Loader, Center, ThemeIcon, Divider, TextInput, Select, Card, SimpleGrid, Switch, Tooltip, ScrollArea,
} from '@mantine/core';
import {
  IconUsers, IconRefresh, IconPlus, IconTrash, IconLock, IconLockOpen, IconShield, IconUserX,
} from '@tabler/icons-react';

export default function UserManager() {
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

  if (!isConnected) {
    return (
      <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-dark-6)">
        <Stack align="center" gap="md">
          <ThemeIcon size="lg" variant="light" color="gray">
            <IconUsers size={24} />
          </ThemeIcon>
          <Text c="dimmed">Connect to manage users</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="lg" color="blue">
            <IconUsers size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>User Management</Title>
            <Text size="xs" c="dimmed">{users.length} system users</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <Button variant="outline" color="blue" leftSection={<IconRefresh size={18} />} onClick={() => { fetchUsers(); fetchGroups(); }} loading={loading}>
            Refresh
          </Button>
          <Button color="green" leftSection={<IconPlus size={18} />} onClick={() => setShowCreateModal(true)}>
            Create User
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue" size="md">
              <IconUsers size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Total Users</Text>
              <Text size="xl" fw={700}>{users.length}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="green" size="md">
              <IconShield size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Groups</Text>
              <Text size="xl" fw={700}>{groups.length}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="yellow" size="md">
              <IconLock size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Locked</Text>
              <Text size="xl" fw={700}>{users.filter(u => u.locked).length}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" bg="var(--mantine-color-dark-6)">
          <Group gap="xs">
            <ThemeIcon variant="light" color="red" size="md">
              <IconUserX size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">No Password</Text>
              <Text size="xl" fw={700}>{users.filter(u => !u.has_password).length}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Users Table */}
      <Paper withBorder radius="md" bg="var(--mantine-color-dark-6)" style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollArea.Autosize style={{ height: 'calc(100vh - 320px)' }}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>UID/GID</Table.Th>
                <Table.Th>Groups</Table.Th>
                <Table.Th>Home</Table.Th>
                <Table.Th>Shell</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Last Login</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text c="dimmed">Loading users...</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Text c="dimmed">No users found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                users.map((user) => (
                  <Table.Tr key={user.username}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500} style={{ fontFamily: 'monospace' }}>{user.username}</Text>
                        {user.uid === 0 && <Badge size="xs" variant="light" color="red">root</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.uid}/{user.gid}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {user.groups.slice(0, 3).map((g) => (
                          <Badge key={g} size="xs" variant="light">{g}</Badge>
                        ))}
                        {user.groups.length > 3 && (
                          <Badge size="xs" variant="light">+{user.groups.length - 3}</Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.home}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>{user.shell}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge color={user.locked ? 'yellow' : 'green'} variant="light">
                          {user.locked ? 'Locked' : 'Active'}
                        </Badge>
                        {user.has_password && <IconLock size={14} color="var(--mantine-color-green-4)" />}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{user.last_login || 'Never'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label={user.locked ? 'Unlock' : 'Lock'}>
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color={user.locked ? 'green' : 'yellow'}
                            onClick={() => handleLockUser(user.username, !user.locked)}
                            disabled={user.uid === 0}
                          >
                            {user.locked ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color="red"
                            onClick={() => handleDeleteUser(user.username)}
                            disabled={user.uid === 0}
                          >
                            <IconTrash size={16} />
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
      </Paper>

      {/* Create User Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
          <Group gap="sm">
            <IconUsers size={20} />
            <Text fw={600}>Create New User</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Username"
            placeholder="john"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
          <TextInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            description="Leave empty for no password"
          />
          <TextInput
            label="Home Directory"
            placeholder={`/home/${newUser.username || 'username'}`}
            value={newUser.home}
            onChange={(e) => setNewUser({ ...newUser, home: e.target.value })}
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
          />
          <Switch
            label="Create home directory"
            checked={newUser.create_home}
            onChange={(e) => setNewUser({ ...newUser, create_home: e.currentTarget.checked })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} loading={loading}>
              Create User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
