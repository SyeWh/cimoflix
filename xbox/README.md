# Installing CimoFlix on the Xbox 360

This guide takes a modded (RGH/JTAG) Xbox 360 from nothing to booting straight
into your CimoFlix library. Total time: about 15 minutes, most of it file
transfer.

## What you need

- An RGH/JTAG Xbox 360 with a dashboard that has FTP or a file manager
  (Aurora, FreeStyle Dash, or XeXMenu all work)
- The `xbmc360/` folder from this repo — the prebuilt XBMC-360 with the
  CimoFlix skin already applied (stock skin files are kept next to the
  modified ones as `*.orig`)
- Your PC and the console on the same network

## Step 1 — Copy XBMC-360 to the console

Copy the entire `xbmc360/` folder to the console, e.g. to:

```
Hdd:\Apps\XBMC360\
```

FTP from your PC (Aurora/FSD run an FTP server; default login is usually
`xbox` / `xbox`), or copy the folder to a USB stick and move it over with the
console's file manager.

Inside XBMC-360, `D:\` always means "the folder containing `default.xex`" —
so `D:\system\...` below means `Hdd:\Apps\XBMC360\system\...`.

## Step 2 — First launch and the smoke test

**Do this before anything else.** It validates the whole design with zero
CimoFlix code involved.

1. On your PC, create a file called `favourites.xml` containing:

   ```xml
   <favourites>
       <favourite name="Smoke Test">PlayMedia(https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4)</favourite>
   </favourites>
   ```

2. Put it at `D:\system\favourites.xml` on the console (FTP or USB).
3. Launch `default.xex` from your dashboard's file manager / app launcher.
4. You should land on the black-and-red CimoFlix home screen. Select
   **Open library** (or wait — see Step 3 for auto-open). Your "Smoke Test"
   entry appears. Press **A**.

If the video plays: everything works, continue. If it does not: **stop**.
Do not tweak, do not add workarounds — report what happened, because the
design's core assumption failed.

## Step 3 — Open the library on boot

The repo already placed `scripts/autoexec.py` inside `xbmc360/`, so if you
copied the whole folder in Step 1 this already works: XBMC-360 runs
`D:\scripts\autoexec.py` at startup, which does exactly one thing:

```python
import xbmc
xbmc.executebuiltin('ActivateWindow(favourites)')
```

Boot the console into XBMC and the CimoFlix list is the first thing you see.

(If you are applying files to an existing XBMC-360 install instead, copy
`xbox/autoexec.py` to `D:\scripts\autoexec.py`, `xbox/skin/DialogFavourites.xml`
and `xbox/skin/Home.xml` into `D:\skins\Project Mayhem III\`, and paste the
`<font>` blocks from `xbox/skin/Fonts.append.xml` inside
`<fontset id="Default">` of `D:\skins\Project Mayhem III\Fonts.xml`.)

## Step 4 — Point the console at your real library

Once the web app is deployed (see the root README), sync the library:

```sh
curl -s "https://YOUR-APP.vercel.app/favourites.xml" -o favourites.xml
curl -T favourites.xml "ftp://xbox:xbox@CONSOLE-IP/system/favourites.xml"
```

Notes:

- The admin UI shows these two commands pre-filled with a copy button.
- The second command targets the FTP server **inside XBMC-360** (it runs one
  on port 21). If you sync while XBMC is not running, FTP through your
  dashboard instead and adjust the path to wherever XBMC lives, e.g.
  `ftp://xbox:xbox@CONSOLE-IP/Hdd/Apps/XBMC360/system/favourites.xml`.
- Re-run the two commands whenever you add or remove titles. There is no
  auto-sync on the console and there cannot be: its Python has no networking,
  and it cannot browse HTTPS directories. Pushing a file is the design.
- To make the push painless, use the ready-made wrappers in `sync/`:
  `termux-sync.sh` gives you a one-tap sync button on an Android home screen
  (no PC involved), and `sync.ps1` can run as a Windows Scheduled Task every
  10 minutes while your PC is on. Setup instructions are inside each file.
- No restart needed after syncing: the favourites list is re-read every time
  the dialog opens. Press **B** (back to home), then reopen the library.

## Step 5 — Daily use

- **A** — play the selected title
- **B** — back to the home screen
- The console streams straight from Blob/your video host over HTTPS,
  following the redirect from `/api/play/<id>.mp4`. Seeking works.

## Media rules (why something won't play)

The console decodes H.264 in plain C on a 2005 CPU — no vector instructions.

| Symptom | Cause |
|---|---|
| Stutters, drops frames | 1080p source. **720p is the ceiling.** |
| Plays but silent | DTS audio track — the console has no DTS decoder |
| Won't open at all | HEVC/VP9 video, or the URL contains a comma |
| Title missing from the list | Duplicate of another entry (the console dedupes on the play URL) or the URL contains a comma |
| Subtitles missing | Always. There is no subtitle rendering in this build |

When in doubt, normalise on your PC before uploading:

```sh
ffmpeg -i in.mkv -c:v libx264 -profile:v baseline -level 3.1 -vf scale=-2:720 \
       -c:a aac -b:a 160k -movflags +faststart out.mp4
```

## Reverting the skin

The stock Project Mayhem III files sit next to the CimoFlix ones inside
`xbmc360/skins/Project Mayhem III/` as `DialogFavourites.xml.orig`,
`Home.xml.orig`, `Fonts.xml.orig`, and `colors/defaults.xml.orig`. Delete the
CimoFlix version and strip the `.orig` suffix to go back.
