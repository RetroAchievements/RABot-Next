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

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
COMMAND_PREFIX=!
RA_API_KEY=your_retroachievements_api_key
```

## Database Setup

Initialize the database:

```bash
bun run db:generate  # Generate migration files
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio (optional)
```

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
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix

## Commands

The bot supports the following commands (all prefixed with `!` by default):

- `!topic` - Display the current channel topic
- `!rule [number]` - Display server rules
- `!contact` - Show contact information for various RA teams
- `!poll` - Create a simple poll
- `!tpoll` - Create a timed poll
- `!whatgame [console]` - Get a random game suggestion
- `!gan <game_id>` - Generate achievement news template
- `!pingteam <team>` - Team ping system (privileged users only)
  - `!pingteam racheats` - Ping the RACheats team
  - `!pingteam racheats add @user` - Add user to team (admin only)
  - `!pingteam racheats remove @user` - Remove user from team (admin only)
  - `!pingteam racheats list` - List team members

## Project Structure

```
src/
├── commands/        # Bot commands (*.command.ts files)
├── config/          # Configuration and constants
├── database/        # Database setup and schemas
├── handlers/        # Message and event handlers
├── models/          # TypeScript interfaces and types
├── services/        # Business logic services
└── utils/           # Utility functions
```

## Contributing

Contributions are welcome! Please ensure:

1. Code follows the existing style conventions
2. All tests pass
3. New features include appropriate documentation
4. PRs include a clear description of changes
