# Building DPanel

This guide covers building DPanel for production and distribution.

## Prerequisites

Ensure you have all prerequisites from [GETTING_STARTED.md](./GETTING_STARTED.md) installed.

## Quick Build

For most users, this single command will build DPanel for your current platform:

```bash
pnpm tauri build
```

Built artifacts will be in `src-tauri/target/release/bundle/`.

## Platform-Specific Builds

### Windows

#### Requirements

- Windows 10/11
- Visual Studio 2022 with "Desktop development with C++"
- WebView2 (usually pre-installed)

#### Build Commands

```bash
# Build MSI installer
pnpm tauri build --target x86_64-pc-windows-msvc

# Build NSIS installer (alternative)
pnpm tauri build --target x86_64-pc-windows-msvc
```

#### Output

- `src-tauri/target/release/bundle/msi/*.msi`
- `src-tauri/target/release/bundle/nsis/*.exe`

### macOS

#### Requirements

- macOS 10.15+
- Xcode Command Line Tools
- Apple Developer ID (for signing, optional)

#### Build Commands

```bash
# Build DMG
pnpm tauri build --target x86_64-apple-darwin

# Build for Apple Silicon
pnpm tauri build --target aarch64-apple-darwin

# Build universal binary
pnpm tauri build
```

#### Output

- `src-tauri/target/release/bundle/dmg/*.dmg`
- `src-tauri/target/release/bundle/macos/*.app`

#### Code Signing (Optional)

To sign the app for distribution:

1. Get an Apple Developer ID
2. Configure in `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name"
      }
    }
  }
}
```

### Linux

#### Requirements

- GTK 3, WebKit2GTK, libappindicator
- See platform-specific packages in GETTING_STARTED.md

#### Build Commands

```bash
# Build DEB package (Debian/Ubuntu)
pnpm tauri build --target x86_64-unknown-linux-gnu

# Build RPM package (Fedora/openSUSE)
# Configure in tauri.conf.json
```

#### Output

- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/appimage/*.AppImage`
- `src-tauri/target/release/bundle/rpm/*.rpm` (if configured)

#### Install DEB Package

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/dpanel_*.deb
```

#### Install RPM Package

```bash
sudo dnf install src-tauri/target/release/bundle/rpm/dpanel-*.rpm
```

## Build Configuration

### tauri.conf.json

Key configuration options:

```json
{
  "productName": "DPanel",
  "version": "0.1.0",
  "identifier": "com.dpanel.app",
  "bundle": {
    "active": true,
    "targets": ["deb", "appimage", "msi", "dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "category": "DeveloperTool",
    "shortDescription": "VPS Management Tool",
    "longDescription": "Lightweight desktop VPS management over SSH"
  }
}
```

### Cargo.toml

Rust build configuration:

```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"  # Optimize for size
```

## Build Optimization

### Reduce Binary Size

1. **Enable LTO** (Link Time Optimization):
   Already enabled in `Cargo.toml`

2. **Strip symbols**:
   ```bash
   strip src-tauri/target/release/dpanel
   ```

3. **Use musl for static linking** (Linux):
   ```bash
   rustup target add x86_64-unknown-linux-musl
   pnpm tauri build --target x86_64-unknown-linux-musl
   ```

### Improve Build Times

1. **Use sccache** (shared compilation cache):
   ```bash
   cargo install sccache
   export RUSTC_WRAPPER=sccache
   ```

2. **Incremental compilation** (debug builds only):
   Already enabled by default

## Troubleshooting

### "WebView2 not found" (Windows)

Install WebView2: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### "Library not loaded" (macOS)

Ensure all dependencies are installed:
```bash
xcode-select --install
```

### "No such file or directory" (Linux)

Install required packages (see GETTING_STARTED.md):
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev
```

### Build fails with "out of memory"

Reduce parallelism:
```bash
export CARGO_BUILD_JOBS=2
pnpm tauri build
```

### Icons not showing

Ensure icons exist in `src-tauri/icons/`:
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `32x32.png`, `128x128.png`, etc. (all platforms)

## Distribution

### GitHub Releases

1. Tag the release:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. GitHub Actions will automatically build and create a draft release

3. Review and publish the release

### Manual Distribution

1. Build for all target platforms
2. Collect binaries from `src-tauri/target/release/bundle/`
3. Upload to your distribution channel

### Checksums

Generate checksums for release artifacts:

```bash
# SHA256
sha256sum dpanel_*.deb dpanel_*.AppImage dpanel_*.msi dpanel_*.dmg > SHA256SUMS

# Verify
sha256sum -c SHA256SUMS
```

## Continuous Integration

GitHub Actions workflows are configured in `.github/workflows/`:

- `ci.yml` - Build and test on PR/merge
- `release.yml` - Auto-build releases on tags

## Next Steps

- [Getting Started](./GETTING_STARTED.md) - Development setup
- [Architecture](./ARCHITECTURE.md) - Understanding the codebase
- [Contributing](../CONTRIBUTING.md) - How to contribute
