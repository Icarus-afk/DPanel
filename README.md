# DPanel

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-latest-orange?logo=rust&logoColor=white)](https://www.rust-lang.org)

**Lightweight desktop VPS management tool over SSH**

DPanel is a modern desktop application that enables developers to manage VPS servers entirely over SSH without installing any agent or control panel on the server. Built with Tauri 2, React, and Rust.

## Features

### Secure SSH Connection

- Password and private key authentication
- Encrypted credential storage
- Connection status monitoring
- Multi-server support with saved profiles

### System Dashboard

- Real-time CPU, memory, and disk usage metrics
- Load average and system uptime
- Network statistics with traffic monitoring
- Interactive performance charts

### Docker Management

- Container management (start/stop/restart)
- Real-time CPU and memory usage per container
- Container logs with streaming
- Docker images, volumes, and networks overview
- Docker Compose project discovery and inspection

### Service Management

- Systemd services listing and filtering
- Service control (start/stop/restart)
- Service logs via journalctl
- Filter by status (active/failed/inactive)

### Nginx Manager

- Status overview (running state, version, worker processes)
- Virtual hosts management
- Configuration editor with syntax validation
- Enable/disable sites
- Access and error log viewing

### Cron Job Manager

- User crontab editor
- System cron jobs inspection
- /etc/cron.d job management
- Cron folder browsing (daily/weekly/monthly)
- Common schedule presets

### Firewall Management

- UFW status and configuration
- Firewall enable/disable
- Rule management (add/delete)
- Port-based rule creation
- Listening ports overview

### Log Viewer

- System logs via journalctl
- Service-specific logs
- File-based log viewing
- Search and filtering capabilities
- Live log streaming with auto-scroll

### Quick Commands

- Pre-defined system administration commands
- Custom command execution
- Categorized command library
- Output viewing and export

### Infrastructure Graph

- Visual representation of nginx to Docker container relationships
- Proxy configuration and data flow visualization
- Container network and volume tracking
- Real-time status indicators

## Quick Start

### Prerequisites

- **Node.js** 18+ and pnpm
- **Rust** 1.70+ ([installation guide](https://www.rust-lang.org/tools/install))
- **Tauri CLI** (`cargo install tauri-cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dpanel.git
cd dpanel

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Download Pre-built Binaries

Pre-built binaries are available for:

- **Windows**: .msi, .exe installers
- **Linux**: .deb, .AppImage, .rpm packages
- **macOS**: .dmg, .app bundles

Visit the [Releases](https://github.com/yourusername/dpanel/releases) page to download the appropriate package for your system.

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md) - Setup and installation guide
- [Building](./docs/BUILDING.md) - Build instructions for all platforms
- [Architecture](./docs/ARCHITECTURE.md) - Technical architecture overview

## Technology Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React 18, Mantine UI, React Flow        |
| Desktop      | Tauri 2                                 |
| Backend      | Rust, ssh2                              |
| State        | React Context, Tauri Store              |
| Animations   | Framer Motion                           |

## Project Structure

```
dpanel/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── infrastructure-graph/ # Infrastructure visualization
│   │   ├── layout/               # Navigation and top bar
│   │   └── ui/                   # Reusable UI components
│   ├── context/                  # React context providers
│   ├── types/                    # TypeScript type definitions
│   └── App.tsx                   # Main application component
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands.rs           # Tauri commands
│   │   ├── infrastructure_graph.rs
│   │   ├── ssh.rs                # SSH client implementation
│   │   ├── types.rs              # Rust type definitions
│   │   └── main.rs               # Application entry point
│   └── Cargo.toml
├── docs/                         # Documentation
├── CONTRIBUTING.md               # Contribution guidelines
├── CODE_OF_CONDUCT.md            # Code of conduct
├── SECURITY.md                   # Security policy
└── package.json
```

## Contributing

Contributions are welcome. Please review the [Contributing Guide](./CONTRIBUTING.md) for details on the contribution process and development guidelines.

### Getting Started with Development

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dpanel.git
cd dpanel

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git commit -m "feat: add new feature"

# Push and create pull request
git push origin feature/your-feature-name
```

### Development Guidelines

- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)
- Write clear, descriptive commit messages
- Add tests for new functionality
- Update documentation as needed

## Security

Security is a priority for DPanel. Please review [SECURITY.md](./SECURITY.md) for the security policy and vulnerability reporting process.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app) - Desktop application framework
- [Mantine](https://mantine.dev) - UI component library
- [React Flow](https://reactflow.dev) - Graph visualization
- [ssh2](https://crates.io/crates/ssh2) - Rust SSH library

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/dpanel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dpanel/discussions)

---

DPanel - Built with Tauri, React, and Rust
