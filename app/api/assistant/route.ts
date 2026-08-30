import { getSessionUser } from "../../app-auth";
import { filterValue, insertRow, selectRows, updateRows } from "../../../db/supabase";

const nullableString={type:["string","null"]},nullableInteger={type:["integer","null"]},nullableNumber={type:["number","null"]},nullableBoolean={type:["boolean","null"]};
const draftKeys=["serviceType","serviceDate","startTime","endTime","clientPhone","summary","reportedFaultCode","foundFaultCode","serviceDetail","technician","serviceValue","calibrationVerified","observations","receivedBy"];
const schema={type:"object",additionalProperties:false,required:["assistantReply","title","companyId","equipmentId","draft"],properties:{assistantReply:{type:"string"},title:{type:"string"},companyId:nullableInteger,equipmentId:nullableInteger,draft:{type:"object",additionalProperties:false,required:draftKeys,properties:{serviceType:nullableString,serviceDate:nullableString,startTime:nullableString,endTime:nullableString,clientPhone:nullableString,summary:nullableString,reportedFaultCode:nullableString,foundFaultCode:nullableString,serviceDetail:nullableString,technician:nullableString,serviceValue:nullableNumber,calibrationVerified:nullableBoolean,observations:nullableString,receivedBy:nullableString}}}};

async function requireUser(){const user=await getSessionUser();if(!user)throw new Error("UNAUTHORIZED");return user}
const safe=(value:unknown)=>String(value??"").trim();

async function details(id:number,user:any){
  const [conversation]=await selectRows<Record<string,any>>("assistant_conversations",`select=*&id=eq.${id}&created_by=eq.${Number(user.id)}&limit=1`);
  if(!conversation)return null;
  const messages=await selectRows<Record<string,any>>("assistant_messages",`select=*&conversation_id=eq.${id}&order=created_at.asc`);
  return{conversation,messages};
}

export async function GET(request:Request){
  try{
    const user=await requireUser(),url=new URL(request.url),id=Number(url.searchParams.get("id")||0);
    if(id){const result=await details(id,user);return result?Response.json(result):Response.json({error:"Conversación no encontrada."},{status:404})}
    const search=safe(url.searchParams.get("search")).toLowerCase();
    let conversations=await selectRows<Record<string,any>>("assistant_conversations",`select=*&created_by=eq.${Number(user.id)}&order=updated_at.desc`);
    if(search)conversations=conversations.filter(item=>[item.title,item.code,item.status].some(v=>safe(v).toLowerCase().includes(search)));
    return Response.json({conversations});
  }catch(error){return Response.json({error:error instanceof Error&&error.message==="UNAUTHORIZED"?"No autorizado":"No fue posible consultar los chats."},{status:error instanceof Error&&error.message==="UNAUTHORIZED"?401:500})}
}

async function askOpenAI(conversation:any,messages:any[],catalog:any[]){
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_MISSING");
  const instructions=`Eres el asistente técnico interno de JD Soluciones Biomédicas. Tu objetivo es completar un reporte de servicio mediante una conversación natural en español colombiano. Haz una sola pregunta clara por turno cuando falten datos. Nunca inventes empresas, equipos, mediciones, fechas, horas, valores ni diagnósticos. Conserva en draft cualquier dato ya confirmado. Los tipos permitidos son Correctivo, Preventivo, Instalación, Garantía o Diagnóstico. Para finalizar son obligatorios: equipmentId, serviceType, serviceDate, technician, summary y serviceDetail. Si hay verificación de calibración, indica que las mediciones se completarán después en el formulario formal. Catálogo autorizado: ${JSON.stringify(catalog)}. Borrador actual: ${JSON.stringify(conversation.draft||{})}. Devuelve únicamente el esquema solicitado.`;
  const input=messages.slice(-20).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.5",instructions,input,text:{format:{type:"json_schema",name:"service_report_turn",strict:true,schema}},max_output_tokens:1200})});
  if(!response.ok)throw new Error(`OPENAI_${response.status}`);
  const data=await response.json();const raw=data.output_text||data.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==="output_text")?.text;
  if(!raw)throw new Error("OPENAI_EMPTY");return JSON.parse(raw);
}

