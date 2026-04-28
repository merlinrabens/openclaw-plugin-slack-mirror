import { describe, expect, it } from "vitest";
import { discoverWorkspaces, parseSessionConfig } from "../src/auto-discover.js";

describe("parseSessionConfig", () => {
  it("parses plain JSON", () => {
    const raw = JSON.stringify({ teams: { T1: { domain: "a", name: "A", token: "xoxc-1", user_id: "U1" } } });
    const cfg = parseSessionConfig(raw);
    expect(cfg.teams.T1.domain).toBe("a");
  });

  it("unwraps 1Password CSV-quoted JSON", () => {
    const inner = JSON.stringify({ teams: { T1: { domain: "a", name: "A", token: "xoxc-1", user_id: "U1" } } });
    const csv = `"${inner.replace(/"/g, '""')}"`;
    const cfg = parseSessionConfig(csv);
    expect(cfg.teams.T1.domain).toBe("a");
  });
});

describe("discoverWorkspaces", () => {
  it("returns one entry per team with token", () => {
    const raw = JSON.stringify({
      teams: {
        T1: { domain: "alpha", name: "Alpha", token: "xoxc-aaa", user_id: "U1" },
        T2: { domain: "beta", name: "Beta", token: "xoxc-bbb", user_id: "U2" },
      },
    });
    const ws = discoverWorkspaces(raw);
    expect(ws).toHaveLength(2);
    expect(ws[0]).toMatchObject({ team_id: "T1", team_domain: "alpha", xoxc: "xoxc-aaa" });
  });

  it("skips teams without tokens", () => {
    const raw = JSON.stringify({
      teams: {
        T1: { domain: "alpha", name: "Alpha", token: "xoxc-aaa", user_id: "U1" },
        T2: { domain: "beta", name: "Beta", token: "", user_id: "U2" },
      },
    });
    expect(discoverWorkspaces(raw)).toHaveLength(1);
  });

  it("returns empty array when no teams", () => {
    expect(discoverWorkspaces(JSON.stringify({}))).toEqual([]);
    expect(discoverWorkspaces(JSON.stringify({ teams: {} }))).toEqual([]);
  });
});
