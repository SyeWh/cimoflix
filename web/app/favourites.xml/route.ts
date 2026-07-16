import { readLibrary } from "@/lib/store";

// The Xbox cannot browse HTTP directories or ask us what's in the library.
// This file IS the library: it gets curl'd down and FTP'd to
// D:\system\favourites.xml on the console. Root element must be <favourites>.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: Request) {
  const items = await readLibrary();
  const base = (
    process.env.CIMOFLIX_BASE_URL || new URL(request.url).origin
  ).replace(/\/+$/, "");

  const entries = items.map(
    (i) =>
      // The .mp4 suffix is load-bearing: XBMC picks how to open a URL partly
      // from its extension. /api/play strips it back off to find the item.
      `\t<favourite name="${esc(i.title)}">PlayMedia(${esc(
        `${base}/api/play/${i.id}.mp4`,
      )})</favourite>`,
  );

  const body = entries.length ? `${entries.join("\n")}\n` : "";
  const xml = `<favourites>\n${body}</favourites>\n`;
  return new Response(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
