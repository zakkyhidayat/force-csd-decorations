#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ID="force-csd-decorations"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v kpackagetool6 &>/dev/null; then
    echo "Error: kpackagetool6 not found. Install plasma-framework or kf6-kpackage." >&2
    exit 1
fi

# Rebuild the .kwinscript bundle from source before installing
echo "Building ${SCRIPT_ID}.kwinscript..."
(cd "$SCRIPT_DIR" && zip -r "${SCRIPT_ID}.kwinscript" force-csd-decorations/ -x "*.pyc" "*/__pycache__/*" > /dev/null)

# Upgrade if already installed, otherwise install
if kpackagetool6 --type KWin/Script --show "$SCRIPT_ID" &>/dev/null; then
    echo "Upgrading $SCRIPT_ID..."
    kpackagetool6 --type KWin/Script --upgrade "$SCRIPT_DIR/force-csd-decorations"
else
    echo "Installing $SCRIPT_ID..."
    kpackagetool6 --type KWin/Script --install "$SCRIPT_DIR/force-csd-decorations"
fi

# Reload KWin scripting engine if KWin is running
if qdbus6 org.kde.KWin /Scripting &>/dev/null 2>&1; then
    echo "Reloading KWin scripts..."
    qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.start 2>/dev/null || true
fi

echo "Done. Enable the script in System Settings → Window Management → KWin Scripts."
