import { selectRows } from "../../../../../db/supabase";
import { equipmentPdf } from "../../../../../db/formal-pdfs";
import { getFile } from "../../../../../db/file-storage";
import { getSessionUser } from "../../../../app-auth";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  const [item] = await selectRows<Record<string, any>>("equipment", `select=*&id=eq.${Number(id)}&limit=1`);
  if (!item) return Response.json({ error: "Equipo no encontrado" }, { status: 404 });
  const [company] = await selectRows<Record<string, any>>("companies", `select=*&id=eq.${item.companyId}&limit=1`);
  let image; if(item.evidenceKey){const object=await getFile(item.evidenceKey);if(object)image={bytes:new Uint8Array(object.body),type:object.type||item.evidenceContentType||"image/jpeg"}}
  const pdf = await equipmentPdf(item,company,image);
  return new Response(pdf as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="hoja-de-vida-${item.code}.pdf"` } });
}
