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
  IconStar,
  IconStarOff,
  IconServer2,
  IconPlus,
  IconArrowLeft,
  IconCheck,
  IconWifi,
} from '@tabler/icons-react';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function ConnectionManager() {
  const { setActiveServer, setIsConnected } = useServer();
  const { addToast } = useToast();
  const [savedProfiles, setSavedProfiles] = useState<SavedServerProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedServerProfile | null>(null);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(null);
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

    setConnectingProfileId('submitting');

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
      setConnectingProfileId(null);
    }
  };

  const testConnection = async () => {
    if (!isTauri()) {
      addToast('Please run this app with: pnpm tauri dev', 'error');
      return;
    }

    setConnectingProfileId('testing');

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
      setConnectingProfileId(null);
    }
  };

  const handleQuickConnect = async (profile: SavedServerProfile) => {
    if (!isTauri()) return;

    setConnectingProfileId(profile.id);
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
      setConnectingProfileId(null);
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

  const isConnecting = (id: string) => connectingProfileId === id;

  const inputStyles = {
    label: { color: '#a3a3a3', fontWeight: 500, marginBottom: '8px', fontSize: '13px' },
    input: {
      backgroundColor: '#171717',
      border: '1px solid #262626',
      color: '#ffffff',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '14px',
    },
    placeholder: { color: '#525252' },
  };

  return (
    <Box className="min-h-screen bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 mb-5">
            <IconWifi size={32} className="text-emerald-400" />
          </div>
          <Title order={2} className="text-2xl font-semibold text-white mb-2">
            SSH Connection
          </Title>
          <Text size="sm" className="text-neutral-500 mt-3">
            Connect to your remote servers securely via SSH
          </Text>
        </div>

        {/* Saved Servers Section */}
        {savedProfiles.length > 0 && !showForm && (
          <Paper
            withBorder
            p="lg"
            radius="lg"
            className="bg-neutral-900 border-neutral-800"
          >
            <Group justify="space-between" mb="md">
              <Title order={4} className="text-base font-medium text-white">
                Saved Servers
              </Title>
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
                leftSection={<IconPlus size={16} />}
                className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 transition-all text-sm"
              >
                Add Server
              </Button>
            </Group>

            <Stack gap="xs">
              {savedProfiles.map((profile) => (
                <Paper
                  key={profile.id}
                  withBorder
                  p="md"
                  radius="md"
                  className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all group"
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                        <IconServer2 size={20} className="text-neutral-400" />
                      </div>
                      <div>
                        <Group gap="xs" mb={1}>
                          <Text fw={500} className="text-white text-sm">
                            {profile.name}
                          </Text>
                          {profile.connect_on_startup && (
                            <Badge
                              size="sm"
                              className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs"
                            >
                              Auto
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" className="text-neutral-500">
                          {profile.username}@{profile.host}:{profile.port}
                        </Text>
                      </div>
                    </Group>

                    <Group gap="xs">
                      <Tooltip label="Quick Connect">
                        <ActionIcon
                          variant="filled"
                          size="md"
                          radius="md"
                          onClick={() => handleQuickConnect(profile)}
                          loading={isConnecting(profile.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 transition-all"
                        >
                          <IconCheck size={18} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip
                        label={
                          profile.connect_on_startup ? 'Disable auto-connect' : 'Enable auto-connect'
                        }
                      >
                        <ActionIcon
                          variant="subtle"
                          size="md"
                          radius="md"
                          onClick={() =>
                            handleToggleConnectOnStartup(profile.id, profile.connect_on_startup)
                          }
                          className={
                            profile.connect_on_startup
                              ? 'text-yellow-500 hover:bg-yellow-500/10'
                              : 'text-neutral-600 hover:bg-neutral-800'
                          }
                        >
                          {profile.connect_on_startup ? (
                            <IconStar size={16} />
                          ) : (
                            <IconStarOff size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Edit">
                        <ActionIcon
                          variant="subtle"
                          size="md"
                          radius="md"
                          onClick={() => handleEditProfile(profile)}
                          className="text-neutral-600 hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          size="md"
                          radius="md"
                          onClick={() => handleDeleteProfile(profile.id, profile.name)}
                          className="text-neutral-600 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Connection Form */}
        {(showForm || savedProfiles.length === 0) && (
          <Paper
            withBorder
            p="lg"
            radius="lg"
            className="bg-neutral-900 border-neutral-800"
          >
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3} className="text-base font-medium text-white">
                  {editingProfile ? 'Edit Server' : 'Add New Server'}
                </Title>
                {savedProfiles.length > 0 && (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    leftSection={<IconArrowLeft size={14} />}
                    className="text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all text-sm"
                  >
                    Back
                  </Button>
                )}
              </Group>

              <Divider className="border-neutral-800" />

              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <TextInput
                    label="Server Name"
                    placeholder="My VPS"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    styles={inputStyles}
                  />

                  <Group grow gap="md">
                    <TextInput
                      label="Host"
                      placeholder="192.168.1.100"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      required
                      styles={inputStyles}
                    />
                    <NumberInput
                      label="Port"
                      placeholder="22"
                      value={formData.port}
                      onChange={(value) => setFormData({ ...formData, port: Number(value) || 22 })}
                      min={1}
                      max={65535}
                      styles={inputStyles}
                    />
                  </Group>

                  <TextInput
                    label="Username"
                    placeholder="root"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    styles={inputStyles}
                  />

                  <Box>
                    <Text size="sm" className="text-neutral-400 mb-2" style={{ fontWeight: 500, fontSize: '13px' }}>
                      Authentication
                    </Text>
                    <SegmentedControl
                      value={formData.authType}
                      onChange={(value) =>
                        setFormData({ ...formData, authType: value as 'password' | 'key' })
                      }
                      data={[
                        { label: 'Password', value: 'password' },
                        { label: 'SSH Key', value: 'key' },
                      ]}
                      fullWidth
                      styles={{
                        root: { backgroundColor: '#171717', borderRadius: '8px', padding: '3px' },
                        control: {
                          backgroundColor: '#262626',
                          borderRadius: '6px',
                        },
                        label: {
                          color: '#a3a3a3',
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '6px 12px',
                        },
                      }}
                    />
                  </Box>

                  {formData.authType === 'password' ? (
                    <PasswordInput
                      label="Password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      styles={inputStyles}
                    />
                  ) : (
                    <>
                      <TextInput
                        label="Private Key Path"
                        placeholder="~/.ssh/id_ed25519"
                        value={formData.keyPath}
                        onChange={(e) => setFormData({ ...formData, keyPath: e.target.value })}
                        required
                        leftSection={<IconKey size={14} className="text-neutral-600" />}
                        rightSection={
                          !formData.keyPath && (
                            <Button
                              variant="subtle"
                              size="compact-xs"
                              onClick={fillDefaultKeyPath}
                              className="text-neutral-500 hover:text-white text-xs"
                            >
                              Default
                            </Button>
                          )
                        }
                        styles={inputStyles}
                      />
                      <PasswordInput
                        label="Key Passphrase (optional)"
                        placeholder="Enter passphrase"
                        value={formData.passphrase}
                        onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                        leftSection={<IconLock size={14} className="text-neutral-600" />}
                        styles={inputStyles}
                      />
                    </>
                  )}

                  <Divider className="border-neutral-800" />

                  <Group justify="apart">
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      loading={isConnecting('testing')}
                      leftSection={<IconPlugConnected size={14} />}
                      className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 transition-all text-sm"
                    >
                      Test
                    </Button>
                    <Button
                      type="submit"
                      loading={isConnecting('submitting')}
                      loaderProps={{ type: isConnecting('submitting') ? 'dots' : 'oval' }}
                      className="bg-white text-black hover:bg-neutral-200 transition-all font-medium text-sm px-6"
                    >
                      {isConnecting('submitting')
                        ? 'Connecting...'
                        : editingProfile
                        ? 'Save & Connect'
                        : 'Connect'}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          </Paper>
        )}
      </div>
    </Box>
  );
}
