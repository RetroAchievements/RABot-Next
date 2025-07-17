import { Client, Collection } from "discord.js";

import type { Command } from "./command.model";

export interface BotClient extends Client {
  commands: Collection<string, Command>;
  commandPrefix: string;
}
