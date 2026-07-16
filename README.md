# CimoFlix

A personal media library, managed from a Vercel web app, that plays on a
modded (RGH/JTAG) Xbox 360 running a prebuilt build of
[XBMC-360](https://github.com/brentdc-nz/XBMC-360).

```
Vercel web app           →  add titles (links or uploaded files)
   │  serves /favourites.xml
   ↓
sync (two curl commands) →  pushes favourites.xml onto the console over FTP
   ↓
Xbox 360                 →  shows the list. Press A. It streams.
```

- `web/` — the Next.js app (the whole product, really)
- `xbox/` — the three console-side files + skin snippets
- `xbmc360/` — your prebuilt XBMC-360 drop (not in git). The CimoFlix skin
  files are already applied to it; the stock originals sit next to them as
  `*.orig`.

## Security model, stated plainly

`/favourites.xml` and `/api/play/<id>.mp4` are **public, no authentication**.
The console cannot log in and `PlayMedia()` cannot send auth headers, so these
endpoints cannot be protected. Anyone who knows the URLs can read the library
XML and follow playback redirects. The admin UI and all library-management
endpoints are password-gated. Also note the console's HTTPS client does not
validate certificates (a property of the prebuilt binary).

## 1. Deploy the web app

1. Push this repo (or just `web/`) to GitHub and import it in Vercel.
   Set the project **Root Directory** to `web/`.
2. In the Vercel project: **Storage → Create → Blob**. Attaching it sets
   `BLOB_READ_WRITE_TOKEN` automatically.
3. Add environment variables:

| Variable | Required | What |
|---|---|---|
| `CIMOFLIX_ADMIN_PASSWORD` | yes | Password for the admin UI |
| `BLOB_READ_WRITE_TOKEN` | yes | Set automatically when you attach the Blob store |
| `CIMOFLIX_BASE_URL` | no | Public base URL used inside favourites.xml, e.g. `https://cimoflix.vercel.app`. Defaults to the request origin. Must not contain a comma. |
| `CIMOFLIX_XBOX_FTP` | no | FTP address of the console for the sync command, e.g. `ftp://xbox:xbox@192.168.1.50` |

4. Deploy. Sign in, add a title, and check `https://<app>/favourites.xml`.

To run locally: `cd web && npm install && CIMOFLIX_ADMIN_PASSWORD=... BLOB_READ_WRITE_TOKEN=... npm run dev`

## 2. Install on the console

Full step-by-step guide: **[xbox/README.md](xbox/README.md)**. Short version:

Everything under `xbmc360/` is already prepared — FTP/copy that whole folder
to the console as your XBMC-360 install and you are done. The pieces, if you
would rather apply them to an existing install:

1. `xbox/autoexec.py` → `D:\scripts\autoexec.py`
   (opens the CimoFlix list on boot; that is all Python can do here — the
   console build has no socket module, so no polling, ever)
2. `xbox/skin/DialogFavourites.xml` → `D:\skins\Project Mayhem III\DialogFavourites.xml`
3. `xbox/skin/Home.xml` → `D:\skins\Project Mayhem III\Home.xml`
4. `xbox/skin/Fonts.append.xml` — paste its `<font>` blocks inside
   `<fontset id="Default">` of `D:\skins\Project Mayhem III\Fonts.xml`
5. `xbox/skin/colors.append.xml` — optional; see the comment inside it

Do not rename window id `134` or list control `450` in the skin: the binary
looks them up by number. Skin coordinates are 720×576 (PAL), not 720p.

## 3. The smoke test (do this FIRST, on real hardware)

Before trusting any of this:

> Install the prebuilt XBMC-360. Hand-write `D:\system\favourites.xml` with a
> single entry pointing at any public HTTPS MP4:
>
> ```xml
> <favourites>
>     <favourite name="Smoke Test">PlayMedia(https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4)</favourite>
> </favourites>
> ```
>
> Open favourites. Press A.

If that plays, every assumption holds and the rest is plumbing. If it does
not, **stop** — do not add fallbacks; the design needs rethinking, not
patching.

## 4. Sync the library to the console

Two commands (also shown pre-filled, with a copy button, in the admin UI):

```sh
curl -s "https://cimoflix.vercel.app/favourites.xml" -o favourites.xml
curl -T favourites.xml "ftp://xbox:xbox@192.168.1.50/system/favourites.xml"
```

There is no sync daemon and there never will be: the console cannot ask the
server what changed (it can *play* an HTTPS URL but cannot *browse* one), so
the library is pushed as a file.

## 5. Normalise media before adding it

The console decodes H.264 in portable C on a 2005 CPU with no SIMD.
**720p max — 1080p will not work.** No HEVC, no VP9, and no DTS audio
(the demuxer sees DTS tracks; there is no decoder). Subtitles never render.
Re-encode anything questionable before uploading:

```sh
ffmpeg -i in.mkv -c:v libx264 -profile:v baseline -level 3.1 -vf scale=-2:720 \
       -c:a aac -b:a 160k -movflags +faststart out.mp4
```

## 6. Verifying a deploy

```sh
# valid XML, <favourites> root, one <favourite> per title:
curl "https://<app>/favourites.xml"

# must end on the video host with HTTP 200 and Accept-Ranges: bytes:
curl -IL "https://<app>/api/play/<id>.mp4"
```

Rules that will silently break playback if "cleaned up" later:

- A URL with a **comma** never plays: the console splits `PlayMedia()`
  arguments on commas. The API rejects such URLs on input.
- Two favourites with the **same execute string** collapse into one on the
  console. Unique 8-hex ids in `/api/play/<id>.mp4` prevent this.
- `/api/play` is a **302, not a proxy**. Proxying through Vercel breaks HTTP
  Range and therefore seeking; the console follows redirects itself.
- The `.mp4` suffix on play URLs is load-bearing: XBMC decides how to open a
  URL partly from its extension.
