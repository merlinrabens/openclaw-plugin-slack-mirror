#!/bin/bash
# Slack Mirror — printable demo (run by VHS, no real commands executed)

# colors
G='\033[0;32m'  # green
B='\033[0;34m'  # blue
Y='\033[1;33m'  # yellow
D='\033[0;90m'  # dim
C='\033[0;36m'  # cyan
R='\033[0;31m'  # red
N='\033[0m'     # reset

slow() { printf "$1\n"; sleep "${2:-0.4}"; }

slow "${D}# Slack Mirror — listening to all your workspaces invisibly${N}" 1
slow ""
slow "${C}\$ openclaw plugin add @bluedigits/openclaw-plugin-slack-mirror${N}" 0.8
slow "${G}✓${N} installed v0.1.0" 0.3
slow "${G}✓${N} scrape browser session via included bookmarklet" 0.3
slow "${G}✓${N} paste sessionConfig + dCookie into ~/.openclaw/openclaw.json" 0.4
slow ""

slow "${C}\$ openclaw gateway restart && tail -f /tmp/slack-mirror.log${N}" 0.8
slow "${B}[slack-mirror]${N} discovered 3 workspace(s): myworkspace, customer-co, side-project" 0.3
slow "${B}[slack-mirror]${N} [myworkspace]    ${G}connected${N} (Merlin Rabens)" 0.2
slow "${B}[slack-mirror]${N} [customer-co]    ${G}connected${N} (Merlin Rabens)" 0.2
slow "${B}[slack-mirror]${N} [side-project]   ${G}connected${N} (Merlin Rabens)" 0.8
slow ""

slow "${D}# 👀 Cody @mentions Merlin in #design-review …${N}" 1.2
slow "${B}[slack-mirror]${N} [myworkspace] ${Y}forwarding mention${N} in #design-review from Cody Smith" 0.3
slow "${B}[slack-mirror]${N} → telegram: 🔔 Slack myworkspace | mention in #design-review" 0.2
slow "${B}[slack-mirror]${N}              ${R}@Cody Smith:${N} hey @merlin can you review the mocks?" 0.2
slow "${B}[slack-mirror]${N}              [Open in Slack]" 1.5
slow ""

slow "${D}# Merlin types in Telegram: 'reply: on it, gimme 5 min'${N}" 1.2
slow "${B}[slack-mirror]${N} poster.chat.postMessage as Merlin → #design-review" 0.4
slow "${B}[slack-mirror]${N} ${G}✓ posted${N} ts=1709567890.123456 ${D}(visible to Slack as Merlin, not a bot)${N}" 1.5
slow ""

slow "${D}# That's it. Zero bot footprint. Your real identity. Pinged anywhere.${N}" 2
