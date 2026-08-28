import { clearSession } from "../../../app-auth";
export async function POST() { return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": await clearSession() } }); }
export async function GET(request: Request) { return new Response(null, { status: 302, headers: { "location": new URL("/", request.url).toString(), "set-cookie": await clearSession() } }); }
