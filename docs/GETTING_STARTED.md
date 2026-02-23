# Getting Started with DPanel

This guide will help you set up DPanel for development or personal use.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | [pnpm.io](https://pnpm.io) |
| Rust | 1.70+ | [rust-lang.org](https://www.rust-lang.org/tools/install) |

### Platform-Specific Dependencies

#### Windows

- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed)
- Visual Studio Build Tools with C++ workload

#### macOS

- Xcode Command Line Tools: `xcode-select --install`

#### Linux (Debian/Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libgtk-3-dev \
    libayatana-appindicator3-dev
```

#### Linux (Fedora)

```bash
sudo dnf install -y \
    webkit2gtk4.1-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    patchelf
```

#### Linux (Arch)

```bash
sudo pacman -S --needed \
    webkit2gtk-4.1 \
    libappindicator-gtk3 \
    librsvg \
    patchelf
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dpanel.git
cd dpanel
```

### 2. Install Dependencies

```bash
# Enable pnpm (if not already enabled)
corepack enable pnpm

# Install Node.js dependencies
pnpm install
```

### 3. Verify Rust Setup

```bash
cd src-tauri
cargo check
cd ..
```

## Development

### Start Development Server

```bash
pnpm tauri dev
```

This will:
1. Start the Vite dev server for the frontend
2. Build and launch the Tauri desktop app
3. Enable hot-reloading for frontend changes

### Project Structure

```
dpanel/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   │   ├── layout/        # Layout components
│   │   ├── ui/            # Reusable UI components
│   │   └── *.tsx          # Feature components
│   ├── context/           # React context providers
│   ├── types/             # TypeScript type definitions
│   ├── styles/            # CSS styles
│   └── App.tsx            # Main app component
├── src-tauri/             # Rust backend source
│   ├── src/
│   │   ├── commands.rs    # Tauri command handlers
│   │   ├── ssh.rs         # SSH client implementation
│   │   ├── types.rs       # Rust type definitions
│   │   └── main.rs        # Application entry point
│   ├── icons/             # App icons
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── docs/                  # Documentation
├── .github/               # GitHub templates & workflows
├── package.json           # Node.js dependencies & scripts
└── tsconfig.json          # TypeScript configuration
```

### Making Changes

#### Frontend Changes

1. Edit files in `src/`
2. Changes hot-reload automatically
3. Check the browser DevTools for errors

#### Backend Changes

1. Edit files in `src-tauri/src/`
2. The app will rebuild automatically
3. Check the terminal for Rust compilation errors

### Debugging

#### Frontend Debugging

Open DevTools in the app:
- **Windows/Linux**: `Ctrl+Shift+I`
- **macOS**: `Cmd+Option+I`

#### Backend Debugging

Add debug logging in Rust:

```rust
log::info!("Debug message: {:?}", value);
```

View logs in the terminal where `pnpm tauri dev` is running.

## Building for Production

### Build All Platforms

```bash
pnpm tauri build
```

### Build Specific Platform

```bash
# Windows
pnpm tauri build --target x86_64-pc-windows-msvc

# Linux
pnpm tauri build --target x86_64-unknown-linux-gnu

# macOS
pnpm tauri build --target x86_64-apple-darwin
```

### Output Locations

Built applications are located in:

```
src-tauri/target/release/bundle/
├── deb/          # Debian package (.deb)
├── appimage/     # AppImage (.AppImage)
├── dmg/          # macOS disk image (.dmg)
├── msi/          # Windows installer (.msi)
└── nsis/         # Windows installer (.exe)
```

## Testing

### Run Tests

```bash
# Frontend tests (if configured)
pnpm test

# Backend tests
cd src-tauri && cargo test
```

### Manual Testing Checklist

Before submitting changes, test:

- [ ] App launches without errors
- [ ] SSH connection works (password auth)
- [ ] SSH connection works (key auth)
- [ ] All navigation items work
- [ ] No console errors in DevTools
- [ ] UI is responsive at different window sizes

## Common Issues

### "Failed to find WebView2"

Install WebView2 from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### "No such file or directory: libwebkit2gtk"

Install the Linux dependencies listed above.

### "pnpm: command not found"

Enable pnpm: `corepack enable pnpm`

Or install globally: `npm install -g pnpm`

### "Rust compilation failed"

Update Rust: `rustup update`

### Port Already in Use

The dev server uses port 1420 by default. To change it:

1. Edit `vite.config.ts`
2. Change the `port` value

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
- Read [BUILDING.md](./BUILDING.md) for detailed build instructions
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines

## Getting Help

- **Documentation**: Browse the `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/yourusername/dpanel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dpanel/discussions)
