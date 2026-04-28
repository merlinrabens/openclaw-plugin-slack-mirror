/**
 * OpenClaw plugin: Slack Mirror.
 *
 * Mirrors the user's Slack identity across all workspaces via browser session
 * tokens (xoxc/xoxd). Emits notifications for @-mentions and DMs to a target
 * channel (Telegram, WhatsApp, etc.). Optionally allows AS-YOU posting via
 * separate xoxp user OAuth tokens.
 *
 * No bot user. No app install required for listening (only for posting).
 */

import { discoverWorkspaces } from "./auto-discover.js";
import { WorkspaceListener } from "./listener.js";
import { Poster } from "./poster.js";
import type { PluginConfig, FormattedNotification } from "./types.js";

export interface OpenClawHostBindings {
  /** Inject a synthetic message to the named OpenClaw channel + chat. */
  emitToChannel: (target: { channel: string; chatId: string }, text: string) => Promise<void>;
  /** Optional logger; falls back to console. */
  logger?: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
}

export class SlackMirrorPlugin {
  private readonly listeners: WorkspaceListener[] = [];
  private readonly poster: Poster;

  constructor(
    private readonly config: PluginConfig,
    private readonly host: OpenClawHostBindings,
  ) {
    this.poster = new Poster(this.config.userTokens ?? {});
  }

  async start(): Promise<void> {
    const workspaces = discoverWorkspaces(this.config.sessionConfig);
    const log = this.host.logger ?? console;
    log.info(`[slack-mirror] discovered ${workspaces.length} workspace(s): ${workspaces.map((w) => w.team_domain).join(", ")}`);

    for (const ws of workspaces) {
      const listener = new WorkspaceListener(
        ws,
        this.config.dCookie,
        this.config.filter,
        async (n) => this.handleNotification(n),
        async (workspace) => this.handleAuthFailure(workspace),
        log,
      );
      this.listeners.push(listener);
      // start in parallel
      void listener.start();
    }
  }

  async stop(): Promise<void> {
    for (const l of this.listeners) l.stop();
  }

  /** Expose the poster for OpenClaw skills/agents. */
  getPoster(): Poster | null {
    if (!this.config.posterEnabled) return null;
    return this.poster;
  }

  private async handleNotification(n: FormattedNotification): Promise<void> {
    const icon = n.isDM ? "💬" : "🔔";
    const label = n.isDM ? "DM" : `mention in ${n.channel}`;
    const text = `${icon} *Slack ${n.workspace}* | ${label}\n*${n.sender}:* ${n.text}\n[Open in Slack](${n.link})`;
    await this.host.emitToChannel(this.config.notifyTarget, text);
  }

  private async handleAuthFailure(workspace: string): Promise<void> {
    const text = `⚠️ *Slack Mirror auth failure* for *${workspace}*\nBrowser session token expired. Re-scrape via the included bookmarklet and update plugin config.`;
    try {
      await this.host.emitToChannel(this.config.notifyTarget, text);
    } catch {
      // best-effort; if even the fallback channel is dead, nothing we can do
    }
  }
}

/** Default export: factory matching OpenClaw plugin convention. */
export default function createPlugin(config: PluginConfig, host: OpenClawHostBindings): SlackMirrorPlugin {
  return new SlackMirrorPlugin(config, host);
}

export type { PluginConfig, FormattedNotification, NotifyTarget, Filter, Workspace } from "./types.js";
export { Poster } from "./poster.js";
export { discoverWorkspaces } from "./auto-discover.js";
