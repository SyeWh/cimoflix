import { checkPassword, setAuthCookie, clearAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;
  if (!body?.password || !checkPassword(body.password)) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  await setAuthCookie();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAuthCookie();
  return Response.json({ ok: true });
}
