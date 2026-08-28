import { putFile } from "../../../db/file-storage";
import { getSessionUser } from "../../app-auth";
import { selectRows, updateRows } from "../../../db/supabase";

export async function GET(){
  const [settings]=await selectRows<Record<string,any>>("site_settings","select=*&id=eq.1&limit=1");
  return Response.json({settings:{...settings,aboutImageUrl:settings?.aboutImageKey?`/api/settings/image?v=${encodeURIComponent(settings.updatedAt||"")}`:"/brand/technician-maintenance.webp"}});
}

export async function POST(request:Request){
  if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});
  try{
    const form=await request.formData(),body=Object.fromEntries(form),photo=form.get("aboutImage");
    const values:Record<string,unknown>={aboutKicker:String(body.aboutKicker||""),aboutTitle:String(body.aboutTitle||""),aboutParagraph:String(body.aboutParagraph||""),experienceYears:String(body.experienceYears||""),experienceLabel:String(body.experienceLabel||""),feature1Title:String(body.feature1Title||""),feature1Text:String(body.feature1Text||""),feature2Title:String(body.feature2Title||""),feature2Text:String(body.feature2Text||""),feature3Title:String(body.feature3Title||""),feature3Text:String(body.feature3Text||""),contactCity:String(body.contactCity||""),contactEmail:String(body.contactEmail||""),contactPhone:String(body.contactPhone||""),contactHours:String(body.contactHours||""),whatsappPhone:String(body.whatsappPhone||""),updatedAt:new Date()};
    if(photo instanceof File&&photo.size){
      if(photo.size>5*1024*1024)return Response.json({error:"La imagen no puede superar 5 MB."},{status:400});
      if(!["image/jpeg","image/png","image/webp"].includes(photo.type))return Response.json({error:"Usa una imagen JPG, PNG o WEBP."},{status:400});
      const key=`branding/about-${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
      await putFile(key,await photo.arrayBuffer(),photo.type);values.aboutImageKey=key;values.aboutImageName=photo.name;
    }
    const [settings]=await updateRows<Record<string,any>>("site_settings","id=eq.1",values);
    return Response.json({settings});
  }catch(error){console.error("Settings update failed",error);return Response.json({error:"No pudimos guardar la configuración."},{status:500})}
}
