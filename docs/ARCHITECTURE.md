# DPanel Architecture

This document provides an overview of DPanel's technical architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         DPanel App                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │   React UI      │         │   Tauri Runtime         │   │
│  │   (Frontend)    │◄───────►│   (Bridge)              │   │
│  │                 │  IPC    │                         │   │
│  │  - Components   │         │  - Command Handler      │   │
│  │  - State Mgmt   │         │  - Event System         │   │
│  │  - Routing      │         │  - Window Mgmt          │   │
│  └─────────────────┘         └─────────────────────────┘   │
│                                     │                       │
│                                     ▼                       │
│                            ┌─────────────────┐             │
│                            │   Rust Backend  │             │
│                            │                 │             │
│                            │  - SSH Client   │             │
│                            │  - Command Exec │             │
│                            │  - File I/O     │             │
│                            │  - Parsing      │             │
│                            └─────────────────┘             │
│                                     │                       │
│                                     ▼                       │
│                            ┌─────────────────┐             │
│                            │   Remote Server │             │
│                            │   (via SSH)     │             │
│                            └─────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Layer

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Mantine UI | Component library |
| Framer Motion | Animations |
| Tabler Icons | Icon set |

### Desktop Layer

| Technology | Purpose |
|------------|---------|
| Tauri 2 | Desktop framework |
| Tauri Store | Persistent storage |
| Tauri Shell | System commands |

### Backend Layer

| Technology | Purpose |
|------------|---------|
| Rust | Systems programming |
| ssh2 | SSH protocol |
| serde | Serialization |
| tokio | Async runtime |

## Data Flow

### 1. User Action → SSH Command

```
User clicks "Restart Container"
        │
        ▼
┌──────────────────┐
│ React Component  │
│ (DockerManager)  │
└──────────────────┘
        │
        │ invoke('docker_container_action', {
        │   action: 'restart',
        │   containerName: 'my-app'
        │ })
        ▼
┌──────────────────┐
│  Tauri IPC       │
│  (JavaScript)    │
└──────────────────┘
        │
        │ Serialized command
        ▼
┌──────────────────┐
│  Command Handler │
│  (commands.rs)   │
└──────────────────┘
        │
        │ SSH execute
        ▼
┌──────────────────┐
│  SSH Client      │
│  (ssh.rs)        │
└──────────────────┘
        │
        │ SSH tunnel
        ▼
┌──────────────────┐
│  Remote Server   │
│  docker restart  │
│  my-app          │
└──────────────────┘
```

### 2. Response → UI Update

```
Remote Server returns output
        │
        ▼
┌──────────────────┐
│  SSH Client      │
│  receives output │
└──────────────────┘
        │
        │ Result<String, Error>
        ▼
┌──────────────────┐
│  Command Handler │
│  parses response │
└──────────────────┘
        │
        │ Serialized response
        ▼
┌──────────────────┐
│  Tauri IPC       │
│  (Rust → JS)     │
└──────────────────┘
        │
        │ Promise resolves
        ▼
┌──────────────────┐
│ React Component  │
│ updates state    │
└──────────────────┘
        │
        ▼
UI re-renders with new data
```

## Module Structure

### Frontend Modules

```
src/
├── App.tsx              # Root component, routing
├── main.tsx             # Entry point
├── index.css            # Global styles
├── components/
│   ├── layout/
│   │   ├── NavigationRail.tsx   # Sidebar navigation
│   │   └── TopBar.tsx           # Top bar with status
│   ├── ui/
│   │   ├── LoadingScreen.tsx    # App loading screen
│   │   └── Skeleton.tsx         # Loading skeletons
│   ├── Dashboard.tsx            # System metrics dashboard
│   ├── DockerEnhanced.tsx       # Docker management
│   ├── ServicesManager.tsx      # Systemd services
│   ├── NginxManager.tsx         # Nginx management
│   ├── CronManager.tsx          # Cron jobs
│   ├── LogViewer.tsx            # Log viewing
│   ├── FirewallManager.tsx      # UFW management
│   └── QuickCommands.tsx        # Command shortcuts
├── context/
│   ├── ServerContext.tsx        # Connection state
│   └── ToastContext.tsx         # Notifications
├── types/
│   └── index.ts                 # TypeScript types
└── styles/
    └── modern-theme.css         # Custom theme
```

