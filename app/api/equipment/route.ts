import { insertRow, selectRows, updateRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";
import { putFile } from "../../../db/file-storage";

export async function POST(request: Request) {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData();
  const body = Object.fromEntries(form);
  if (!body.companyId || !body.name) return Response.json({ error: "Selecciona la empresa e indica el nombre del equipo." }, { status: 400 });
  const equipmentId=Number(body.equipmentId||0);
  const existing=equipmentId?(await selectRows<Record<string,any>>("equipment",`select=*&id=eq.${equipmentId}&company_id=eq.${Number(body.companyId)}&limit=1`))[0]:null;
  if(equipmentId&&!existing)return Response.json({error:"No se encontró la hoja de vida que deseas editar."},{status:404});
  const [last] = equipmentId?[{id:0}]:await selectRows<{id:number}>("equipment", "select=id&order=id.desc&limit=1");
  const code = existing?.code||`HV${String((last?.id ?? 0) + 1).padStart(5, "0")}`;
  const photo = form.get("evidencePhoto");
  if (photo instanceof File && photo.size > 10 * 1024 * 1024) return Response.json({ error: "La fotografía no puede superar 10 MB." }, { status: 400 });
  if (photo instanceof File && photo.size && !photo.type.startsWith("image/")) return Response.json({ error: "La evidencia debe ser una imagen." }, { status: 400 });
  const evidenceKey = photo instanceof File && photo.size ? `equipment/${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g,"-")}` : null;
  if (evidenceKey) {
    await putFile(evidenceKey,await (photo as File).arrayBuffer(),(photo as File).type);
  }
  const values:Record<string,any>={companyId:Number(body.companyId),name:String(body.name),model:String(body.model||""),brand:String(body.brand||""),serialNumber:String(body.serialNumber||""),purchaseDate:body.purchaseDate?new Date(`${body.purchaseDate}T12:00:00`):null,location:String(body.location||""),contactName:String(body.contactName||""),ownerName:String(body.ownerName||""),supplierName:String(body.supplierName||""),supplierAddress:String(body.supplierAddress||""),supplierPhone:String(body.supplierPhone||""),supplierEmail:String(body.supplierEmail||""),requiresMetrology:body.requiresMetrology==="yes",calibrationFrequency:String(body.calibrationFrequency||""),technicalDocuments:JSON.stringify(form.getAll("technicalDocuments")),observations:String(body.observations||"")};
  if(evidenceKey)Object.assign(values,{evidenceKey,evidenceFileName:(photo as File).name,evidenceContentType:(photo as File).type});
  if(existing){const[updated]=await updateRows<Record<string,any>>("equipment",`id=eq.${equipmentId}&company_id=eq.${Number(body.companyId)}`,values);return Response.json({equipment:{...updated,reports:[]}})}
  const created=await insertRow<Record<string,any>>("equipment",{...values,code,registeredAt:new Date(),evidenceKey,evidenceFileName:photo instanceof File&&photo.size?photo.name:null,evidenceContentType:photo instanceof File&&photo.size?photo.type:null});return Response.json({equipment:{...created,reports:[]}},{status:201});
}
