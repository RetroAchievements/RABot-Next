import { type Mock, mock } from "bun:test";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  Collection,
  type Guild,
  type GuildMember,
  type Message,
  PermissionsBitField,
  type TextChannel,
  type User,
} from "discord.js";

import type { BotClient } from "../../models";

export function createMockUser(overrides?: any): User {
  return {
    id: "987654321",
    username: "TestUser",
    discriminator: "0001",
    bot: false,
    system: false,
    flags: null,
    avatar: null,
    banner: null,
    accentColor: null,
    displayAvatarURL: mock(() => "https://example.com/avatar.png"),
    ...overrides,
  } as User;
}

export function createMockGuildMember(overrides?: any): GuildMember {
  return {
    id: "987654321",
    user: createMockUser(),
    permissions: new PermissionsBitField(["SendMessages", "ViewChannel"]),
    roles: {
      cache: new Collection(),
    },
    ...overrides,
  } as GuildMember;
}

export function createMockTextChannel(overrides?: Partial<TextChannel>): TextChannel {
  return {
    id: "111111111",
    type: ChannelType.GuildText,
    name: "test-channel",
    send: mock(() => Promise.resolve({ id: "msg123" })),
    permissionsFor: mock(() => new PermissionsBitField(["SendMessages", "EmbedLinks"])),
    parentId: null,
    parent: null,
    ...overrides,
  } as unknown as TextChannel;
}

export function createMockThreadChannel(overrides?: any): any {
  const parentChannel =
    overrides?.parent ||
    createMockTextChannel({
      parentId: overrides?.parentCategoryId !== undefined ? overrides.parentCategoryId : null,
    } as any);

  return {
    id: "333333333",
    type: overrides?.type || ChannelType.PublicThread,
    name: "test-thread",
    parentId: parentChannel.id,
    parent: parentChannel,
    send: mock(() => Promise.resolve({ id: "msg123" })),
    permissionsFor: mock(() => new PermissionsBitField(["SendMessages", "EmbedLinks"])),
    ...overrides,
  };
}

export function createMockGuild(overrides?: Partial<Guild>): Guild {
  return {
    id: "222222222",
    name: "Test Guild",
    members: {
      me: createMockGuildMember({
        permissions: new PermissionsBitField(["SendMessages", "EmbedLinks", "AddReactions"]),
      }),
      cache: new Collection(),
    },
    ...overrides,
  } as unknown as Guild;
}

export function createMockMessage(overrides?: any): Message {
  const author = overrides?.author || createMockUser();
  const channel = overrides?.channel || createMockTextChannel();
  const guild = overrides?.guild !== undefined ? overrides.guild : createMockGuild();

  const base: any = {
    id: "123456789",
    content: "!test command",
    author,
    channel,
    channelId: channel?.id || "111111111",
    guild,
    guildId: guild?.id || null,
    member: guild ? createMockGuildMember({ user: author }) : null,
    createdTimestamp: Date.now(),
    editedTimestamp: null,
    mentions: {
      users: new Collection(),
      roles: new Collection(),
      everyone: false,
    },
    attachments: new Collection(),
    embeds: [],
    reactions: {
      cache: new Collection(),
    },
    reference: null,
    reply: mock(() => Promise.resolve({} as Message)) as Mock<() => Promise<Message>>,
    delete: mock(() => Promise.resolve({} as Message)),
    react: mock(() => Promise.resolve({})),
    edit: mock(() => Promise.resolve({} as Message)) as Mock<() => Promise<Message>>,
  };

  // Apply overrides
  if (overrides) {
    Object.assign(base, overrides);
  }

  return base as Message;
}

export function createMockInteraction(overrides?: any): ChatInputCommandInteraction {
  const user = overrides?.user || createMockUser();
  const channel = overrides?.channel || createMockTextChannel();
  const guild = overrides?.guild !== undefined ? overrides.guild : createMockGuild();

  const base: any = {
    id: "interaction123",
    type: 2, // ... APPLICATION_COMMAND ...
    commandName: overrides?.commandName || "test",
    commandType: 1, // ... CHAT_INPUT ...
    user,
    member: guild ? createMockGuildMember({ user }) : null,
    channel,
    guild,
    guildId: guild?.id || null,
    channelId: channel?.id || "111111111",
    client: {
      user: createMockUser({ id: "bot123", bot: true }),
    },
    options: {
      getString: mock(() => null) as Mock<(name: string, required?: boolean) => string | null>,
      getInteger: mock(() => null),
      getBoolean: mock(() => null),
      getUser: mock(() => null),
      getMember: mock(() => null),
      getChannel: mock(() => null),
      getSubcommand: mock(() => null),
      getSubcommandGroup: mock(() => null),
    },
    deferred: false,
    ephemeral: null,
    replied: false,
    reply: mock(() => Promise.resolve()),
    deferReply: mock(() => Promise.resolve()),
    editReply: mock(() => Promise.resolve({} as Message)),
    deleteReply: mock(() => Promise.resolve()),
    followUp: mock(() => Promise.resolve()),
  };

  // Apply overrides
  if (overrides) {
    Object.assign(base, overrides);
  }

  return base as ChatInputCommandInteraction;
}

export function createMockClient(overrides?: Partial<BotClient>): BotClient {
  return {
    user: createMockUser({ id: "bot123", bot: true }),
    guilds: {
      cache: new Collection(),
    },
    channels: {
      cache: new Collection(),
    },
    ws: {
      ping: 42,
    },
    commands: new Collection(),
    slashCommands: new Collection(),
    commandPrefix: "!",
    cooldowns: new Collection(),
    ...overrides,
  } as unknown as BotClient;
}
