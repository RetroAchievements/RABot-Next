import type { Message } from "discord.js";

import type { BotClient } from "./bot-client.model";
import type { CommandCategory } from "./command-category.model";

/**
 * @deprecated Use SlashCommand interface instead for new commands.
 */
export interface Command {
  name: string;
  description: string;
  usage: string;
  category: CommandCategory;
  execute: (message: Message, args: string[], client: BotClient) => Promise<void>;
  aliases?: string[];
  examples?: string[];
  permissions?: {
    user?: bigint[];
    bot?: bigint[];
    custom?: (message: Message) => boolean;
  };
  cooldown?: number;
}
