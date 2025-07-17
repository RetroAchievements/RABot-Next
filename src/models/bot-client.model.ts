import type { Client, Collection } from "discord.js";

import type { Command } from "./command.model";
import type { SlashCommand } from "./slash-command.model";

export interface BotClient extends Client {
  commands: Collection<string, Command>;
  slashCommands: Collection<string, SlashCommand>;
  commandPrefix: string;
  cooldowns: Collection<string, Collection<string, number>>; // <commandName, <userId, timestamp>>.
}
