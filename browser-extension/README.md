# Browser Extension / Bookmarklet

## Quick Setup (Bookmarklet — no install)

1. Open Chrome / Firefox / Safari
2. **Create a new bookmark** in your bookmarks bar:
   - Name: `Slack Mirror Scrape`
   - URL: copy the contents of [`scrape-bookmarklet.js`](./scrape-bookmarklet.js), prefix with `javascript:`, and paste as the URL.
   - Or use the one-line minified version below.
3. Visit any Slack tab (`https://app.slack.com` or any `https://<workspace>.slack.com`)
4. Click the bookmarklet
5. Your `localConfig_v2` gets copied to clipboard with a list of discovered workspaces
6. Manually grab the `d` cookie from DevTools → Application → Cookies → app.slack.com
7. Paste both values into your OpenClaw plugin config

## One-Line Bookmarklet (paste as URL)

```
javascript:(()=>{try{const cfgRaw=localStorage.getItem("localConfig_v2");if(!cfgRaw){alert("No localConfig_v2 found. Are you logged into Slack?");return;}const cfg=JSON.parse(cfgRaw);const teams=Object.entries(cfg.teams||{}).map(([id,t])=>({team_id:id,domain:t.domain,name:t.name,hasToken:Boolean(t.token)}));const payload=JSON.stringify({teams:cfg.teams},null,2);navigator.clipboard.writeText(payload).then(()=>{alert("Slack Mirror config copied to clipboard. Found "+teams.length+" workspaces: "+teams.map(t=>t.name).join(", ")+". Now grab the 'd' cookie from DevTools.");}).catch(()=>{console.log(payload);alert("Clipboard write failed — see console.");});}catch(e){alert("Scrape failed: "+e.message);}})();
```

## Token Refresh

Re-run the bookmarklet whenever your tokens expire (typically every few months, or when you log out of Slack). Update the plugin config and restart OpenClaw.
