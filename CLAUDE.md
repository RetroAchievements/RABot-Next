# Project Overview

RABot is the official RetroAchievements Discord bot, built with Bun runtime, TypeScript, Discord.js v14, and Drizzle ORM with SQLite. The bot is transitioning from legacy prefix commands (!) to modern slash commands (/) while maintaining backward compatibility.

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
- Tables: `teams`, `team_members`, `polls`, `poll_votes`, `uwc_polls`, `uwc_poll_results`

### Command Registration

- Legacy commands auto-loaded from `src/commands/`
- Slash commands auto-loaded from `src/slash-commands/`
- Slash commands must be deployed via `bun run deploy-commands`

### Key Services

- **TeamService**: Manages teams and members, supports both ID and name lookups
- **PollService**: Handles poll creation and voting
- **UwcPollService**: Tracks UWC polls, stores results, enables searching by achievement/game
- **UwcHistoryService**: Retrieves and formats previous UWC poll history for auto-detection
- **AutoPublishService**: Automatically publishes messages in configured announcement channels

### Environment Variables

Required in `.env`:

- `DISCORD_TOKEN`: Bot token (required)
- `DISCORD_APPLICATION_ID`: Bot application ID (required)
- `RA_WEB_API_KEY`: RetroAchievements Web API key (required)
- `LEGACY_COMMAND_PREFIX`: Prefix for legacy commands (default: `!`)
- `RA_CONNECT_API_KEY`: RetroAchievements Connect API key (future use)
- `YOUTUBE_API_KEY`: For longplay searches in gan commands (optional, but recommended)
- `MAIN_GUILD_ID`: Discord guild ID for the main RetroAchievements server (optional, but recommended)
- `WORKSHOP_GUILD_ID`: Discord guild ID for the RetroAchievements Workshop server (optional, but recommended)
- `CHEAT_INVESTIGATION_CATEGORY_ID`: Category ID for RACheats team restrictions
- `UWC_VOTING_TAG_ID`: Forum tag ID for active UWC polls (optional)
- `UWC_VOTE_CONCLUDED_TAG_ID`: Forum tag ID for completed UWC polls (optional)
- `UWC_FORUM_CHANNEL_ID`: Forum channel ID for UWC auto-detection feature (optional)
- `AUTO_PUBLISH_CHANNEL_IDS`: Comma-separated list of announcement channel IDs to auto-publish from (optional)
- `NODE_ENV`: Set to "production" in production (default: "development")
- `LOG_LEVEL`: Logging level - trace, debug, info, warn, error, fatal (default: "debug" in dev, "info" in prod)

**Note**: The bot will validate required environment variables on startup and exit with an error if any are missing.

### Discord.js v14 Patterns

- Use `MessageFlags.Ephemeral` instead of `ephemeral: true`
- Autocomplete handlers in main interaction event
- Proper intent configuration for message content access

### UWC Auto-Detection Feature

The bot automatically provides context when new UWC (Unwelcome Concept) reports are created:

- Monitors threads in the configured forum channel (`UWC_FORUM_CHANNEL_ID`)
- Detects threads matching pattern: `12345: Achievement Title (Game Name)`
- Queries database for previous UWC polls for the same achievement ID
- Posts an automated message with links to up to 5 previous discussions
- Shows poll dates, outcomes (Approved/Denied/Active/No Action), and vote results
- Uses efficient database queries instead of Discord API calls for performance

### Auto-Publishing Feature

The bot can automatically publish messages in Discord announcement channels:

- Configure channel IDs via `AUTO_PUBLISH_CHANNEL_IDS` environment variable
- Bot requires "Manage Messages" permission in announcement channels
- Automatically publishes non-bot messages that aren't already crossposted
- Handles rate limits and permission errors gracefully
- Logs all publishing activities for monitoring

## Command Implementation Notes

### Adding New Commands

1. **Slash commands preferred** for new features
2. Create in `src/slash-commands/[name].command.ts`
3. Export default with `SlashCommand` interface
4. Set `legacyName` if replacing a prefix command
5. Add guild restrictions using `requireGuild()` utility if needed
6. Run `bun run deploy-commands` after adding
7. **Update README.md** - Add the new command to both the slash commands and legacy commands lists (if applicable)

### Guild Restrictions

Use the `requireGuild()` utility for server-restricted commands:

```typescript
import { requireGuild } from "../utils/guild-restrictions";
import { WORKSHOP_GUILD_ID } from "../config/constants";

async execute(interaction, _client) {
  if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) {
    return;
  }
  // Command logic here...
}
```

- Provides consistent, low-cognitive-load guild restrictions
- Automatically sends ephemeral error responses
- Use `MAIN_GUILD_ID` or `WORKSHOP_GUILD_ID` constants

### Team System

- Teams stored by ID, accessed by name in commands
- Autocomplete support for team selection
- Special restrictions for certain teams (e.g., RACheats)
- Team commands restricted to Workshop server only

### RetroAchievements API

- Use `@retroachievements/api` package
- Build authorization with `buildAuthorization()`
- Handle game IDs and URLs in gan commands
- Memory parsing utility for achievement logic analysis (mem command)

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

## Production Notes

### Deployment

- The bot automatically deploys via Forge when changes are merged to main
- Runs under a process supervisor on the production server
- No manual PM2 configuration needed

### Database Performance

- SQLite WAL mode is enabled by default for better concurrent access
- WAL mode allows concurrent reads during writes, ideal for Discord bot usage patterns

### Shutdown Handling

- The bot handles SIGTERM and SIGINT signals for graceful shutdown
- Discord client connections are properly closed before exit
- Uncaught exceptions and promise rejections trigger graceful shutdown

## Testing

### CI Environment Compatibility

Some tests may need to be conditionally skipped in CI environments due to infrastructure differences (e.g., Drizzle ORM compatibility issues with GitHub Actions). Use this pattern for database-dependent tests:

```typescript
// Skip database-dependent tests in CI environment where Drizzle methods may be undefined.
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const describeOrSkip = isCI ? describe.skip : describe;

describeOrSkip("DatabaseDependentService", () => {
  // Tests that require database functionality
});
```

This ensures:

- Tests run normally in local development
- CI builds pass by skipping problematic tests
- Easy to remove when underlying issues are resolved

## Common Gotchas

- Always use Bun commands (`bun run`, `bun install`) not npm/yarn/pnpm
- Deploy slash commands after changes (`bun deploy-commands`)
- Check channel type before accessing properties like `topic` or `parentId`
- Use proper null checks for Discord.js properties
- Remember to handle both team IDs and names in TeamService methods
- Use `requireGuild()` for server restrictions instead of manual guild ID checks
- Always write tests for new utilities and commands (follow existing test patterns)
- The bot validates required environment variables on startup - check logs if it exits immediately
