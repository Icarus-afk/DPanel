---
name: 📝 Documentation Improvement
description: Suggest improvements to documentation
title: "[Docs]: "
labels: ["documentation"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for helping to improve our documentation!

  - type: dropdown
    id: type
    attributes:
      label: Type of improvement
      description: What type of documentation improvement are you suggesting?
      options:
        - Fix incorrect information
        - Add missing documentation
        - Improve clarity
        - Add examples
        - Fix typos/grammar
        - Other
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Describe what documentation needs to be improved and why.
    validations:
      required: true

  - type: input
    id: file
    attributes:
      label: Affected File(s)
      description: Which documentation file(s) are affected?
      placeholder: e.g., README.md, docs/GETTING_STARTED.md
    validations:
      required: false
