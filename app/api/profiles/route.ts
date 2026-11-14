import { filterValue, insertRow, selectRows } from "../../../db/supabase";
import { getSessionUser, randomToken, sha256 } from "../../app-auth";

async function manager() { const user = await getSessionUser(); return user&&["superowner","owner"].includes(String(user.role)) ? user : null; }

export async function GET() {
  if (!await manager()) return Response.json({ error: "Acceso exclusivo." }, { status: 403 });
  const profiles = await selectRows<Record<string, any>>("app_users", "select=id,name,email,role,company,status&status=eq.active&order=name.asc");
  return Response.json({ profiles: profiles.filter(p => p.role !== "superowner") });
}

export async function POST(request: Request) {
  const current=await manager();if (!current) return Response.json({ error: "Solo propietarios autorizados pueden crear perfiles." }, { status: 403 });
  const payload = await request.json() as { name?: string; email?: string; company?: string; role?: string };
  const name = payload.name?.trim(), email = payload.email?.trim().toLowerCase(), company = payload.company?.trim();
  if (!name || !email || !company) return Response.json({ error: "Completa todos los datos." }, { status: 400 });
  const activationToken = randomToken();
  try {
    const requestedRole=String(payload.role||"owner");
    const role=requestedRole==="owner"&&current.role!=="superowner"?"admin":["owner","admin","technician"].includes(requestedRole)?requestedRole:"admin";
    const profile = await insertRow<Record<string, any>>("app_users", { name, email, company, role, activationHash: await sha256(activationToken) });
    return Response.json({ profile, activationUrl: `${new URL(request.url).origin}/activar?token=${activationToken}` }, { status: 201 });
  } catch { return Response.json({ error: "Ese correo ya tiene un perfil." }, { status: 409 }); }
}
