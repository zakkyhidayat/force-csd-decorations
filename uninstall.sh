#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ID="force-csd-decorations"

if ! command -v kpackagetool6 &>/dev/null; then
    echo "Error: kpackagetool6 not found." >&2
    exit 1
fi

if ! kpackagetool6 --type KWin/Script --show "$SCRIPT_ID" &>/dev/null; then
    echo "$SCRIPT_ID is not installed."
    exit 0
fi

echo "Uninstalling $SCRIPT_ID..."
kpackagetool6 --type KWin/Script --remove "$SCRIPT_ID"

# Disable via kwriteconfig if it was enabled
kwriteconfig6 --file kwinrc --group Plugins --key "${SCRIPT_ID}Enabled" false 2>/dev/null || true

# Reload KWin scripts if running
if qdbus6 org.kde.KWin /Scripting &>/dev/null 2>&1; then
    qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.start 2>/dev/null || true
fi

echo "Done."