async function persistReport(conversation:any,draft:any,status:"pending"|"completed"){
  const equipmentId=Number(draft.equipmentId||conversation.equipmentId||0);if(!equipmentId)throw new Error("EQUIPMENT_REQUIRED");
  const [equipment]=await selectRows<Record<string,any>>("equipment",`select=*&id=eq.${equipmentId}&limit=1`);if(!equipment)throw new Error("EQUIPMENT_REQUIRED");
  if(status==="completed"&&(!draft.serviceType||!draft.serviceDate||!draft.technician||!draft.summary||!draft.serviceDetail))throw new Error("REPORT_INCOMPLETE");
  const values={equipmentId,serviceType:draft.serviceType||"Pendiente",status,technician:draft.technician||"Pendiente",summary:draft.summary||"Borrador creado desde el asistente técnico",observations:draft.observations,serviceValue:Number(draft.serviceValue||0),serviceDate:draft.serviceDate?new Date(`${draft.serviceDate}T12:00:00`):new Date(),startTime:draft.startTime,endTime:draft.endTime,clientPhone:draft.clientPhone,equipmentDescription:equipment.name,equipmentModel:equipment.model,equipmentBrand:equipment.brand,equipmentSerial:equipment.serialNumber,reportedFaultCode:draft.reportedFaultCode,foundFaultCode:draft.foundFaultCode,serviceDetail:draft.serviceDetail,calibrationVerified:Boolean(draft.calibrationVerified),calibrationMeasurements:"{}",receivedBy:draft.receivedBy};
  if(conversation.reportId){const[report]=await updateRows<Record<string,any>>("service_reports",`id=eq.${Number(conversation.reportId)}&status=neq.completed`,values);if(report)return report}
  const[last]=await selectRows<{id:number}>("service_reports","select=id&order=id.desc&limit=1");return insertRow<Record<string,any>>("service_reports",{...values,code:`SR${String((last?.id??0)+1).padStart(5,"0")}`});
}

export async function POST(request:Request){
  try{
    const user=await requireUser(),body=await request.json(),action=safe(body.action);
    if(action==="create"){
      const conversation=await insertRow<Record<string,any>>("assistant_conversations",{code:`CHAT-${Date.now().toString(36).toUpperCase()}`,title:"Nuevo reporte de servicio",createdBy:Number(user.id),draft:{}});
      const greeting="Hola. Cuéntame para qué empresa y equipo realizaste el servicio; iré organizando el reporte contigo.";
      await insertRow("assistant_messages",{conversationId:conversation.id,role:"assistant",content:greeting});return Response.json({conversation,greeting},{status:201});
    }
    const id=Number(body.conversationId||0),result=await details(id,user);if(!result)return Response.json({error:"Conversación no encontrada."},{status:404});
    if(result.conversation.status==="completed")return Response.json({error:"Este chat ya generó un reporte finalizado."},{status:409});
    if(action==="message"){
      const content=safe(body.content);if(!content)return Response.json({error:"Escribe un mensaje."},{status:400});
      await insertRow("assistant_messages",{conversationId:id,role:"user",content});
      const allMessages=[...result.messages,{role:"user",content}],companies=await selectRows<Record<string,any>>("companies","select=id,name,city,status&order=name.asc"),equipment=await selectRows<Record<string,any>>("equipment","select=id,company_id,name,brand,model,serial_number&order=name.asc");
      const catalog=companies.map(company=>({companyId:company.id,company:company.name,city:company.city,equipment:equipment.filter(item=>item.companyId===company.id)}));
      const ai=await askOpenAI(result.conversation,allMessages,catalog),newFields=Object.fromEntries(Object.entries(ai.draft||{}).filter(([,value])=>value!==null&&value!=="")),draft={...(result.conversation.draft||{}),...newFields,...(ai.companyId?{companyId:ai.companyId}:{}),...(ai.equipmentId?{equipmentId:ai.equipmentId}:{})};
      await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:ai.assistantReply});
      const[conversation]=await updateRows<Record<string,any>>("assistant_conversations",`id=eq.${id}`,{title:ai.title||result.conversation.title,companyId:draft.companyId||result.conversation.companyId,equipmentId:draft.equipmentId||result.conversation.equipmentId,draft,status:"open",updatedAt:new Date()});
      return Response.json({conversation,message:ai.assistantReply});
    }
    if(action==="save"||action==="finalize"){
      const draft={...(result.conversation.draft||{}),...(body.draft||{})},report=await persistReport(result.conversation,draft,action==="finalize"?"completed":"pending");
      const[conversation]=await updateRows<Record<string,any>>("assistant_conversations",`id=eq.${id}`,{draft,reportId:report.id,status:action==="finalize"?"completed":"draft",updatedAt:new Date()});
      const message=action==="finalize"?`Reporte ${report.code} finalizado correctamente.`:`Borrador ${report.code} guardado. Puedes continuar esta conversación cuando quieras.`;
      await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:message});return Response.json({conversation,report,message});
    }
    return Response.json({error:"Acción no válida."},{status:400});
  }catch(error){
    const message=error instanceof Error?error.message:"";console.error("Assistant API",message);
    if(message==="UNAUTHORIZED")return Response.json({error:"No autorizado"},{status:401});
    if(message==="OPENAI_MISSING")return Response.json({error:"La clave de OpenAI no está configurada en Netlify."},{status:503});
    if(message.startsWith("OPENAI_"))return Response.json({error:"OpenAI no pudo responder. Verifica la clave, saldo y modelo configurado."},{status:502});
    if(message==="EQUIPMENT_REQUIRED")return Response.json({error:"Antes de guardar, identifica claramente la empresa y el equipo en la conversación."},{status:400});
    if(message==="REPORT_INCOMPLETE")return Response.json({error:"Faltan datos obligatorios. Continúa conversando hasta completar equipo, tipo, fecha, técnico, falla y detalle."},{status:400});
    return Response.json({error:"No fue posible procesar el asistente técnico."},{status:500});
  }
}
