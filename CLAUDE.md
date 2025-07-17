# Project Overview

RABot-Next is the official RetroAchievements Discord bot, built with Bun runtime, TypeScript, Discord.js v14, and Drizzle ORM with SQLite. The bot is transitioning from legacy prefix commands (!) to modern slash commands (/) while maintaining backward compatibility.

## Development Commands

```bash
# Initial setup
bun install
cp .env.example .env    # Configure environment variables
bun run db:generate     # Generate database migrations
bun run db:migrate      # Apply migrations
bun run db:seed         # Seed default teams (RACheats)

# Development
bun run dev             # Run with hot reload (--watch)
bun run tsc             # TypeScript type checking
bun run lint            # Run ESLint
bun run lint:fix        # Auto-fix linting issues
bun test                # Run all tests
bun test:watch          # Run tests in watch mode
bun run verify          # Run lint, type checking, and tests (comprehensive check)

# Deployment
bun run deploy-commands # Deploy slash commands to Discord (required after adding/modifying slash commands)
bun run start           # Production mode

# Database management
bun run db:studio       # Open Drizzle Studio GUI
```

## Architecture & Key Patterns

### Dual Command System

The bot supports both legacy prefix commands and modern slash commands during the migration period:

1. **Legacy Commands** (`src/commands/*.command.ts`)
   - Use the `Command` interface
   - Accessed via prefix (default: `!`)
   - Show migration notices encouraging slash command use
   - Example: `!gan 14402`

2. **Slash Commands** (`src/slash-commands/*.command.ts`)
   - Use the `SlashCommand` interface
   - Built with Discord.js SlashCommandBuilder
   - Support autocomplete, better validation, ephemeral responses
   - Example: `/gan game-id:14402`

### Migration System

When users use legacy commands that have slash equivalents:

- A temporary migration notice appears (15 seconds)
- The legacy command still executes
- Configured via `legacyName` property in slash commands

### Database Architecture

- **Drizzle ORM** with SQLite (`bun:sqlite`)
- Schema defined in `src/database/schema.ts`
- Services pattern for database operations (`src/services/*.service.ts`)
- Tables: `teams`, `team_members`, `polls`, `poll_votes`

### Command Registration

- Legacy commands auto-loaded from `src/commands/`
- Slash commands auto-loaded from `src/slash-commands/`
- Slash commands must be deployed via `bun run deploy-commands`

### Key Services

- **TeamService**: Manages teams and members, supports both ID and name lookups
- **PollService**: Handles poll creation and voting

### Environment Variables

Required in `.env`:

- `DISCORD_TOKEN`: Bot token
- `DISCORD_APPLICATION_ID`: Bot application ID
- `LEGACY_COMMAND_PREFIX`: Prefix for legacy commands (default: `!`)
- `RA_WEB_API_KEY`: RetroAchievements Web API key
- `RA_CONNECT_API_KEY`: RetroAchievements Connect API key (future use)
- `YOUTUBE_API_KEY`: For longplay searches in gan commands
- `CHEAT_INVESTIGATION_CATEGORY_ID`: Category ID for RACheats team restrictions
- `NODE_ENV`: Set to "production" in production (default: "development")
- `LOG_LEVEL`: Logging level - trace, debug, info, warn, error, fatal (default: "debug" in dev, "info" in prod)

### Discord.js v14 Patterns

- Use `MessageFlags.Ephemeral` instead of `ephemeral: true`
- Autocomplete handlers in main interaction event
- Proper intent configuration for message content access

## Command Implementation Notes

### Adding New Commands

1. **Slash commands preferred** for new features
2. Create in `src/slash-commands/[name].command.ts`
3. Export default with `SlashCommand` interface
4. Set `legacyName` if replacing a prefix command
5. Run `bun run deploy-commands` after adding

### Team System

- Teams stored by ID, accessed by name in commands
- Autocomplete support for team selection
- Special restrictions for certain teams (e.g., RACheats)

### RetroAchievements API

- Use `@retroachievements/api` package
- Build authorization with `buildAuthorization()`
- Handle game IDs and URLs in gan commands

## Logging System

The bot uses Pino for structured logging with the following features:

### Log Levels
- `trace`: Most detailed logging
- `debug`: Detailed information for debugging
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors that cause the bot to exit

### Logging Utilities

1. **Basic Logger** (`src/utils/logger.ts`)
   - `logger.info()`, `logger.error()`, etc. for standard logging
   - `logError()` - Log errors with context
   - `logCommandExecution()` - Log command executions
   - `logMigrationNotice()` - Log migration notices
   - `logDatabaseQuery()` - Log database operations
   - `logApiCall()` - Log external API calls

2. **Error Tracking** (`src/utils/error-tracker.ts`)
   - `ErrorTracker.trackMessageError()` - Track errors from message commands
   - `ErrorTracker.trackInteractionError()` - Track errors from slash commands
   - `ErrorTracker.formatUserError()` - Format errors for user display with error IDs

3. **Command Analytics** (`src/utils/command-analytics.ts`)
   - Automatic tracking of all command executions
   - Execution time measurement
   - Success/failure tracking
   - Per-user and per-guild statistics
   - Access statistics via `CommandAnalytics.getStatistics()`

### Best Practices
- Always use structured logging with context objects
- Include user ID, guild ID, and command name in error logs
- Use appropriate log levels (don't use `info` for debugging)
- Error IDs help users report issues

## Common Gotchas

- Always use Bun commands (`bun run`, `bun install`) not npm/yarn/pnpm
- Deploy slash commands after changes (`bun deploy-commands`)
- Check channel type before accessing properties like `topic` or `parentId`
- Use proper null checks for Discord.js properties
- Remember to handle both team IDs and names in TeamService methods
