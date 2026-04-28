#!/usr/bin/env node
/**
 * Slack Mirror standalone CLI — proves the plugin works end-to-end without
 * an OpenClaw gateway. Reads config from environment variables or a JSON
 * file, constructs a Telegram-direct host binding, and runs the listener.
 *
 * Usage:
 *   SLACK_MIRROR_CONFIG=./config.json node dist/bin/cli.js
 *
 * Or via 1Password (matches the README setup):
 *   export OP_SERVICE_ACCOUNT_TOKEN=...
 *   export TELEGRAM_BOT_TOKEN=...
 *   export TELEGRAM_CHAT_ID=...
 *   export OP_ITEM="Slack Browser Session — Merlin"
 *   node dist/bin/cli.js
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import createPlugin from "../index.js";
import type { PluginConfig, OpenClawHostBindings } from "../index.js";

function readOpField(item: string, field: string): string {
  // execFileSync passes args without invoking a shell — no injection risk.
  return execFileSync(
    "op",
    ["item", "get", item, "--vault", "OpenClaw", "--fields", `label=${field}`, "--reveal"],
    { encoding: "utf8" },
  ).trim();
}

function loadConfig(): PluginConfig {
  const configPath = process.env.SLACK_MIRROR_CONFIG;
  if (configPath) {
    return JSON.parse(readFileSync(configPath, "utf8")) as PluginConfig;
  }

  const opItem = process.env.OP_ITEM ?? "Slack Browser Session — Merlin";
  const sessionConfig = readOpField(opItem, "localConfig");
  const dCookie = readOpField(opItem, "xoxd");
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID env required (or use SLACK_MIRROR_CONFIG)");
  }

  return {
    sessionConfig,
    dCookie,
    notifyTarget: { channel: "telegram", chatId },
    filter: { includeOwnMessages: process.env.INCLUDE_OWN === "1" },
    posterEnabled: false,
  };
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
    ?? extractTelegramTokenFromOpenClaw();
  if (!tgToken) {
    throw new Error("TELEGRAM_BOT_TOKEN env required");
  }

  const host: OpenClawHostBindings = {
    emitToChannel: async (target, text) => {
      if (target.channel !== "telegram") {
        console.log(`[would emit to ${target.channel}/${target.chatId}]`, text);
        return;
      }
      const r = await fetch(
        `https://api.telegram.org/bot${tgToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: target.chatId,
            text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        },
      );
      if (!r.ok) {
        const body = await r.text();
        console.error(`telegram send failed ${r.status}: ${body.slice(0, 200)}`);
      }
    },
    logger: console,
  };

  const plugin = createPlugin(cfg, host);
  await plugin.start();

  console.log("Slack Mirror CLI running. Ctrl+C to stop.");
  process.on("SIGINT", () => {
    void plugin.stop().then(() => process.exit(0));
  });

  // Stay alive
  await new Promise(() => undefined);
}

function extractTelegramTokenFromOpenClaw(): string | undefined {
  try {
    const cfgPath = `${process.env.HOME}/.openclaw/openclaw.json`;
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as {
      channels?: { telegram?: { botToken?: string } };
    };
    return cfg.channels?.telegram?.botToken;
  } catch {
    return undefined;
  }
}

main().catch((err: unknown) => {
  console.error("fatal:", (err as Error).message);
  process.exit(1);
});
