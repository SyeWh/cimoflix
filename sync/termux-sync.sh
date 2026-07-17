#!/data/data/com.termux/files/usr/bin/sh
# CimoFlix one-tap sync from an Android phone (no PC involved).
#
# One-time setup:
#   1. Install Termux and Termux:Widget (from F-Droid).
#   2. In Termux:  pkg install curl
#   3. mkdir -p ~/.shortcuts && cp this file to ~/.shortcuts/CimoFlix-Sync
#      then: chmod +x ~/.shortcuts/CimoFlix-Sync
#   4. Add the Termux:Widget to your home screen, pick "CimoFlix-Sync".
#
# Edit these two lines:
APP="https://YOUR-APP.vercel.app"
XBOX="ftp://xbox:xbox@192.168.1.50"

curl -sf "$APP/favourites.xml" -o "$TMPDIR/favourites.xml" || { echo "download failed"; exit 1; }
curl -sf -T "$TMPDIR/favourites.xml" "$XBOX/system/favourites.xml" || { echo "ftp push failed (console on? same wifi?)"; exit 1; }
echo "synced. Reopen the library on the Xbox (B, then A)."
