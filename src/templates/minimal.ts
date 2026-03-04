export const MINIMAL_CRON_YAML = `spec_version: "0.1.0"
name: my-project-cron
description: "Scheduled tasks for my project"

schedules:
  - name: nightly-task
    description: "Run a task every night"
    cron: "0 2 * * *"
    command: "echo 'Hello from gitcron'"
    branch:
      strategy: none
`;
