/**
 * Types for the Slack Mirror plugin.
 */

export interface Workspace {
  team_id: string;
  team_domain: string;
  name: string;
  xoxc: string;
  user_id: string;
}

export interface SessionConfig {
  teams: Record<string, {
    domain: string;
    name: string;
    token: string;
    user_id: string;
  }>;
}

export interface NotifyTarget {
  channel: "telegram" | "whatsapp" | "discord" | "imessage" | "signal" | "matrix";
  chatId: string;
}

export interface Filter {
  includeOwnMessages?: boolean;
  keywordHighlights?: string[];
  muteChannels?: string[];
}

export interface PluginConfig {
  sessionConfig: string;       // JSON string of localConfig_v2
  dCookie: string;             // xoxd-...
  notifyTarget: NotifyTarget;
  filter?: Filter;
  posterEnabled?: boolean;
  userTokens?: Record<string, string>; // team_domain → xoxp-...
}

export interface SlackEvent {
  type: string;
  subtype?: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  team?: string;
}

export interface FormattedNotification {
  workspace: string;
  channel: string;        // resolved name like "#general" or "DM"
  sender: string;         // resolved name like "Cody Smith"
  text: string;           // resolved (mentions/channels expanded)
  link: string;           // Slack permalink
  isDM: boolean;
}
