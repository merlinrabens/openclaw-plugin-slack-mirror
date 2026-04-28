/**
 * Parse the localStorage.localConfig_v2 dump from a Slack browser tab
 * to discover all workspaces the user is logged into.
 */

import type { SessionConfig, Workspace } from "./types.js";

export function parseSessionConfig(rawJson: string): SessionConfig {
  // 1Password CSV-escapes JSON when stored as concealed field;
  // unwrap if needed.
  let cleaned = rawJson.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
  }
  return JSON.parse(cleaned);
}

export function discoverWorkspaces(rawSessionConfig: string): Workspace[] {
  const cfg = parseSessionConfig(rawSessionConfig);
  const teams = cfg.teams ?? {};
  const out: Workspace[] = [];

  for (const [team_id, t] of Object.entries(teams)) {
    if (!t.token) continue;
    out.push({
      team_id,
      team_domain: t.domain,
      name: t.name,
      xoxc: t.token,
      user_id: t.user_id,
    });
  }

  return out;
}
