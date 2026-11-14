import { getSessionUser } from "../../app-auth";
import { readLocalEquipmentConfig, slug, writeLocalEquipmentConfig } from "../../../db/local-equipment-config";

export const runtime="nodejs";
export async function GET(){if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});return Response.json(await readLocalEquipmentConfig())}
export async function POST(request:Request){
 const user=await getSessionUser();if(!user)return Response.json({error:"No autorizado"},{status:401});
 const body=await request.json(),config=await readLocalEquipmentConfig();
 if(body.action==="saveRisk"){
  if(user.role==="technician")return Response.json({error:"No autorizado"},{status:403});
  const name=String(body.name||"").trim(),level=String(body.level||"").trim(),category=String(body.category||"").trim();if(!name||!level||!category)return Response.json({error:"Completa nombre, nivel y categoría."},{status:400});
  const id=String(body.id||slug(name)||crypto.randomUUID()),risk={id,name,level,category},index=config.risks.findIndex(r=>r.id===id);if(index>=0)config.risks[index]=risk;else config.risks.push(risk);
 }else if(body.action==="deleteRisk"){
  if(user.role==="technician")return Response.json({error:"No autorizado"},{status:403});
  config.risks=config.risks.filter(r=>r.id!==String(body.id));
 }
 else if(body.action==="saveEquipment")config.equipment[String(Number(body.equipmentId))]={riskId:String(body.riskId||""),invimaRegistration:String(body.invimaRegistration||""),nextMaintenanceDate:String(body.nextMaintenanceDate||"")};
 else if(body.action==="saveAgenda"){
  if(user.role==="technician")return Response.json({error:"No autorizado"},{status:403});
  const companyId=Number(body.companyId),title=String(body.title||"").trim(),date=String(body.date||"").trim();
  if(!companyId||!title||!date)return Response.json({error:"Completa empresa, actividad y fecha."},{status:400});
  const id=String(body.id||crypto.randomUUID()),event={id,companyId,equipmentId:body.equipmentId?Number(body.equipmentId):undefined,title,service:String(body.service||title),date,startTime:String(body.startTime||""),endTime:String(body.endTime||""),technician:String(body.technician||""),city:String(body.city||""),address:String(body.address||""),status:["planned","confirmed","in_progress","completed","cancelled"].includes(String(body.status))?body.status:"planned",notes:String(body.notes||"")};
  const index=config.agenda.findIndex(item=>item.id===id);if(index>=0)config.agenda[index]=event;else config.agenda.push(event);
 }else if(body.action==="deleteAgenda"){
  if(user.role==="technician")return Response.json({error:"No autorizado"},{status:403});
  config.agenda=config.agenda.filter(item=>item.id!==String(body.id));
 }
 else return Response.json({error:"Acción no válida."},{status:400});
 await writeLocalEquipmentConfig(config);return Response.json(config);
}
