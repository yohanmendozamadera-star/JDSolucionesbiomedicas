import { selectRows } from "../../../../../db/supabase";
import { getFile } from "../../../../../db/file-storage";
import { getSessionUser } from "../../../../app-auth";
export async function GET(_:Request,context:{params:Promise<{id:string}>}){
 if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});
 const{id}=await context.params,[item]=await selectRows<Record<string,any>>("equipment",`select=*&id=eq.${Number(id)}&limit=1`);
 if(!item?.evidenceKey)return Response.json({error:"Sin evidencia fotográfica"},{status:404});
 const object=await getFile(item.evidenceKey);
 if(!object)return Response.json({error:"Archivo no encontrado"},{status:404});
 return new Response(object.body,{headers:{"content-type":item.evidenceContentType||object.type||"image/jpeg","cache-control":"private, max-age=3600"}});
}
