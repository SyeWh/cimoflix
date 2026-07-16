import { readLibrary } from "@/lib/store";

// Public on purpose: the console cannot log in and PlayMedia() cannot send
// custom headers, so this endpoint (and /favourites.xml) take no auth.
//
// This is a 302, NOT a proxy — do not "improve" it. Streaming video through a
// serverless function burns bandwidth, hits response limits, and breaks HTTP
// Range requests, which kills seeking. The console has CURLOPT_FOLLOWLOCATION
// on (max 5 redirects) and talks to the storage host directly.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  // URLs end in .mp4 so XBMC treats them as video; the real key is the 8-hex id.
  const id = raw.replace(/\.mp4$/i, "");
  const items = await readLibrary();
  const item = items.find((i) => i.id === id);
  if (!item) return new Response("Not found", { status: 404 });
  return Response.redirect(item.url, 302);
}
