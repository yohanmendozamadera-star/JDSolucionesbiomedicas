import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "../../../../app-auth";
import { selectRows } from "../../../../../db/supabase";
import { maintenanceProgramPdf } from "../../../../../db/formal-pdfs";
import { readLocalEquipmentConfig } from "../../../../../db/local-equipment-config";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});const {id}=await params,body=await request.json(),ids=(body.equipmentIds||[]).map(Number);
 if(!ids.length)return Response.json({error:"Selecciona al menos un equipo."},{status:400});
 const [[company],equipment,config,logo]=await Promise.all([selectRows<Record<string,any>>("companies",`select=*&id=eq.${Number(id)}&limit=1`),selectRows<Record<string,any>>("equipment",`select=*&company_id=eq.${Number(id)}&order=registered_at.desc`),readLocalEquipmentConfig(),readFile(path.join(process.cwd(),"public","brand","jd-soluciones-logo.png"))]);
 if(!company)return Response.json({error:"Empresa no encontrada"},{status:404});const selected=equipment.filter(v=>ids.includes(Number(v.id))).map(v=>({...v,planning:config.equipment[String(v.id)]||{}}));
 const pdf=await maintenanceProgramPdf(company,selected,logo);return new Response(pdf as BodyInit,{headers:{"content-type":"application/pdf","content-disposition":`inline; filename="programa-mantenimiento-${company.code}.pdf"`}});
}
