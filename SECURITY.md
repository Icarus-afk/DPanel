# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of DPanel seriously. If you believe you've found a security vulnerability, please follow these guidelines:

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email**: [INSERT SECURITY EMAIL]
2. **GitHub Private Vulnerability Reporting**: Use the "Report a vulnerability" feature in the Security tab

### What to Include

Please include the following information in your report:

- **Description**: A clear description of the vulnerability
- **Affected Version**: Which version(s) are affected
- **Impact**: What an attacker could achieve
- **Reproduction Steps**: Detailed steps to reproduce the issue
- **Proof of Concept**: Code or screenshots if applicable
- **Suggested Fix**: If you have suggestions for fixing the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Depends on severity (see below)

### Severity Levels

| Severity | Description | Target Resolution |
|----------|-------------|-------------------|
| Critical | Remote code execution, auth bypass | 7 days |
| High | Privilege escalation, data access | 14 days |
| Medium | XSS, CSRF, information disclosure | 30 days |
| Low | Minor information leakage | 60 days |

## Security Best Practices for Users

### SSH Connection Security

- Use SSH key authentication instead of passwords when possible
- Use strong, unique passphrases for SSH keys
- Regularly rotate SSH keys
- Use ed25519 or RSA 4096-bit keys minimum

### Credential Storage

- DPanel stores credentials encrypted using system keychain
- On Linux: Uses libsecret (GNOME Keyring / KWallet)
- On Windows: Uses Windows Credential Manager
- On macOS: Uses Keychain

### Network Security

- All connections are direct SSH - no intermediate servers
- No telemetry or data collection
- Credentials never leave your local machine

### File Permissions

Ensure proper permissions on sensitive files:

```bash
# SSH key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# DPanel config (if created)
chmod 600 ~/.config/dpanel/*
```

## Security Features

### Implemented Security Measures

- ✅ Encrypted credential storage (system keychain)
- ✅ No plaintext credential storage
- ✅ SSH protocol v2 only
- ✅ Host key verification
- ✅ No command logging by default
- ✅ Confirmation for destructive actions

### Planned Security Enhancements

- [ ] Read-only mode option
- [ ] Session timeout
- [ ] Audit logging (opt-in)
- [ ] Two-factor authentication for app access
- [ ] Automatic security updates

## Vulnerability Disclosure Policy

We follow a coordinated disclosure process:

1. Reporter submits vulnerability report
2. Security team validates and assesses the report
3. We develop and test a fix
4. Fix is deployed to supported versions
5. Public disclosure after 30 days (or by mutual agreement)

### Recognition

We believe in recognizing security researchers who help improve our security. With your permission, we will:

- Credit you in our security advisories
- List you in our SECURITY_THANKS.md file
- Provide a swag pack for significant findings

## Security Advisories

Security advisories will be published in:

- GitHub Security Advisories section
- GitHub Releases page
- [Security mailing list - if created]

## Contact

For security-related questions not covered by a vulnerability report:

- **Email**: ehasan.ahmed01@gmail.com
- **Twitter**: [@HANDLE - if applicable]

---

**Last Updated**: February 2026
