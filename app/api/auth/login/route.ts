import { filterValue, selectRows } from "../../../../db/supabase";
import { createSession, hashPassword } from "../../../app-auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };
    const [user] = await selectRows<Record<string, any>>("app_users", `select=*&email=eq.${filterValue(email?.trim().toLowerCase() ?? "")}&limit=1`);
    if (!user?.passwordHash || !user.passwordSalt || user.status !== "active") return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    const candidate = await hashPassword(password ?? "", user.passwordSalt);
    if (candidate.hash !== user.passwordHash) return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    const session = await createSession(user.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": session.cookie } });
  } catch (error) {
    console.error("Login failed", error);
    return Response.json({ error: "No pudimos conectar con el servidor. Inténtalo nuevamente." }, { status: 503 });
  }
}
