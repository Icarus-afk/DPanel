# DPanel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-latest-orange?logo=rust&logoColor=white)](https://www.rust-lang.org)

> **Lightweight desktop VPS management tool over SSH**

DPanel is a modern desktop application that enables developers to manage VPS servers entirely over SSH without installing any agent or control panel on the server. Built with Tauri 2, React, and Rust.

## ✨ Features

### 🔐 Secure SSH Connection
- Password and private key authentication
- Encrypted credential storage
- Connection status monitoring
- Multi-server support

### 📊 System Dashboard
- Real-time CPU, RAM, and disk usage
- Load average and uptime
- Network statistics
- Interactive charts

### 🐳 Docker Management
- Container list and status
- Start/stop/restart containers
- Container logs streaming
- Docker images and volumes
- Docker networks overview
- Docker Compose projects discovery

### ⚙️ Service Management
- Systemd services list
- Start/stop/restart services
- Service logs via journalctl
- Filter by status (active/failed/inactive)

### 🌐 Nginx Manager
- Status overview (running, version, workers)
- Virtual hosts management
- Config editor with validation
- Enable/disable sites
- Access and error logs

### ⏰ Cron Job Manager
- User crontab editor
- System cron jobs view
- /etc/cron.d management
- Cron folders (daily/weekly/monthly)
- Schedule presets

### 🔒 Firewall Management
- UFW status and rules
- Enable/disable firewall
- Add/delete rules
- Port management
- Listening ports overview

### 📝 Log Viewer
- System logs (journalctl)
- Service-specific logs
- File-based logs
- Search and filter
- Live streaming

### 💻 Quick Commands
- Pre-defined system commands
- Custom command execution
- Command categories

### 📊 Infrastructure Graph
- Visualize nginx → Docker container relationships
- See proxy configurations and data flow
- Track container networks and volumes
- Real-time status monitoring

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and pnpm
- **Rust** 1.70+ ([install](https://www.rust-lang.org/tools/install))
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

Visit the [Releases](https://github.com/yourusername/dpanel/releases) page for pre-built binaries for:
- Windows (.msi, .exe)
- Linux (.deb, .AppImage, .rpm)
- macOS (.dmg, .app)

## 📖 Documentation

- [Getting Started](./docs/GETTING_STARTED.md) - Setup and installation guide
- [Building](./docs/BUILDING.md) - Build instructions for all platforms
- [Architecture](./docs/ARCHITECTURE.md) - Technical architecture overview

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Mantine UI, Tabler Icons, React Flow |
| Desktop | Tauri 2 |
| Backend | Rust, ssh2 |
| State | React Context, Tauri Store |
| Animations | Framer Motion |

## 📁 Project Structure

```
dpanel/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── infrastructure-graph/  # Infrastructure visualization
│   │   ├── layout/         # Navigation and layout
│   │   └── ui/             # Reusable UI components
│   ├── context/            # React context providers
│   ├── types/              # TypeScript types
│   └── App.tsx
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri commands
│   │   ├── infrastructure_graph.rs  # Infrastructure visualization
│   │   ├── ssh.rs          # SSH client
│   │   ├── types.rs        # Rust types
│   │   └── main.rs
│   └── Cargo.toml
├── docs/                   # Documentation
└── package.json
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Start for Contributors

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dpanel.git
cd dpanel

# Create a branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Development Guidelines

- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for security policy and vulnerability reporting.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app) - Desktop framework
- [Mantine](https://mantine.dev) - UI components
- [Tabler Icons](https://tabler-icons.io) - Icons
- [ssh2](https://crates.io/crates/ssh2) - Rust SSH library

## 📬 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/dpanel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dpanel/discussions)

---

<p align="center">Made with ❤️ using Tauri + React + Rust</p>
