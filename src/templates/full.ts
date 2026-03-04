export const FULL_CRON_YAML = `spec_version: "0.1.0"
name: my-project-cron
description: "Scheduled tasks for my project"

schedules:
  - name: nightly-code-review
    description: "Run code review agent daily"
    cron: "0 2 * * *"
    enabled: true
    category: maintenance
    agent: code-reviewer
    adapter: claude
    prompt: "Review all open PRs"
    agent_source:
      type: local
      path: "./agents/code-reviewer"
    branch:
      strategy: pr
      base: main
      name_template: "gitcron/{{name}}/{{date}}"
      pr_title: "gitcron: {{name}} — {{date}}"
      pr_labels: [automated, gitcron]
    env:
      NODE_ENV: production
    secrets: [OPENAI_API_KEY]
    timeout: 300
    retry:
      max_attempts: 2
    notify:
      on_failure:
        - type: issue
          title: "gitcron: {{name}} failed"
          labels: [bug, gitcron]

  - name: weekly-lint
    description: "Run linting every Monday"
    cron: "0 6 * * 1"
    enabled: true
    category: quality
    command: "npm run lint -- --fix"
    branch:
      strategy: commit
      base: main
    timeout: 120

tasks:
  directory: ".gitcron/tasks"
  states: [pending, in_progress, review, done, cancelled]
  transitions:
    pending: [in_progress, cancelled]
    in_progress: [review, done, cancelled]
    review: [in_progress, done]
    done: []
    cancelled: []

reminders:
  - name: quarterly-model-review
    description: "Quarterly model validation reminder"
    type: recurring
    cron: "0 9 1 */3 *"
    action:
      type: issue
      title: "Quarterly Model Validation Due"
      body: "Time for quarterly model validation per SR 11-7."
      labels: [compliance, reminder]
      assignees: [model-risk-team]

  - name: onboarding-followup
    description: "One-time onboarding check-in"
    type: one-shot
    at: "2026-03-12T09:00:00Z"
    action:
      type: issue
      title: "Onboarding: How is the setup going?"

settings:
  workflow_dir: ".github/workflows"
  workflow_prefix: "gitcron-"
  commit_author:
    name: "gitcron[bot]"
    email: "gitcron[bot]@users.noreply.github.com"
`;