### Backend Modules

```
src-tauri/src/
├── main.rs              # App entry, command registration
├── ssh.rs               # SSH client implementation
├── types.rs             # Rust type definitions
├── commands.rs          # Tauri command handlers
└── compose_discovery.rs # Docker Compose discovery
```

## Key Components

### SSH Client (`ssh.rs`)

Manages SSH connections to remote servers:

```rust
pub struct SshClient {
    config: ServerProfile,      // Connection details
    session: Arc<Mutex<Option<Session>>>,  // SSH session
}

impl SshClient {
    pub fn connect(&self) -> Result<(), CommandError>
    pub fn execute_command(&self, command: &str) -> Result<String, CommandError>
    pub fn disconnect(&self)
}
```

### Command Handlers (`commands.rs`)

Tauri commands are async functions that:
1. Acquire SSH client from app state
2. Execute commands on remote server
3. Parse and return results

```rust
#[tauri::command]
pub async fn get_system_metrics(state: State<'_, AppState>) -> Result<SystemMetrics, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    
    // Execute commands to gather metrics
    let cpu = client.execute_command("grep -c processor /proc/cpuinfo")?;
    
    Ok(SystemMetrics { cpu, ... })
}
```

### App State

Shared state managed by Tauri:

```rust
pub struct AppState {
    pub ssh_client: Mutex<Option<Arc<SshClient>>>,
    pub server_profiles: Mutex<HashMap<String, ServerProfile>>,
    pub cpu_history: Mutex<Vec<f64>>,
    pub memory_history: Mutex<Vec<f64>>,
    pub network_history: Mutex<Vec<NetworkHistoryPoint>>,
    pub compose_cache: Arc<ComposeDiscoveryCache>,
}
```

## Security Considerations

### Credential Storage

- Credentials stored using Tauri Store
- Backed by system keychain:
  - Windows: Credential Manager
  - macOS: Keychain
  - Linux: libsecret (GNOME Keyring/KWallet)

### SSH Security

- SSH protocol v2 only
- Host key verification
- No password logging
- Private keys never stored

### IPC Security

- All IPC calls validated
- Command injection prevention
- Input sanitization

## Performance Optimizations

### Frontend

- Lazy loading of route components
- Memoized callbacks and values
- Virtual scrolling for large lists
- Debounced API calls

### Backend

- Connection pooling (planned)
- Async command execution
- Efficient output parsing
- Compose file caching

### Network

- Single SSH connection per server
- Command multiplexing
- Output streaming for logs

## Extension Points

### Adding New Features

1. **Define types** in `types.rs`
2. **Create command handler** in `commands.rs`
3. **Register command** in `main.rs`
4. **Create frontend component** in `src/components/`
5. **Add navigation item** in `NavigationRail.tsx`

### Adding New SSH Commands

```rust
// 1. Add command handler
#[tauri::command]
pub async fn my_new_command(state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    
    client.execute_command("your command here")
}

// 2. Register in main.rs
.invoke_handler(tauri::generate_handler![
    my_new_command,
    // ... other commands
])
```

## Testing Strategy

### Unit Tests

- Rust unit tests for parsing logic
- React component tests (planned)

### Integration Tests

- SSH command execution tests
- End-to-end flows (planned)

### Manual Testing

- Cross-platform testing
- SSH connection scenarios
- Error handling verification

---

For more information, see:
- [Getting Started](./GETTING_STARTED.md)
- [Building](./BUILDING.md)
- [Contributing](../CONTRIBUTING.md)
