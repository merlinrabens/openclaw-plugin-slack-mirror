// Slack Mirror — token scraper bookmarklet
//
// Drop this code in a Chrome bookmarklet (with the javascript: prefix when used
// as a URL bookmark). When clicked on a Slack tab (https://app.slack.com or
// https://<workspace>.slack.com), it copies your localConfig_v2 + a reminder
// to grab the 'd' cookie manually.
//
// Usage: paste the WHOLE file as a bookmarklet (Slack auto-discovery → clipboard).

(() => {
  try {
    const cfgRaw = localStorage.getItem("localConfig_v2");
    if (!cfgRaw) {
      alert("No localConfig_v2 found. Are you logged into Slack on this tab?");
      return;
    }
    const cfg = JSON.parse(cfgRaw);
    const teams = Object.entries(cfg.teams || {}).map(([id, t]) => ({
      team_id: id,
      domain: t.domain,
      name: t.name,
      hasToken: Boolean(t.token),
    }));

    // Pretty payload — paste this into your OpenClaw plugin config
    const payload = JSON.stringify({ teams: cfg.teams }, null, 2);

    // Copy to clipboard
    navigator.clipboard.writeText(payload).then(() => {
      alert(
        `✅ Slack Mirror — config copied to clipboard\n\n` +
        `Discovered ${teams.length} workspace(s):\n` +
        teams.map((t) => `  • ${t.name} (${t.domain})`).join("\n") +
        `\n\nNext:\n` +
        `1. Paste this into the 'sessionConfig' field of your Slack Mirror plugin config\n` +
        `2. ALSO grab the 'd' cookie:\n` +
        `   • DevTools → Application → Cookies → app.slack.com\n` +
        `   • Find cookie named 'd' (HttpOnly) → copy value (xoxd-...)\n` +
        `   • Paste into the 'dCookie' field\n` +
        `3. Restart your OpenClaw gateway`,
      );
    }).catch(() => {
      // Fallback: print to console
      console.log("Slack Mirror config payload:");
      console.log(payload);
      alert("Clipboard write failed — check console for the JSON payload.");
    });
  } catch (e) {
    alert(`Slack Mirror scrape failed: ${e?.message ?? e}`);
  }
})();
