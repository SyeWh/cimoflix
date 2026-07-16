import { list, put } from "@vercel/blob";
import { randomBytes } from "crypto";

export type Item = {
  id: string; // 8 hex chars, unique. The console dedupes favourites on the full
  // execute string ("PlayMedia(...)"), so two items sharing an id would
  // silently collapse into one entry on the Xbox. newId() guarantees uniqueness.
  title: string; // what shows on the TV
  kind: "link" | "upload";
  url: string; // remote URL, or Blob URL
  addedAt: number;
};

const LIBRARY_PATH = "cimoflix/library.json";

export async function readLibrary(): Promise<Item[]> {
  try {
    const { blobs } = await list({ prefix: LIBRARY_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === LIBRARY_PATH);
    if (!blob) return [];
    // Cache-busting query: Blob URLs sit behind a CDN, and after an overwrite the
    // bare URL can serve the previous library for a while. The query string makes
    // every read a cache miss without affecting which blob is fetched.
    const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Item[];
  } catch {
    return []; // no store token or no library.json yet
  }
}

export async function writeLibrary(items: Item[]): Promise<void> {
  await put(LIBRARY_PATH, JSON.stringify(items, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export function newId(existing: Item[]): string {
  for (;;) {
    const id = randomBytes(4).toString("hex");
    if (!existing.some((i) => i.id === id)) return id;
  }
}
