# Changelog

All notable changes to DPanel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release
- SSH connection management with password and key authentication
- System dashboard with real-time metrics
- Docker container management
- Systemd service management
- Nginx virtual host management
- Cron job management
- UFW firewall management
- Log viewer with multiple sources
- Docker Compose file discovery with caching

### Changed
- Modern dark UI design
- Collapsible navigation rail
- Improved loading screen with app logo

### Fixed
- Nginx status detection using systemctl
- Service logs fallback to file-based logs
- Navigation icon alignment in collapsed state

## [0.1.0] - 2026-02-22

### Added
- Initial release

#### Core Features
- SSH connection management
  - Password authentication
  - Private key authentication
  - Connection status monitoring
  - Multi-server support (planned)

#### System Monitoring
- Real-time CPU usage
- Memory usage tracking
- Disk usage per mount point
- Load average
- System uptime
- Network statistics

#### Docker Management
- Container listing with status
- Start/stop/restart containers
- Container logs streaming
- Docker images management
- Docker volumes management
- Docker networks overview
- Docker Compose projects discovery

#### Service Management
- List all systemd services
- Filter by status (active/failed/inactive)
- Start/stop/restart services
- Service logs via journalctl

#### Nginx Management
- Status overview (running, version, workers)
- Virtual hosts listing
- Config editor with syntax validation
- Enable/disable sites
- Access and error logs

#### Cron Management
- User crontab editor
- System cron jobs view
- /etc/cron.d management
- Cron folders (daily/weekly/monthly/hourly)
- Schedule presets

#### Firewall Management
- UFW status and configuration
- Add/delete firewall rules
- Enable/disable UFW
- Set default policies
- Listening ports overview

#### Log Viewer
- System logs (journalctl)
- Service-specific logs
- File-based logs
- Search and filter
- Live streaming support

#### Quick Commands
- Pre-defined system commands
- Custom command execution
- Command categories

### Technical
- Built with Tauri 2
- React 18 frontend
- Rust backend
- Mantine UI components
- Framer Motion animations

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

## Version History

| Version | Release Date | Notes |
|---------|--------------|-------|
| 0.1.0   | 2026-02-22   | Initial release |
