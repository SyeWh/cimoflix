"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Item } from "@/lib/store";

export default function Admin({
  baseUrl,
  xboxFtp,
}: {
  baseUrl: string;
  xboxFtp: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const base =
    baseUrl || (typeof window !== "undefined" ? location.origin : "");

  useEffect(() => {
    fetch("/api/library")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((data: Item[]) => setItems(data))
      .catch(() => setError("Could not load the library. Is the Blob store connected?"))
      .finally(() => setLoaded(true));
  }, []);

  async function registerItem(payload: {
    title: string;
    kind: Item["kind"];
    url: string;
  }): Promise<Item | null> {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res
      .json()
      .catch(() => ({ error: "Server error. Is the Blob store connected?" }));
    if (!res.ok) {
      setError(data.error ?? "Failed to add.");
      return null;
    }
    setItems((prev) => [...prev, data as Item]);
    return data as Item;
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAddingLink(true);
    const added = await registerItem({
      title: linkTitle,
      kind: "link",
      url: linkUrl,
    });
    if (added) {
      setLinkTitle("");
      setLinkUrl("");
    }
    setAddingLink(false);
  }

  async function addUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      // Client-side upload: the file goes browser -> Blob directly. A video
      // will not fit through a serverless function's request body.
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      const added = await registerItem({
        title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        kind: "upload",
        url: blob.url,
      });
      if (added) {
        setUploadTitle("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
    setUploading(false);
  }

  async function remove(item: Item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setError("");
    const res = await fetch(`/api/library?id=${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setError((await res.json()).error ?? "Delete failed.");
    }
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    location.reload();
  }

  const syncCommands = `curl -s "${base}/favourites.xml" -o favourites.xml
curl -T favourites.xml "${xboxFtp.replace(/\/+$/, "")}/system/favourites.xml"`;

  function copySync() {
    navigator.clipboard.writeText(syncCommands);
  }

  return (
    <main className="admin">
      <header>
        <h1 className="wordmark">CIMOFLIX</h1>
        <button className="ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="forms">
        <form onSubmit={addLink} className="card">
          <h2>Add a link</h2>
          <input
            placeholder="Title (what shows on the TV)"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
          />
          <input
            placeholder="https://…/video.mp4"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button type="submit" disabled={addingLink || !linkTitle || !linkUrl}>
            {addingLink ? "Adding…" : "Add link"}
          </button>
        </form>

        <form onSubmit={addUpload} className="card">
          <h2>Upload a file</h2>
          <input
            placeholder="Title (optional, defaults to filename)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <input type="file" accept="video/*,.mp4,.mkv,.avi" ref={fileRef} />
          <button type="submit" disabled={uploading}>
            {uploading ? `Uploading… ${Math.round(progress)}%` : "Upload"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Library</h2>
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">Nothing here yet. Add a link or upload a file.</p>
        ) : (
          <ul className="library">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {" "}
                    · {item.kind} · {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                  <div className="muted mono">
                    {base}/api/play/{item.id}.mp4
                  </div>
                </div>
                <button className="ghost danger" onClick={() => remove(item)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Sync to the Xbox</h2>
        <p className="muted">
          Run these two commands to push the library onto the console:
        </p>
        <pre className="mono">{syncCommands}</pre>
        <button className="ghost" onClick={copySync}>
          Copy commands
        </button>
      </section>
    </main>
  );
}
