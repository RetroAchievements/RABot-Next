<p align="center" dir="auto"><a href="https://retroachievements.org" rel="nofollow"><img src="https://raw.githubusercontent.com/RetroAchievements/RAWeb/master/public/assets/images/ra-icon.webp" width="200" alt="RetroAchievements Logo" style="max-width: 100%;"></a></p>

<h1 align="center">RABot</h1>

<p align="center">
  <i>The official RetroAchievements Discord bot.</i>
  <br /><br />
</p>

<p align="center">
  <a href="https://discord.gg/dq2E4hE"><strong>Join our Discord</strong></a>
  <br />
</p>

<hr />

## About

**RABot** is the official [RetroAchievements Discord](https://discord.gg/dq2E4hE) bot. It serves the RetroAchievements community with various utility commands, polls, and integration features.

RABot utilizes:

- The **[Bun](https://bun.sh)** runtime for high speed, low memory footprint, and native TS execution
- **[TypeScript](https://www.typescriptlang.org/)** for static type safety
- **[Discord.js](https://discord.js.org/)** for tight integration with Discord
- **[Drizzle ORM](https://orm.drizzle.team/)** with SQLite for data persistence
- **[@retroachievements/api](https://github.com/RetroAchievements/api-js)** for web API calls
- **[Pino](https://getpino.io/#/)** for structured logging with command analytics

## Requirements

- [Bun](https://bun.sh) 1.2.18+
- A Discord bot token

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/RetroAchievements/RABot-Next.git
cd RABot-Next
bun install
```

## Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your configuration:

- `DISCORD_TOKEN` - Your bot's token from Discord Developer Portal
- `DISCORD_APPLICATION_ID` - Your bot's application ID from Discord Developer Portal
- `LEGACY_COMMAND_PREFIX` - Command prefix for legacy commands (default: `!`)
- `RA_WEB_API_KEY` - Your RetroAchievements Web API key
- `YOUTUBE_API_KEY` - Your YouTube Data API v3 key (optional, for `/gan` longplay searches)
- `MAIN_GUILD_ID` - Discord guild ID for the main RetroAchievements server
- `WORKSHOP_GUILD_ID` - Discord guild ID for the RetroAchievements Workshop server
- `NODE_ENV` - Environment mode: `development` or `production` (default: `development`)
- `LOG_LEVEL` - Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `debug` in dev, `info` in prod)

## Database Setup

Initialize the database:

```bash
bun db:generate  # Generate migration files
bun db:migrate   # Apply migrations
bun db:seed      # Seed default teams (optional)
```

## Deploying Slash Commands

After adding your bot to a server, deploy the slash commands:

```bash
bun deploy-commands
```

This needs to be run:

- When you first set up the bot
- Whenever you add or modify slash commands
- After major Discord.js updates

## Running the Bot

### Development

```bash
bun dev  # Runs with auto-restart on file changes
```

### Production

```bash
bun start  # Standard run
```

For production deployments, the bot is automatically deployed via Forge when changes are merged to the main branch. The bot runs under a process supervisor on the production server.

## Available Scripts

- `bun dev` - Run in development mode with hot reload
- `bun start` - Run in production mode
- `bun deploy-commands` - Deploy slash commands to Discord
- `bun db:generate` - Generate database migrations
- `bun db:migrate` - Apply database migrations
- `bun lint` - Run ESLint
- `bun lint:fix` - Run ESLint with auto-fix
- `bun tsc` - Run TypeScript type checking
- `bun test` - Run all tests
- `bun test:watch` - Run tests in watch mode
- `bun verify` - Run lint, type checking, and tests (comprehensive check)

## Commands

### 🆕 Migration Notice

RABot is transitioning to slash commands! When you use a legacy prefix command (e.g., `!gan`), you'll see a migration notice encouraging you to use the modern slash command version (e.g., `/gan`). The legacy command will still work during the transition period.

### Slash Commands (Recommended)

- `/topic` - Display the current channel topic
- `/contact` - Show contact information for various RA teams
- `/status` - Display bot status and statistics
- `/poll` - Create a simple poll (up to 10 options)
- `/tpoll` - Create a timed poll that automatically closes
- `/gan <game-id>` - Generate achievement news template
- `/gan2 <game-id>` - Generate pretty achievement news template with colors
- `/pingteam` - Team management system (Workshop server only)
  - `/pingteam ping <team>` - Ping all members of a team
  - `/pingteam add <team> <user>` - Add user to team (admin only)
  - `/pingteam remove <team> <user>` - Remove user from team (admin only)
  - `/pingteam list <team>` - List team members
  - `/pingteam create <name>` - Create a new team (admin only)
- `/uwc` - Create an Unwelcome Concept poll (Workshop server only)
- `/dadjoke` - Get a random dad joke

### Legacy Prefix Commands (Being Migrated)

The bot still supports the following legacy prefix commands (all prefixed with `!` by default):

- `!topic` - Display the current channel topic
- `!rule [number]` - Display server rules
- `!contact` - Show contact information for various RA teams
- `!poll` - Create a simple poll
- `!tpoll` - Create a timed poll
- `!gan <game_id>` - Generate achievement news template
- `!dadjoke` - Get a random dad joke

## Project Structure

```
src/
├── commands/        # Legacy prefix commands (*.command.ts files)
├── slash-commands/  # Modern slash commands (*.command.ts files)
├── config/          # Configuration and constants
├── database/        # Database setup and schemas
├── handlers/        # Message and event handlers
├── models/          # TypeScript interfaces and types
├── services/        # Business logic services
└── utils/           # Utility functions and logging
```

## Contributing

Contributions are welcome!

### Getting Started

1. Fork the repository and clone your fork
2. Follow the installation and setup instructions above
3. Make sure you can run the bot locally before making changes

### Development Workflow

1. **Create a feature branch** from `main` for your changes
2. **Use conventional commits** for clear change history
3. **Run the verification suite** before submitting:
   ```bash
   bun run verify  # Runs lint, type checking, and tests
   ```
4. **Test your changes thoroughly** in a development environment
5. **Update documentation** for new features or changed behavior

### Code Standards

- **TypeScript**: All code must be properly typed
- **ESLint**: Follow the existing linting rules (`bun run lint`)
- **Comments**: Explain the "why", not the "what"
- **Testing**: Add tests for new functionality
- **Modern practices**: Prefer slash commands over legacy prefix commands

### Submitting Changes

1. Ensure all tests pass and code is properly formatted
2. Provide a clear PR description explaining:
   - What the change does and why
   - How to test the change
   - Any breaking changes or migration notes
3. Link to relevant issues or discussions
4. Be responsive to code review feedback

### Project Structure

See the Project Structure section above for an overview of the codebase organization. Key areas:

- **Slash commands** (`src/slash-commands/`) - Preferred for new features
- **Services** (`src/services/`) - Business logic and data access
- **Utils** (`src/utils/`) - Shared utilities and helpers

Questions? Feel free to open an issue or ask in our Discord!
