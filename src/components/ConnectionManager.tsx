import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useServer } from '../context/ServerContext';
import { useToast } from '../context/ToastContext';
import { ServerProfile, AuthMethod, ConnectionResult, SavedServerProfile } from '../types';
import {
  Box,
  Paper,
  TextInput,
  PasswordInput,
  NumberInput,
  Button,
  Group,
  Text,
  Title,
  SegmentedControl,
  Stack,
  Divider,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPlugConnected,
  IconKey,
  IconLock,
  IconTrash,
  IconEdit,
  IconClock,
  IconStar,
  IconStarOff,
} from '@tabler/icons-react';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function ConnectionManager() {
  const { setActiveServer, setIsConnected } = useServer();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedServerProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedServerProfile | null>(null);
  const [formData, setFormData] = useState({
    name: 'My VPS',
    host: '',
    port: 22,
    username: 'root',
    authType: 'key' as 'password' | 'key',
    password: '',
    keyPath: '',
    passphrase: '',
  });

  useEffect(() => {
    loadSavedProfiles();
  }, []);

  const loadSavedProfiles = async () => {
    if (!isTauri()) return;
    try {
      const profiles = await invoke<SavedServerProfile[]>('get_server_profiles');
      setSavedProfiles(profiles);
    } catch (error) {
      console.error('Failed to load saved profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTauri()) {
      addToast('Please run this app with: pnpm tauri dev', 'error');
      return;
    }

    setLoading(true);

    const authMethod: AuthMethod = formData.authType === 'password'
      ? { type: 'Password', password: formData.password }
      : { type: 'PrivateKey', key_path: formData.keyPath, passphrase: formData.passphrase || undefined };

    const profile: ServerProfile = {
      id: editingProfile ? editingProfile.id : Date.now().toString(),
      name: formData.name,
      host: formData.host,
      port: formData.port,
      username: formData.username,
      auth_method: authMethod,
    };

    try {
      const result: ConnectionResult = await invoke('connect_to_server', { profile });
      if (result.success) {
        setActiveServer(profile);
        setIsConnected(true);
        addToast(`Connected to ${formData.name} successfully!`, 'success');
        loadSavedProfiles();
        setShowForm(false);
        setEditingProfile(null);
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      addToast(String(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!isTauri()) {
      addToast('Please run this app with: pnpm tauri dev', 'error');
      return;
    }

    setLoading(true);

    const authMethod: AuthMethod = formData.authType === 'password'
      ? { type: 'Password', password: formData.password }
      : { type: 'PrivateKey', key_path: formData.keyPath, passphrase: formData.passphrase || undefined };

    try {
      const result: ConnectionResult = await invoke('test_connection', {
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authMethod,
      });
      if (result.success) {
        addToast('Connection test successful!', 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      addToast(String(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickConnect = async (profile: SavedServerProfile) => {
    if (!isTauri()) return;

    setLoading(true);
    try {
      const serverProfile: ServerProfile = {
        id: profile.id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        auth_method: profile.auth_method,
      };
      const result: ConnectionResult = await invoke('connect_to_server', { profile: serverProfile });
      if (result.success) {
        setActiveServer(serverProfile);
        setIsConnected(true);
        addToast(`Connected to ${profile.name} successfully!`, 'success');
        loadSavedProfiles();
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      addToast(String(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!isTauri()) return;
    try {
      await invoke('delete_server_profile', { profileId });
      addToast(`Deleted ${profileName}`, 'success');
      loadSavedProfiles();
    } catch (error) {
      addToast(String(error), 'error');
    }
  };

  const handleEditProfile = (profile: SavedServerProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      authType: profile.auth_method.type === 'Password' ? 'password' : 'key',
      password: profile.auth_method.type === 'Password' ? profile.auth_method.password : '',
      keyPath: profile.auth_method.type === 'PrivateKey' ? profile.auth_method.key_path : '',
      passphrase: profile.auth_method.type === 'PrivateKey' ? (profile.auth_method.passphrase || '') : '',
    });
    setShowForm(true);
  };

  const handleToggleConnectOnStartup = async (profileId: string, currentValue: boolean) => {
    if (!isTauri()) return;
    try {
      await invoke('update_server_profile_metadata', {
        profileId,
        connectOnStartup: !currentValue,
      });
      addToast('Profile updated', 'success');
      loadSavedProfiles();
    } catch (error) {
      addToast(String(error), 'error');
    }
  };

  const formatLastConnected = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const fillDefaultKeyPath = () => {
    setFormData({ ...formData, keyPath: '~/.ssh/id_ed25519' });
    addToast('Default key path set. Adjust if your key is elsewhere.', 'info');
  };

  return (
    <Stack gap="md" maw={900} mx="auto" py="xl">
      {/* Saved Servers Section */}
      {savedProfiles.length > 0 && !showForm && (
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={4}>Saved Servers</Title>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingProfile(null);
                setFormData({
                  name: 'My VPS',
                  host: '',
                  port: 22,
                  username: 'root',
                  authType: 'key',
                  password: '',
                  keyPath: '',
                  passphrase: '',
                });
                setShowForm(true);
              }}
            >
              Add New Server
            </Button>
          </Group>

          <Stack gap="xs">
            {savedProfiles.map((profile) => (
              <Paper
                key={profile.id}
                withBorder
                p="sm"
                radius="md"
                bg="var(--mantine-color-dark-6)"
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Box>
                      <Group gap="xs">
                        <Text fw={600}>{profile.name}</Text>
                        {profile.connect_on_startup && (
                          <Badge variant="light" size="sm" color="yellow">
                            Auto-connect
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {profile.username}@{profile.host}:{profile.port}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <IconClock size={12} />
                        <Text size="xs" c="dimmed">
                          Last connected: {formatLastConnected(profile.last_connected)}
                        </Text>
                      </Group>
                    </Box>
                  </Group>

                  <Group gap="xs">
                    <Tooltip label="Quick Connect">
                      <ActionIcon
                        variant="filled"
                        color="green"
                        size="lg"
                        onClick={() => handleQuickConnect(profile)}
                        loading={loading}
                      >
                        <IconPlugConnected size={20} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label={profile.connect_on_startup ? 'Disable auto-connect' : 'Enable auto-connect'}>
                      <ActionIcon
                        variant="subtle"
                        color={profile.connect_on_startup ? 'yellow' : 'gray'}
                        onClick={() => handleToggleConnectOnStartup(profile.id, profile.connect_on_startup)}
                      >
                        {profile.connect_on_startup ? <IconStar size={18} /> : <IconStarOff size={18} />}
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleEditProfile(profile)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteProfile(profile.id, profile.name)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>

          <Divider my="md" />
        </Paper>
      )}

      {/* Connection Form */}
      {(showForm || savedProfiles.length === 0) && (
        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>{editingProfile ? 'Edit Server' : 'Connect to Server'}</Title>
              {savedProfiles.length > 0 && (
                <Button variant="subtle" size="sm" onClick={() => setShowForm(false)}>
                  Back to Saved Servers
                </Button>
              )}
            </Group>

            <Text size="sm" c="dimmed">
              Enter your SSH credentials to connect to a remote server
            </Text>

            <Divider my="xs" />

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Server Name"
                  placeholder="My VPS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <Group grow>
                  <TextInput
                    label="Host"
                    placeholder="192.168.1.100"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    required
                  />
                  <NumberInput
                    label="Port"
                    placeholder="22"
                    value={formData.port}
                    onChange={(value) => setFormData({ ...formData, port: Number(value) || 22 })}
                    min={1}
                    max={65535}
                  />
                </Group>

                <TextInput
                  label="Username"
                  placeholder="root"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />

                <Box>
                  <Text size="sm" fw={500} mb="xs">Authentication</Text>
                  <SegmentedControl
                    value={formData.authType}
                    onChange={(value) => setFormData({ ...formData, authType: value as 'password' | 'key' })}
                    data={[
                      { label: 'Password', value: 'password' },
                      { label: 'SSH Key', value: 'key' },
                    ]}
                    fullWidth
                  />
                </Box>

                {formData.authType === 'password' ? (
                  <PasswordInput
                    label="Password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                ) : (
                  <>
                    <TextInput
                      label="Private Key Path"
                      placeholder="~/.ssh/id_ed25519"
                      value={formData.keyPath}
                      onChange={(e) => setFormData({ ...formData, keyPath: e.target.value })}
                      required
                      leftSection={<IconKey size={16} />}
                      rightSection={
                        !formData.keyPath && (
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            onClick={fillDefaultKeyPath}
                          >
                            Use Default
                          </Button>
                        )
                      }
                    />
                    <PasswordInput
                      label="Key Passphrase (optional)"
                      placeholder="Enter passphrase"
                      value={formData.passphrase}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                      leftSection={<IconLock size={16} />}
                    />
                  </>
                )}

                <Divider my="xs" />

                <Group justify="apart">
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    loading={loading}
                    leftSection={<IconPlugConnected size={16} />}
                  >
                    Test Connection
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    loaderProps={{ type: loading ? 'dots' : 'oval' }}
                  >
                    {loading ? 'Connecting...' : editingProfile ? 'Save & Connect' : 'Connect'}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
