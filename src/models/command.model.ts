import { Message } from "discord.js";
import type { CommandCategory } from "./command-category.model";
import type { BotClient } from "./bot-client.model";

export interface Command {
  name: string;
  description: string;
  usage: string;
  category: CommandCategory;

  execute: (
    message: Message,
    args: string[],
    client: BotClient
  ) => Promise<void>;

  aliases?: string[];
  examples?: string[];
  permissions?: {
    user?: bigint[];
    bot?: bigint[];
    custom?: (message: Message) => boolean;
  };
}
