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
  Tooltip,
  Card,
  Loader,
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
import logo from '../assets/logo.png';

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
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        background: 'hsl(var(--bg-primary))',
      }}
    >
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <Box
            style={{
              width: 100,
              height: 100,
              borderRadius: 'var(--radius-2xl)',
              background: 'hsl(var(--bg-elevated))',
              border: '2px solid hsl(var(--border-default))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              overflow: 'hidden',
            }}
          >
            <img src={logo} alt="DPanel" style={{ width: 70, height: 70, objectFit: 'contain' }} />
          </Box>
          <Title order={2} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)', letterSpacing: '-1px' }}>
            DPanel
          </Title>
          <Text size="lg" style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>
            Server Management Dashboard
          </Text>
          <Text size="sm" style={{ color: 'hsl(var(--text-tertiary))', marginTop: 'var(--space-2)' }}>
            Connect to your servers securely via SSH
          </Text>
        </div>

        {/* Saved Servers Section */}
        {savedProfiles.length > 0 && !showForm && (
          <Card className="card card-elevated">
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
                  <IconServer2 size={18} />
                </Box>
                <Stack gap={0}>
                  <Text fw={600} size="sm" style={{ color: 'hsl(var(--text-primary))' }}>Saved Servers</Text>
                  <Text size="xs" c="var(--text-tertiary)">{savedProfiles.length} {savedProfiles.length === 1 ? 'server' : 'servers'} configured</Text>
                </Stack>
              </Group>
              <Button
                variant="subtle"
                size="compact-sm"
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
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'white',
                }}
              >
                Add Server
              </Button>
            </Group>

            <Stack gap="xs">
              {savedProfiles.map((profile) => (
                <Box
                  key={profile.id}
                  className="card card-hover"
                  style={{
                    background: 'hsl(var(--bg-tertiary))',
                    border: '1px solid hsl(var(--border-subtle))',
                    transition: 'all var(--duration-fast) var(--easing-default)',
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Box
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--radius-lg)',
                          background: 'hsl(var(--bg-elevated))',
                          border: '1px solid hsl(var(--border-default))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconServer2 size={24} style={{ color: 'hsl(var(--text-secondary))' }} />
                      </Box>
                      <Stack gap={1}>
                        <Group gap="xs" mb={1}>
                          <Text fw={600} style={{ color: 'hsl(var(--text-primary))', fontSize: 'var(--text-sm)' }}>
                            {profile.name}
                          </Text>
                          {profile.connect_on_startup && (
                            <Badge
                              size="sm"
                              variant="light"
                              style={{
                                background: 'hsl(var(--warning-subtle))',
                                color: 'hsl(var(--warning))',
                                border: '1px solid hsl(var(--warning-border))',
                              }}
                            >
                              Auto-connect
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="var(--text-tertiary)">
                          {profile.username}@{profile.host}:{profile.port}
                        </Text>
                        <Text size="xs" c="var(--text-tertiary)">
                          Last connected: {formatLastConnected(profile.last_connected)}
                        </Text>
                      </Stack>
                    </Group>

                    <Group gap="xs">
                      <Tooltip label="Quick Connect">
                        <Box
                          onClick={() => handleQuickConnect(profile)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--success))',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isConnecting(profile.id) ? 'not-allowed' : 'pointer',
                            opacity: isConnecting(profile.id) ? 0.7 : 1,
                            transition: 'all var(--duration-fast) var(--easing-default)',
                            boxShadow: 'var(--shadow-glow-success)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isConnecting(profile.id)) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {isConnecting(profile.id) ? <Loader size={18} /> : <IconCheck size={20} />}
                        </Box>
                      </Tooltip>

                      <Tooltip label={profile.connect_on_startup ? 'Disable auto-connect' : 'Enable auto-connect'}>
                        <Box
                          onClick={() => handleToggleConnectOnStartup(profile.id, profile.connect_on_startup)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: profile.connect_on_startup ? 'hsl(var(--warning-subtle))' : 'hsl(var(--bg-tertiary))',
                            color: profile.connect_on_startup ? 'hsl(var(--warning))' : 'hsl(var(--text-tertiary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: `1px solid ${profile.connect_on_startup ? 'hsl(var(--warning-border))' : 'hsl(var(--border-subtle))'}`,
                            transition: 'all var(--duration-fast) var(--easing-default)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = profile.connect_on_startup ? 'hsl(var(--warning))' : 'hsl(var(--bg-elevated))';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = profile.connect_on_startup ? 'hsl(var(--warning-subtle))' : 'hsl(var(--bg-tertiary))';
                            e.currentTarget.style.color = profile.connect_on_startup ? 'hsl(var(--warning))' : 'hsl(var(--text-tertiary))';
                          }}
                        >
                          {profile.connect_on_startup ? <IconStar size={18} /> : <IconStarOff size={18} />}
                        </Box>
                      </Tooltip>

                      <Tooltip label="Edit">
                        <Box
                          onClick={() => handleEditProfile(profile)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--bg-tertiary))',
                            color: 'hsl(var(--text-secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid hsl(var(--border-subtle))',
                            transition: 'all var(--duration-fast) var(--easing-default)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'hsl(var(--primary-subtle))';
                            e.currentTarget.style.borderColor = 'hsl(var(--primary-border))';
                            e.currentTarget.style.color = 'hsl(var(--primary))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'hsl(var(--bg-tertiary))';
                            e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                            e.currentTarget.style.color = 'hsl(var(--text-secondary))';
                          }}
                        >
                          <IconEdit size={18} />
                        </Box>
                      </Tooltip>

                      <Tooltip label="Delete">
                        <Box
                          onClick={() => handleDeleteProfile(profile.id, profile.name)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--bg-tertiary))',
                            color: 'hsl(var(--text-secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid hsl(var(--border-subtle))',
                            transition: 'all var(--duration-fast) var(--easing-default)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'hsl(var(--error-subtle))';
                            e.currentTarget.style.borderColor = 'hsl(var(--error-border))';
                            e.currentTarget.style.color = 'hsl(var(--error))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'hsl(var(--bg-tertiary))';
                            e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                            e.currentTarget.style.color = 'hsl(var(--text-secondary))';
                          }}
                        >
                          <IconTrash size={18} />
                        </Box>
                      </Tooltip>
                    </Group>
                  </Group>
                </Box>
              ))}
            </Stack>
          </Card>
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
