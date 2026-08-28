import { selectRows } from "../../../../db/supabase";
import { getFile } from "../../../../db/file-storage";

export async function GET(request:Request){const [settings]=await selectRows<Record<string,any>>("site_settings","select=about_image_key&id=eq.1&limit=1");if(!settings?.aboutImageKey)return Response.redirect(new URL("/brand/technician-maintenance.webp",request.url));const object=await getFile(settings.aboutImageKey);if(!object)return Response.json({error:"Imagen no encontrada"},{status:404});return new Response(object.body,{headers:{"content-type":object.type||"image/jpeg","cache-control":"public, max-age=3600"}})}
