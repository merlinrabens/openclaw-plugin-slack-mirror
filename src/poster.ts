/**
 * AS-YOU posting via Slack User OAuth tokens (xoxp).
 *
 * Requires the user to install a Slack App with user scopes per workspace,
 * then provide the xoxp- token. Optional — listener works without poster.
 */

interface PostMessageOptions {
  channel: string;
  text: string;
  thread_ts?: string;
  reply_broadcast?: boolean;
}

interface PostMessageResult {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

interface OpenIMResult {
  ok: boolean;
  channel?: { id: string };
  error?: string;
}

export class Poster {
  constructor(private readonly userTokensByDomain: Record<string, string>) {}

  hasToken(teamDomain: string): boolean {
    return Boolean(this.userTokensByDomain[teamDomain]);
  }

  /** Post a message AS the user. Returns the message ts for verification. */
  async postMessage(teamDomain: string, opts: PostMessageOptions): Promise<PostMessageResult> {
    const token = this.requireToken(teamDomain);
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(opts),
    });
    return (await r.json()) as PostMessageResult;
  }

  /** Open or fetch the IM channel ID for a user. */
  async openDM(teamDomain: string, targetUserId: string): Promise<OpenIMResult> {
    const token = this.requireToken(teamDomain);
    const r = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `users=${encodeURIComponent(targetUserId)}`,
    });
    return (await r.json()) as OpenIMResult;
  }

  /** Add a reaction to a message AS the user. */
  async addReaction(teamDomain: string, channel: string, ts: string, name: string): Promise<{ ok: boolean; error?: string }> {
    const token = this.requireToken(teamDomain);
    const params = new URLSearchParams({ channel, timestamp: ts, name });
    const r = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    return (await r.json()) as { ok: boolean; error?: string };
  }

  /** Search messages AS the user (full Slack search). */
  async searchMessages(teamDomain: string, query: string, count = 20): Promise<unknown> {
    const token = this.requireToken(teamDomain);
    const params = new URLSearchParams({ query, count: String(count) });
    const r = await fetch("https://slack.com/api/search.messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    return await r.json();
  }

  private requireToken(teamDomain: string): string {
    const token = this.userTokensByDomain[teamDomain];
    if (!token) {
      throw new Error(
        `No xoxp user token configured for workspace '${teamDomain}'. ` +
        `Install a Slack App with user scopes in this workspace and add the xoxp- token to userTokens config.`,
      );
    }
    return token;
  }
}
