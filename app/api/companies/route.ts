import { insertRow, selectRows, updateRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";

export async function GET() {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const companyRows = await selectRows<Record<string, any>>("companies", "select=*&order=name.asc");
  const result = await Promise.all(companyRows.map(async company => {
    const equipmentRows = await selectRows<Record<string, any>>("equipment", `select=*&company_id=eq.${company.id}&order=name.asc`);
    const nested = await Promise.all(equipmentRows.map(async item => ({
      ...item,
      reports: await selectRows<Record<string, any>>("service_reports", `select=*&equipment_id=eq.${item.id}&order=service_date.asc`),
    })));
    return { ...company, equipment: nested };
  }));
  return Response.json({ companies: result });
}

export async function PATCH(request: Request) {
  const user=await getSessionUser();
  if(!user||!['superowner','owner','admin'].includes(String(user.role))) return Response.json({error:"No autorizado"},{status:403});
  const body=await request.json();
  if(!body.id||!["active","pending","inactive"].includes(body.status)) return Response.json({error:"Estado inválido"},{status:400});
  const rows=await updateRows<Record<string,any>>("companies",`id=eq.${Number(body.id)}`,{status:body.status});
  return Response.json({company:rows[0]});
}

export async function POST(request: Request) {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  if (!body.name || !body.nit || !body.representative || !body.phone || !body.representativeEmail || !body.department || !body.municipality) return Response.json({ error: "Completa todos los datos de la empresa." }, { status: 400 });
  const [last] = await selectRows<{id:number}>("companies", "select=id&order=id.desc&limit=1");
  const code = `EMP-${String((last?.id ?? 0) + 1).padStart(3, "0")}`;
  try {
    const created = await insertRow<Record<string, any>>("companies", { code, name: body.name, nit: String(body.nit).trim(), representative: body.representative, phone: body.phone, representativeEmail: body.representativeEmail, department: body.department, municipality: body.municipality, city: body.municipality, status: "pending", createdAt: new Date() });
    return Response.json({ company: { ...created, equipment: [] } }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Ya existe una empresa registrada con este NIT." }, { status: 409 });
    return Response.json({ error: "No fue posible registrar la empresa." }, { status: 500 });
  }
}
