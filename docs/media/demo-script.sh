#!/bin/bash
# Slack Mirror demo — runs inside VHS recording.
# Starts with `clear` to wipe scrollback so the bash command that invoked us
# is hidden from the recording.

clear

# Colors
G='\033[0;32m'  # green
B='\033[0;34m'  # blue
Y='\033[1;33m'  # yellow
D='\033[0;90m'  # dim
C='\033[0;36m'  # cyan
R='\033[0;31m'  # red
N='\033[0m'     # reset

slow() { printf "$1\n"; sleep "${2:-0.4}"; }

slow "${D}# Slack Mirror — listen to all your Slack workspaces invisibly${N}" 1.2
slow ""
slow "${C}\$ openclaw plugin add @bluedigits/openclaw-plugin-slack-mirror${N}" 0.7
slow "${G}✓${N} installed v0.1.0" 0.3
slow "${G}✓${N} scrape browser session via included bookmarklet" 0.3
slow "${G}✓${N} paste sessionConfig + dCookie into ~/.openclaw/openclaw.json" 0.4
slow ""

slow "${C}\$ openclaw gateway restart && tail -f /tmp/slack-mirror.log${N}" 0.7
slow "${B}[slack-mirror]${N} discovered 3 workspaces: myworkspace, customer-co, side-project" 0.3
slow "${B}[slack-mirror]${N} [myworkspace]    ${G}connected${N} (Merlin Rabens)" 0.25
slow "${B}[slack-mirror]${N} [customer-co]    ${G}connected${N} (Merlin Rabens)" 0.25
slow "${B}[slack-mirror]${N} [side-project]   ${G}connected${N} (Merlin Rabens)" 1.2
slow ""

slow "${D}# Cody @mentions Merlin in #design-review …${N}" 1.2
slow "${B}[slack-mirror]${N} → telegram: 🔔 Slack myworkspace | mention in #design-review" 0.3
slow "${B}[slack-mirror]${N}   ${R}@Cody Smith:${N} hey @merlin can you review the mocks?" 0.3
slow "${B}[slack-mirror]${N}   [Open in Slack]" 1.5
slow ""

slow "${D}# Merlin replies via Telegram: \"on it, gimme 5 min\"${N}" 1.2
slow "${B}[slack-mirror]${N} ${G}✓ posted as Merlin${N} → #design-review (no bot user)" 1.5
slow ""

slow "${Y}# Zero bot footprint. Real identity. Pinged anywhere.${N}" 2.5
