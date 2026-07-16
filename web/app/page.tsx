import { isAuthed } from "@/lib/auth";
import Login from "./Login";
import Admin from "./Admin";

// Never prerender: whether Login or Admin renders depends on the auth cookie.
// Without this, a build without CIMOFLIX_ADMIN_PASSWORD set freezes the page
// as the login screen (isAuthed() short-circuits before touching cookies()).
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAuthed())) return <Login />;
  return (
    <Admin
      baseUrl={(process.env.CIMOFLIX_BASE_URL ?? "").replace(/\/+$/, "")}
      xboxFtp={process.env.CIMOFLIX_XBOX_FTP ?? "ftp://xbox:xbox@192.168.1.50"}
    />
  );
}
