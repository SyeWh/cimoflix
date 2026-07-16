import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAuthed } from "@/lib/auth";

// Videos are uploaded straight from the browser to Blob (client upload).
// They cannot pass through this function: a serverless request body is far
// too small for a movie. This route only mints the upload token.
export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/*", "application/octet-stream"],
        addRandomSuffix: true,
        maximumSizeInBytes: 8 * 1024 * 1024 * 1024,
      }),
      // Registration in library.json happens from the browser via POST
      // /api/library once the upload finishes (this callback doesn't fire on
      // localhost, and keeping store writes in one place is simpler anyway).
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
