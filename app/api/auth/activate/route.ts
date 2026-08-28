import { filterValue, selectRows, updateRows } from "../../../../db/supabase";
import { createSession, hashPassword, sha256 } from "../../../app-auth";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json() as { token?: string; password?: string };
    if (!token || !password || password.length < 10) return Response.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 400 });
    const [user] = await selectRows<Record<string, any>>("app_users", `select=*&activation_hash=eq.${filterValue(await sha256(token))}&activation_used=eq.false&limit=1`);
    if (!user) return Response.json({ error: "El enlace no es válido o ya fue utilizado." }, { status: 400 });
    const passwordData = await hashPassword(password);
    await updateRows("app_users", `id=eq.${user.id}`, { passwordHash: passwordData.hash, passwordSalt: passwordData.salt, activationUsed: true });
    const session = await createSession(user.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": session.cookie } });
  } catch (error) {
    console.error("Activation failed", error);
    return Response.json({ error: "El servidor no pudo completar la activación. Inténtalo nuevamente." }, { status: 500 });
  }
}
