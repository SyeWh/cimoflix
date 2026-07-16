import { del } from "@vercel/blob";
import { isAuthed } from "@/lib/auth";
import { readLibrary, writeLibrary, newId, type Item } from "@/lib/store";

async function guard(): Promise<Response | null> {
  if (await isAuthed()) return null;
  return Response.json({ error: "Not signed in." }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return Response.json(await readLibrary());
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    kind?: string;
    url?: string;
  } | null;

  const title = body?.title?.trim() ?? "";
  const url = body?.url?.trim() ?? "";
  const kind: Item["kind"] = body?.kind === "upload" ? "upload" : "link";

  if (!title) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }
  if (!/^https?:\/\//.test(url)) {
    return Response.json(
      { error: "URL must start with http:// or https://." },
      { status: 400 },
    );
  }
  if (url.includes(",")) {
    // Not a style preference: the Xbox splits PlayMedia() arguments on commas,
    // so a URL containing one is truncated on the console and will never play.
    return Response.json(
      {
        error:
          "URL contains a comma. The Xbox splits PlayMedia() arguments on commas, so this URL would be cut off on the console and never play. Re-host it under a comma-free URL.",
      },
      { status: 400 },
    );
  }

  const items = await readLibrary();
  const item: Item = { id: newId(items), title, kind, url, addedAt: Date.now() };
  items.push(item);
  await writeLibrary(items);
  return Response.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const items = await readLibrary();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return Response.json({ error: "Unknown id." }, { status: 404 });
  }
  await writeLibrary(items.filter((i) => i.id !== id));
  if (item.kind === "upload") {
    await del(item.url).catch(() => {}); // best effort; the manifest is already updated
  }
  return Response.json({ ok: true });
}
