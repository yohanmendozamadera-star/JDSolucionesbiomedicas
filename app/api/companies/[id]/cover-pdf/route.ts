import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "../../../../app-auth";
import { selectRows } from "../../../../../db/supabase";
import { companyCoverPdf } from "../../../../../db/formal-pdfs";

export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});
 const {id}=await params,[company]=await selectRows<Record<string,any>>("companies",`select=*&id=eq.${Number(id)}&limit=1`);if(!company)return Response.json({error:"Empresa no encontrada"},{status:404});
 const logo=await readFile(path.join(process.cwd(),"public","brand","jd-soluciones-logo.png"));const pdf=await companyCoverPdf(company,logo);
 return new Response(pdf as BodyInit,{headers:{"content-type":"application/pdf","content-disposition":`inline; filename="portada-${company.code}.pdf"`}});
}
