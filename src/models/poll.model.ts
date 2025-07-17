import type { PollOption } from "./poll-option.model";

export interface Poll {
  channelId: string;
  createdAt: Date;
  creatorId: string;
  endTime: Date | null;
  messageId: string;
  options: PollOption[];
  question: string;

  id?: number;
}
