/**
 * Per-workspace Slack RTM WebSocket listener.
 *
 * Connects to the Slack realtime stream using the user's browser session
 * tokens (xoxc + d cookie) — same path Slack desktop uses. Filters events
 * for @-mentions of the user and DMs, then emits formatted notifications.
 */

import WebSocket from "ws";
import type { Workspace, SlackEvent, FormattedNotification, Filter } from "./types.js";

interface RtmConnectResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

interface UserCache { [id: string]: string }
interface ChannelCache { [id: string]: string }

export class WorkspaceListener {
  private ws?: WebSocket;
  private backoff = 2000;
  private readonly maxBackoff = 60_000;
  private stopped = false;
  private readonly userCache: UserCache = {};
  private readonly channelCache: ChannelCache = {};

  constructor(
    private readonly workspace: Workspace,
    private readonly dCookie: string,
    private readonly filter: Filter | undefined,
    private readonly onNotification: (n: FormattedNotification) => Promise<void>,
    private readonly onAuthFailure: (workspace: string) => Promise<void>,
    private readonly logger: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void } = console,
  ) {}

  async start(): Promise<void> {
    this.logger.info(`[${this.workspace.team_domain}] starting listener`);
    while (!this.stopped) {
      try {
        const url = await this.rtmConnect();
        await this.runConnection(url);
      } catch (err: unknown) {
        const msg = (err as Error).message ?? String(err);
        if (msg.includes("invalid_auth") || msg.includes("not_authed")) {
          await this.onAuthFailure(this.workspace.team_domain);
          this.logger.error(`[${this.workspace.team_domain}] auth failure, stopping`);
          return;
        }
        this.logger.warn(`[${this.workspace.team_domain}] connection error: ${msg}`);
      }
      if (this.stopped) break;
      await new Promise((r) => setTimeout(r, this.backoff));
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
    }
  }

  stop(): void {
    this.stopped = true;
    this.ws?.close();
  }

  private async rtmConnect(): Promise<string> {
    const res = await fetch("https://slack.com/api/rtm.connect", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.workspace.xoxc}`,
        Cookie: `d=${this.dCookie}`,
      },
    });
    const data = (await res.json()) as RtmConnectResponse;
    if (!data.ok || !data.url) {
      throw new Error(`rtm.connect failed: ${data.error ?? "unknown"}`);
    }
    return data.url;
  }

  private runConnection(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl, {
        headers: { Cookie: `d=${this.dCookie}` },
      });

      this.ws.on("open", () => {
        this.logger.info(`[${this.workspace.team_domain}] connected`);
        this.backoff = 2000; // reset on successful connect
      });

      this.ws.on("message", (raw) => {
        let event: SlackEvent;
        try {
          event = JSON.parse(raw.toString()) as SlackEvent;
        } catch {
          return;
        }
        void this.handleEvent(event);
      });

      this.ws.on("close", (code, reason) => {
        this.logger.warn(`[${this.workspace.team_domain}] ws closed (${code}): ${reason.toString()}`);
        resolve();
      });

      this.ws.on("error", (err) => {
        reject(err);
      });
    });
  }

  private async handleEvent(event: SlackEvent): Promise<void> {
    if (!this.isRelevant(event)) return;

    const text = event.text ?? "";
    const sender = event.user ?? "?";
    const channel = event.channel ?? "";
    const ts = event.ts ?? "";

    const senderName = await this.resolveUser(sender);
    const channelName = await this.resolveChannel(channel);
    const resolvedText = await this.resolveMentions(text);

    const notification: FormattedNotification = {
      workspace: this.workspace.name,
      channel: channelName,
      sender: senderName,
      text: resolvedText.slice(0, 300),
      link: this.buildLink(channel, ts),
      isDM: channel.startsWith("D"),
    };

    await this.onNotification(notification);
  }

  private isRelevant(event: SlackEvent): boolean {
    if (event.type !== "message") return false;
    const skipSubtypes = new Set([
      "message_changed", "message_deleted", "channel_join", "channel_leave",
      "bot_message", "thread_broadcast",
    ]);
    if (event.subtype && skipSubtypes.has(event.subtype)) return false;

    const sender = event.user;
    const isOwn = sender === this.workspace.user_id;
    const includeOwn = this.filter?.includeOwnMessages ?? false;
    const channel = event.channel ?? "";
    const text = event.text ?? "";

    // Mute list
    if (this.filter?.muteChannels?.includes(channel)) return false;

    // DM to user
    if (channel.startsWith("D")) {
      if (isOwn && !includeOwn) return false;
      return true;
    }

    // Mention of self
    if (text.includes(`<@${this.workspace.user_id}>`)) {
      if (isOwn && !includeOwn) return false;
      return true;
    }

    // Keyword highlights
    if (this.filter?.keywordHighlights) {
      const lower = text.toLowerCase();
      for (const kw of this.filter.keywordHighlights) {
        if (lower.includes(kw.toLowerCase())) {
          if (isOwn && !includeOwn) return false;
          return true;
        }
      }
    }

    return false;
  }

  private async resolveUser(userId: string): Promise<string> {
    if (this.userCache[userId]) return this.userCache[userId];
    try {
      const r = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
        headers: {
          Authorization: `Bearer ${this.workspace.xoxc}`,
          Cookie: `d=${this.dCookie}`,
        },
      });
      const d = await r.json() as { ok: boolean; user?: { real_name?: string; name?: string } };
      if (d.ok && d.user) {
        const name = d.user.real_name || d.user.name || userId;
        this.userCache[userId] = name;
        return name;
      }
    } catch {
      /* fallthrough */
    }
    this.userCache[userId] = userId;
    return userId;
  }

  private async resolveChannel(channelId: string): Promise<string> {
    if (this.channelCache[channelId]) return this.channelCache[channelId];
    try {
      const r = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
        headers: {
          Authorization: `Bearer ${this.workspace.xoxc}`,
          Cookie: `d=${this.dCookie}`,
        },
      });
      const d = await r.json() as {
        ok: boolean;
        channel?: { name?: string; is_im?: boolean; is_group?: boolean; is_mpim?: boolean };
      };
      if (d.ok && d.channel) {
        const c = d.channel;
        const name = c.is_im ? "DM" : c.is_group || c.is_mpim ? c.name ?? channelId : `#${c.name ?? channelId}`;
        this.channelCache[channelId] = name;
        return name;
      }
    } catch {
      /* fallthrough */
    }
    this.channelCache[channelId] = channelId;
    return channelId;
  }

  private async resolveMentions(text: string): Promise<string> {
    let out = text;
    // <@USERID>
    const userIds = new Set(Array.from(text.matchAll(/<@([A-Z0-9]+)>/g), (m) => m[1]));
    for (const u of userIds) {
      const name = await this.resolveUser(u);
      out = out.replaceAll(`<@${u}>`, `@${name}`);
    }
    // <#CHANID|alias>
    out = out.replace(/<#([A-Z0-9]+)(?:\|([^>]*))?>/g, (_, _id: string, alias: string | undefined) =>
      alias ? `#${alias}` : `<channel:${_id}>`);
    // <!here>, <!channel>, <!everyone>
    out = out.replace(/<!(here|channel|everyone)(?:\|[^>]*)?>/g, "@$1");
    // <http://x|label> → label, <http://x> → http://x
    out = out.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2");
    out = out.replace(/<(https?:\/\/[^>]+)>/g, "$1");
    return out;
  }

  private buildLink(channel: string, ts: string): string {
    const tsClean = ts.replace(".", "");
    return `https://${this.workspace.team_domain}.slack.com/archives/${channel}/p${tsClean}`;
  }
}
