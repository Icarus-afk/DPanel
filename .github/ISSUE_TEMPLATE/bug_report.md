---
name: 🐛 Bug Report
description: Create a report to help us improve
title: "[Bug]: "
labels: ["bug", "triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
      placeholder: Tell us what you see!
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. Scroll down to '...'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: A clear and concise description of what you expected to happen.
    validations:
      required: true

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, add screenshots to help explain your problem.
    validations:
      required: false

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      description: Which operating system are you using?
      options:
        - Windows 10
        - Windows 11
        - macOS
        - Linux (Ubuntu/Debian)
        - Linux (Arch/Fedora)
        - Other Linux
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: DPanel Version
      description: What version of DPanel are you using?
      placeholder: v0.1.0
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code.
      render: shell
    validations:
      required: false

  - type: textarea
    id: context
    attributes:
      label: Additional context
      description: Add any other context about the problem here.
    validations:
      required: false
