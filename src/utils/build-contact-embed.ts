import { COLORS } from "../config/constants";
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

type Team = {
  name: string;
  // username to message on RA
  username: string;
  reasons: string[];
};

const buildContactButton = (account: string): ButtonBuilder => {
  return new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel("Message " + account)
    .setURL("https://retroachievements.org/messages/create?to=" + account);
};

const buildTeamSection = (team: Team): SectionBuilder => {
  const reasons = team.reasons.map((reason: string) => "- " + reason).join("\n");

  return new SectionBuilder()
    .setButtonAccessory(buildContactButton(team.username))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## :e_mail: " + team.name + "\n" + reasons),
    );
};

const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);

export const buildContactEmbed = (): ContainerBuilder => {
  return new ContainerBuilder()
    .setAccentColor(COLORS.PRIMARY)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Contact Us\n" +
          "If you would like to contact us, please send a site message to the appropriate team below.",
      ),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "Admins and Moderators",
        username: "RAdmin",
        reasons: [
          "Reporting offensive behavior.",
          "Reporting copyrighted material.",
          "Requesting to be untracked.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "Developer Compliance",
        username: "DevCompliance",
        reasons: [
          "Requesting set approval or early set release.",
          "Reporting achievements or sets with unwelcome concepts.",
          "Reporting sets failing to cover basic progression.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "Quality Assurance",
        username: "QATeam",
        reasons: [
          "Reporting a broken set, leaderboard, or rich presence.",
          "Reporting achievements with grammatical mistakes.",
          "Requesting a set be playtested.",
          "Hash compatibility questions.",
          "Hub organizational questions.",
          "Getting involved in a QA sub-team.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "Art Team",
        username: "RAArtTeam",
        reasons: [
          "Icon Gauntlets and how to start one.",
          "Proposing art updates.",
          "Questions about art-related rule changes.",
          "Requests for help with creating a new badge or badge set.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "Writing Team",
        username: "WritingTeam",
        reasons: [
          "Reporting achievements with grammatical mistakes.",
          "Reporting achievements with unclear or confusing descriptions.",
          "Requesting help from the team with proofreading achievement sets.",
          "Requesting help for coming up with original titles for achievements.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "RANews",
        username: "RANews",
        reasons: [
          "Submitting a Play This Set, Wish This Set, or RAdvantage entry.",
          "Submitting a retrogaming article.",
          "Proposing a new article idea.",
          "Getting involved with RANews.",
        ],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "RAEvents",
        username: "RAEvents",
        reasons: ["Submissions, questions, ideas, or reporting issues related to events."],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "DevQuest",
        username: "DevQuest",
        reasons: ["Submissions, questions, ideas, or reporting issues related to DevQuest."],
      }),
    )
    .addSeparatorComponents(separator)
    .addSectionComponents(
      buildTeamSection({
        name: "RACheats",
        username: "RACheats",
        reasons: [
          "If you believe someone is in violation of our [Global Leaderboard and Achievement Hunting Rules](https://docs.retroachievements.org/guidelines/users/global-leaderboard-and-achievement-hunting-rules.html#not-allowed).",
        ],
      }),
    );
};
