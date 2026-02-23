# Contributing to DPanel

Thank you for your interest in contributing to DPanel! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)

## 🎯 Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md). Be respectful and inclusive in all interactions.

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your copy of the repository.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/dpanel.git
cd dpanel
```

### 3. Set Up Upstream

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/dpanel.git
git fetch upstream
```

## 💻 Development Setup

### Prerequisites

- **Node.js** 18+ and pnpm (`corepack enable pnpm`)
- **Rust** 1.70+ ([install](https://www.rust-lang.org/tools/install))
- **Tauri dependencies** (see [Tauri docs](https://tauri.app/start/prerequisites/))

### Install Dependencies

```bash
# Install Node dependencies
pnpm install

# Verify Rust setup
cd src-tauri && cargo check
```

### Run Development Mode

```bash
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
```

## 🔧 Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Follow the coding standards below
- Add tests for new functionality
- Update documentation as needed
- Keep changes focused and atomic

### 3. Test Your Changes

```bash
# Check TypeScript
pnpm run build

# Check Rust
cd src-tauri && cargo check

# Test the application
pnpm tauri dev
```

## 📤 Pull Request Process

### 1. Before Submitting

- [ ] Code follows project standards
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] Changes tested locally

### 2. Update Your Branch

```bash
git fetch upstream
git rebase upstream/main
```

### 3. Submit the PR

1. Push to your fork: `git push origin feature/your-feature`
2. Go to GitHub and create a Pull Request
3. Fill out the PR template
4. Link any related issues

### 4. PR Review Process

- Maintainers will review your code
- Address any feedback or requested changes
- Once approved, your PR will be merged

## 📝 Coding Standards

### TypeScript/React

```tsx
// Use functional components with hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  // Use meaningful variable names
  const [isLoading, setIsLoading] = useState(false);
  
  // Add types for function parameters
  const handleAction = async (id: string): Promise<void> => {
    // Implementation
  };
  
  return (
    <Box style={{ padding: '16px' }}>
      {/* Content */}
    </Box>
  );
};
```

**Style guidelines:**
- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Use Mantine components for UI
- Keep components small and focused
- Add comments for complex logic

### Rust

```rust
// Use descriptive variable names
pub async fn get_system_metrics(state: State<'_, AppState>) -> Result<SystemMetrics, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    
    // Add error handling
    let output = client
        .execute_command("command")
        .map_err(|e| e.message)?;
    
    Ok(metrics)
}
```

**Style guidelines:**
- Follow Rust idioms and patterns
- Use proper error handling with `Result`
- Add documentation comments for public functions
- Keep functions focused and small

## ✍️ Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Test additions
- `chore:` - Build/config changes

### Examples

```bash
# Feature
feat(docker): add container restart functionality

# Bug fix
fix(services): handle empty service list correctly

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(ssh): improve error handling in SSH client
```

### Best Practices

- Keep subject line under 72 characters
- Use imperative mood ("add" not "added")
- Don't end subject with period
- Reference issues in footer: `Closes #123`

## 🧪 Testing

### Manual Testing

1. Test on all supported platforms (Windows, Linux, macOS)
2. Verify SSH connections work correctly
3. Test all new features thoroughly
4. Check for regressions in existing functionality

### Testing Checklist

- [ ] Feature works as expected
- [ ] No console errors
- [ ] UI is responsive
- [ ] Error handling works
- [ ] Edge cases handled

## 📚 Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Update this CONTRIBUTING.md for process changes
- Add inline code comments for complex logic
- Update API documentation if endpoints change

## 🆘 Getting Help

- **Questions**: Use [GitHub Discussions](https://github.com/yourusername/dpanel/discussions)
- **Bugs**: Open an [Issue](https://github.com/yourusername/dpanel/issues)
- **Chat**: Check if there's a Discord/Slack channel

## 🎉 Recognition

Contributors will be acknowledged in:
- The README.md contributors section
- Release notes for significant contributions
- The GitHub Contributors page

---

Thank you for contributing to DPanel! 🙏
