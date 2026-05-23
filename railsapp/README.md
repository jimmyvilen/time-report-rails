# Time Report

A time tracking and task management web application built with Rails. Log work time against tasks, write daily notes, and optionally sync with Jira.

## Features

- Daily time entry view with weekly summary
- Task management with favorites and archiving
- Flexible time input: start/end times or duration
- Daily notes
- Jira integration: fetch issue details and push time logs
- User authentication

## Tech Stack

- **Ruby** 3.4.8 / **Rails** 8.1.3
- **Database**: SQLite3
- **Frontend**: TailwindCSS, Turbo, Stimulus

## Setup

```bash
bin/setup          # Install dependencies, prepare database
bin/dev            # Start development server with asset bundling
```

To reset the database:

```bash
bin/setup --reset
```

## Running tests

```bash
bin/rails test
```

## Security analysis

```bash
bundle exec brakeman
```
