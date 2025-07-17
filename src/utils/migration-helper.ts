import type { Message } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord.js";

export interface MigrationConfig {
  // Whether to execute the legacy command after showing the migration message.
  executeAfterNotice?: boolean;
  // Custom migration message.
  customMessage?: string;
  // Whether to delete the migration message after a certain time.
  deleteAfter?: number; // in milliseconds
  // Whether to use ephemeral-style button (only command author can click)
  useEphemeralButton?: boolean;
}

export async function sendMigrationNotice(
  message: Message,
  slashCommandName: string,
  config: MigrationConfig = {},
): Promise<Message | null> {
  const {
    executeAfterNotice = true,
    customMessage,
    deleteAfter = 30000, // 30 seconds default
    useEphemeralButton = true,
  } = config;

  if (useEphemeralButton) {
    // Create a button that only the command author can click
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`migration_${slashCommandName}_${message.author.id}`)
        .setLabel("ℹ️ Command Migration Info")
        .setStyle(ButtonStyle.Primary),
    );

    const sentMessage = await message.reply({
      content: `${message.author}, click for migration info ${executeAfterNotice ? "_(command executed)_" : ""}`,
      components: [row],
      allowedMentions: { repliedUser: false },
    });

    // Create a collector that only responds to the original command author
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: deleteAfter,
    });

    collector.on("collect", async (interaction) => {
      // Only respond to the original command author
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: "This button is only for the person who used the command.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      const migrationInfo = `📢 **Command Migration Notice**\n\nThe \`${message.content.split(" ")[0]}\` command is being migrated to a slash command!\n\nPlease use \`/${slashCommandName}\` instead for:\n• Built-in parameter hints\n• Autocomplete support\n• Better error messages\n• No need to remember exact syntax\n\nThe legacy command will continue to work during the transition period.`;

      await interaction.reply({
        content: migrationInfo,
        flags: MessageFlags.Ephemeral,
      });
    });

    collector.on("end", () => {
      sentMessage.delete().catch(() => {
        // Ignore errors if message is already deleted
      });
    });

    return sentMessage;
  }
  // Original behavior - visible message that auto-deletes
  const defaultMessage = `📢 **Command Migration Notice**\nThe \`${message.content.split(" ")[0]}\` command is being migrated to a slash command!\n\nPlease use \`/${slashCommandName}\` instead for a better experience with autocomplete and built-in help.\n\n${executeAfterNotice ? "_Running the legacy command for you this time..._" : ""}`;

  const migrationMessage = customMessage || defaultMessage;

  const sentMessage = await message.reply({
    content: migrationMessage,
    allowedMentions: { repliedUser: false },
  });

  if (deleteAfter > 0) {
    setTimeout(() => {
      sentMessage.delete().catch(() => {
        // Ignore errors if message is already deleted.
      });
    }, deleteAfter);
  }

  return sentMessage;
}
