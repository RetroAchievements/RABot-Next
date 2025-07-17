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

- The **Bun** runtime
- **TypeScript**
- **Discord.js**
- **Drizzle ORM** with SQLite for data persistence
- **@retroachievements/api**
- **Pino** for structured logging with command analytics

## Requirements

- [Bun](https://bun.sh) 1.0+
- A Discord bot token

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/RetroAchievements/RABot.git
cd RABot
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
- `RA_WEB_API_KEY` - RetroAchievements Web API key
- `RA_CONNECT_API_KEY` - RetroAchievements Connect API key
- `YOUTUBE_API_KEY` - YouTube Data API v3 key (optional, for longplay searches)
- `CHEAT_INVESTIGATION_CATEGORY_ID` - Discord category ID for cheat investigations (optional)
- `NODE_ENV` - Environment mode: `development` or `production` (default: `development`)
- `LOG_LEVEL` - Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `debug` in dev, `info` in prod)

## Database Setup

Initialize the database:

```bash
bun run db:generate  # Generate migration files
bun run db:migrate   # Apply migrations
bun run db:seed      # Seed default teams (optional)
bun run db:studio    # Open Drizzle Studio (optional)
```

## Deploying Slash Commands

After adding your bot to a server, deploy the slash commands:

```bash
bun run deploy-commands
```

This needs to be run:
- When you first set up the bot
- Whenever you add or modify slash commands
- After major Discord.js updates

## Running the Bot

### Development

```bash
bun run dev  # Runs with auto-restart on file changes
```

### Production

```bash
bun run start  # Standard run
# or with PM2:
pm2 start src/index.ts --name rabot-next --interpreter bun
```

## Available Scripts

- `bun run dev` - Run in development mode with hot reload
- `bun run start` - Run in production mode
- `bun run deploy-commands` - Deploy slash commands to Discord
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix
- `bun run tsc` - Run TypeScript type checking

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
- `/pingteam` - Team management system
  - `/pingteam ping <team>` - Ping all members of a team
  - `/pingteam add <team> <user>` - Add user to team (admin only)
  - `/pingteam remove <team> <user>` - Remove user from team (admin only)
  - `/pingteam list <team>` - List team members
  - `/pingteam create <name>` - Create a new team (admin only)

### Legacy Prefix Commands (Being Migrated)
The bot still supports the following legacy prefix commands (all prefixed with `!` by default):

- `!topic` - Display the current channel topic
- `!rule [number]` - Display server rules
- `!contact` - Show contact information for various RA teams
- `!poll` - Create a simple poll
- `!tpoll` - Create a timed poll
- `!gan <game_id>` - Generate achievement news template
- `!gan2 <game_id>` - Generate pretty achievement news template with colors
- `!pingteam <team>` - Team ping system (privileged users only)
  - `!pingteam racheats` - Ping the RACheats team
  - `!pingteam racheats add @user` - Add user to team (admin only)
  - `!pingteam racheats remove @user` - Remove user from team (admin only)
  - `!pingteam racheats list` - List team members

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

Contributions are welcome! Please ensure:

1. Code follows the existing style conventions
2. All tests pass
3. New features include appropriate documentation
4. PRs include a clear description of changes
