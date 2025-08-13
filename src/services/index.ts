/**
 * Service Registry
 *
 * This module provides singleton instances of all services for use throughout the application.
 * Services are instantiated with the production database connection.
 *
 * For testing, services should be instantiated directly with test database instances.
 */

import { db } from "../database/db";
import { PollService } from "./poll.service";
import { TeamService } from "./team.service";

// Create singleton service instances with the production database.
export const pollService = new PollService(db);
export const teamService = new TeamService(db);

// Re-export service classes for testing.
export { PollService } from "./poll.service";
export { TeamService } from "./team.service";

// Export other services that don't need refactoring.
export { connectApiService } from "./connect-api.service";
export { DadjokeService } from "./dadjoke.service";
export { FramesService } from "./frames.service";
export { GameInfoService } from "./game-info.service";
export { UwcPollService } from "./uwc-poll.service";
export { YouTubeService } from "./youtube.service";
