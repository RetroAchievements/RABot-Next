# Contributing to RABot

Thank you for your interest in contributing to RABot! This document provides guidelines and instructions for contributing to the official RetroAchievements Discord bot.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.2.18 or higher
- A Discord application for testing (create one at [Discord Developer Portal](https://discord.com/developers/applications))
- Basic knowledge of TypeScript and Discord.js

### Setting Up Your Development Environment

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR-USERNAME/RABot.git
   cd RABot
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Discord bot token and other required configuration.

4. **Initialize the database**

   ```bash
   bun db:generate
   bun db:migrate
   bun db:seed  # Optional: adds default teams
   ```

5. **Deploy slash commands to your test server**

   ```bash
   bun deploy-commands
   ```

6. **Run the bot in development mode**
   ```bash
   bun dev
   ```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- **Follow the existing code style** - The project uses ESLint and Prettier for consistency.
- **Write TypeScript** - All code must be properly typed.
- **Add tests** - New functionality should include tests.
- **Update documentation** - Keep README and JSDoc comments up to date.

### 3. Run Quality Checks

Before committing, ensure your code passes all checks:

```bash
bun run verify  # Runs lint, type checking, and tests
```

Individual checks:

```bash
bun lint        # Check code style
bun lint:fix    # Auto-fix style issues
bun tsc         # TypeScript type checking
bun test        # Run tests
```

### 4. Commit Your Changes

- Use **conventional commits** format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `test:` for test additions/changes
  - `refactor:` for code refactoring
  - `chore:` for maintenance tasks

Examples:

```bash
git commit -m "feat: add team export command"
git commit -m "fix: handle empty poll options correctly"
git commit -m "docs: update setup instructions for Bun 1.3"
```

### 5. Push and Create a Pull Request

1. Push your branch to your fork
2. Open a pull request against the `main` branch
3. Fill out the pull request template with:
   - Clear description of changes
   - Testing instructions
   - Any breaking changes
   - Related issues

## Code Standards

### TypeScript Guidelines

- Use strict TypeScript settings (already configured).
- Define interfaces for all data structures.
- Avoid `any` type - use `unknown` if type is truly unknown.
- Prefer `interface` over `type` for object shapes.

### Project Structure

- **Commands** go in `src/commands/` (legacy) or `src/slash-commands/` (preferred).
- **Business logic** belongs in `src/services/`.
- **Shared utilities** go in `src/utils/`.
- **Database operations** use the service layer pattern.

### Command Development

When creating new commands:

1. **Prefer slash commands** over legacy prefix commands.
2. Use the `SlashCommand` interface from `src/models/`.
3. Include proper error handling and user feedback.
4. Add cooldowns where appropriate.
5. Consider guild restrictions if command is server-specific.

Example slash command structure:

```typescript
import type { SlashCommand } from "../models";

export default {
  data: new SlashCommandBuilder().setName("example").setDescription("Example command"),

  cooldown: 5,

  async execute(interaction, client) {
    // Command logic here
  },
} satisfies SlashCommand;
```

### Testing

- Write tests for services and utilities.
- Use the existing mock utilities in `src/test/mocks/`.
- Test both success and error cases.
- Keep tests focused and independent.

### Comments and Documentation

- Comments should explain "why", not "what".
- Add JSDoc comments for public functions and complex logic.

## Pull Request Guidelines

### Before Submitting

- [ ] Code passes `bun run verify`.
- [ ] Tests are included for new functionality.
- [ ] Documentation is updated if needed.
- [ ] No console.logs or debug code left in.
- [ ] Commit messages follow conventional format.

### PR Description Should Include

1. **What** - Brief summary of changes.
2. **Why** - Motivation and context.
3. **How** - Technical approach if non-obvious.
4. **Testing** - How to test the changes.
5. **Breaking Changes** - Any compatibility issues.

### Review Process

- PRs require at least one approval.
- Address reviewer feedback promptly.
- Keep PRs focused - one feature/fix per PR.
- Be open to suggestions and constructive criticism.

## Community Guidelines

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## Getting Help

- Check existing issues and discussions first.
- Join our [Discord server](https://discord.gg/dq2E4hE) for community support.
- Use clear, descriptive titles for issues.
- Provide reproduction steps for bugs.

## Recognition

Contributors will be recognized in our release notes and documentation. Thank you for helping improve RABot!
