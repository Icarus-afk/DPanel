# Product Requirements Document (PRD)

## Product Name
DPanel (working name)

---

## 1. Overview

DPanel is a lightweight desktop application that enables developers to manage VPS servers entirely over SSH without installing any agent or control panel on the server.

It provides:

- Real-time system monitoring
- Docker container management
- Service control (systemd)
- Log streaming
- File management (SFTP over SSH)
- Security overview

The application runs locally and connects securely to remote servers via SSH.

---

## 2. Problem Statement

Managing VPS servers via raw SSH requires:

- Multiple terminal sessions
- Manual execution of repetitive commands
- Manual parsing of system metrics
- No structured Docker overview
- No unified visual interface

Existing tools such as cPanel and Webmin require installation on the server and increase system complexity and attack surface.

There is a need for a secure, agentless, SSH-only graphical VPS management tool that:

- Requires no server-side installation
- Uses standard SSH access
- Provides structured monitoring and management

---

## 3. Goals

### Primary Goals

- Provide complete VPS visibility through SSH only
- Require no server-side installation
- Support secure SSH authentication (key and password)
- Deliver a lightweight desktop experience
- Provide safe, structured system operations

### Secondary Goals

- Multi-server support
- Modern, clean UI
- Modular feature architecture
- Strong error handling and resilience

---

## 4. Non-Goals

- Cloud infrastructure provisioning
- Kubernetes cluster management
- CI/CD pipeline automation
- Web-hosted SaaS version (initial release)
- Replacement for enterprise-grade DevOps platforms

---

## 5. Target Users

### 5.1 Indie Developers
- Manage 1–10 VPS instances
- Run Docker-based applications
- Need fast access to logs and restarts
- Prefer minimal server exposure

### 5.2 Students and Learners
- Learning DevOps and infrastructure
- Need visual understanding of system metrics
- Require safe and structured tooling

---

## 6. Functional Requirements

### 6.1 Authentication & Connection

- Add, edit, and delete server profiles
- SSH authentication via:
  - Private key
  - Password
- Encrypted credential storage
- Test connection functionality
- Connection status indicator
- Graceful reconnection handling

---

### 6.2 System Dashboard

Display:

- CPU usage percentage
- RAM usage (used/total)
- Disk usage per mount
- Load average
- Uptime
- Running process count

Requirements:

- Configurable refresh interval (default: 5 seconds)
- Non-blocking background polling
- Error handling for unreachable hosts

---

### 6.3 Docker Management

- List containers
- Display:
  - Container name
  - Status
  - CPU usage
  - Memory usage
- Start, stop, and restart containers
- View live container logs
- List Docker images
- Remove container with confirmation

---

### 6.4 Service Management (systemd)

- List services
- Show service status (active, inactive, failed)
- Restart service
- Enable or disable service
- View service logs

---

### 6.5 Log Viewer

- Stream logs in real time
- Select log source:
  - System logs
  - Service logs
  - Custom file path
- Search and filter logs
- Pause and resume streaming
- Download logs locally

---

### 6.6 File Manager

- Browse remote directories
- Upload files
- Download files
- Inline text editing
- Change file permissions
- Delete files with confirmation

---

### 6.7 Security Panel

Display:

- Open ports
- Firewall status
- Active SSH sessions
- Recent login attempts

---

## 7. Non-Functional Requirements

- UI must remain responsive during SSH operations
- All remote commands must have timeout handling
- Credentials must be securely stored and encrypted
- Destructive actions must require explicit confirmation
- Target memory usage below 200MB
- Cross-platform support (Windows and Linux initially)

---

## 8. Technical Architecture

Frontend:
- React

Desktop Framework:
- Tauri

Backend:
- Rust-based SSH execution layer

Communication:
- Secure IPC bridge between frontend and backend

SSH Layer:
- Command abstraction layer
- Output parsing module
- Structured error handling

---

## 9. UX Requirements

Layout:

Left sidebar:
- Dashboard
- Docker
- Services
- Logs
- Files
- Security
- Settings

Top bar:
- Active server name
- Connection status
- Disconnect button

Theme:
- Dark mode default
- Minimal, clean interface

---

## 10. Security Considerations

- No plaintext credential storage
- No command logging unless explicitly enabled
- Optional read-only mode
- Confirmation required for:
  - Container removal
  - File deletion
  - Service disable
  - Firewall modification

---

## 11. MVP Scope (Version 0.1)

Included:

- SSH connection management
- System dashboard
- Docker container list and restart
- Basic log streaming

Excluded:

- File manager
- Security dashboard
- Multi-server support

---

## 12. Success Metrics

- Fully manage a personal VPS using only the application
- Reduce manual SSH usage time by at least 50%
- Stable operation for extended monitoring sessions
