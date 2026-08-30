import { getSessionUser } from "../../app-auth";
import { filterValue, insertRow, selectRows, updateRows } from "../../../db/supabase";
import { putFile } from "../../../db/file-storage";

const nullableString={type:["string","null"]},nullableInteger={type:["integer","null"]},nullableNumber={type:["number","null"]},nullableBoolean={type:["boolean","null"]};
const calibrationKeys=["base","up","down","error","tolerance","verification","reference","refUp","refDown","refError","refTolerance","refVerification"];
const calibrationRow={type:"object",additionalProperties:false,required:calibrationKeys,properties:Object.fromEntries(calibrationKeys.map(key=>[key,nullableString]))};
const draftKeys=["serviceType","serviceDate","startTime","endTime","clientPhone","summary","reportedFaultCode","foundFaultCode","serviceDetail","technician","serviceValue","calibrationVerified","calibrationRowCount","calibrationMeasurements","observations","receivedBy"];
const schema={type:"object",additionalProperties:false,required:["assistantReply","title","companyId","equipmentId","draft"],properties:{assistantReply:{type:"string"},title:{type:"string"},companyId:nullableInteger,equipmentId:nullableInteger,draft:{type:"object",additionalProperties:false,required:draftKeys,properties:{serviceType:nullableString,serviceDate:nullableString,startTime:nullableString,endTime:nullableString,clientPhone:nullableString,summary:nullableString,reportedFaultCode:nullableString,foundFaultCode:nullableString,serviceDetail:nullableString,technician:nullableString,serviceValue:nullableNumber,calibrationVerified:nullableBoolean,calibrationRowCount:nullableInteger,calibrationMeasurements:{type:["array","null"],items:calibrationRow,maxItems:4},observations:nullableString,receivedBy:nullableString}}}};
const imageSchema={type:"object",additionalProperties:false,required:["assistantReply","rowCount","measurements","uncertainFields"],properties:{assistantReply:{type:"string"},rowCount:{type:"integer"},measurements:{type:"array",items:calibrationRow,maxItems:4},uncertainFields:{type:"array",items:{type:"string"}}}};

async function requireUser(){const user=await getSessionUser();if(!user)throw new Error("UNAUTHORIZED");return user}
const safe=(value:unknown)=>String(value??"").trim();
const safeOpenAIError=(value:unknown)=>safe(value).replace(/sk-[A-Za-z0-9_-]+/g,"[clave oculta]").slice(0,300);
const wantsDraftSave=(value:string)=>/\b(guardar?|guarda|guarde|guardalo|guárdalo)\b[\s\S]{0,35}\b(parcial|borrador)\b|\b(parcial|borrador)\b[\s\S]{0,35}\b(guardar?|guarda|guarde|guardalo|guárdalo)\b/i.test(value);
const wantsFinalize=(value:string)=>/\b(finaliza|finalizar|finalízalo|termina|terminar|completa|completar)\b[\s\S]{0,30}\b(reporte|informe)\b|\b(reporte|informe)\b[\s\S]{0,30}\b(finaliza|finalizar|finalízalo|termina|terminar)\b/i.test(value);
function requestedTitle(value:string){
  const match=value.match(/(?:cambia(?:r)?|pon(?:er)?|coloca(?:r)?|renombra(?:r)?)[\s\S]{0,25}?(?:nombre|t[ií]tulo)(?:\s+del\s+chat)?\s+(?:a|como|por)\s+["“']?(.+?)["”']?[.!?]*$/i)
    ||value.match(/(?:ponle|col[oó]cale)\s+(?:al\s+chat\s+)?(?:el\s+nombre\s+)?["“']?(.+?)["”']?[.!?]*$/i);
  return match?safe(match[1]).slice(0,100):"";
}
function reportDate(value:unknown){
  const text=safe(value),today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(!text||/^hoy$/i.test(text))return today;
  if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
  const parts=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);return parts?`${parts[3]}-${parts[2].padStart(2,"0")}-${parts[1].padStart(2,"0")}`:today;
}
function calibrationJson(value:unknown){
  if(!Array.isArray(value))return "{}";
  const suffixes=["base","up","down","error","tol","check","reference","ref_up","ref_down","ref_error","ref_tol","ref_check"],result:Record<string,string>={};
  value.slice(0,4).forEach((row:any,index)=>calibrationKeys.forEach((key,column)=>{const entry=safe(row?.[key]);if(entry)result[`cal_${index}_${suffixes[column]}`]=entry}));
  return JSON.stringify(result);
}

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
  const instructions=`Eres el asistente técnico interno de JD Soluciones Biomédicas. Tu objetivo es completar un reporte de servicio mediante una conversación natural en español colombiano. Haz una sola pregunta clara por turno cuando falten datos. Nunca inventes empresas, equipos, mediciones, fechas, horas, valores ni diagnósticos. Conserva en draft cualquier dato ya confirmado. Devuelve serviceDate siempre en formato AAAA-MM-DD; hoy en Colombia es ${reportDate("hoy")}. Los tipos permitidos son Correctivo, Preventivo, Instalación, Garantía o Diagnóstico. Para finalizar son obligatorios: equipmentId, serviceType, serviceDate, technician, summary y serviceDetail. Si calibrationVerified es true, pregunta primero cuántas filas de medición se registrarán (máximo 4) y luego recopila para cada fila, en este orden: Base, Lectura arriba, Lectura abajo, Error, Tolerancia, Verificación, Referencia, Lectura arriba de referencia, Lectura abajo de referencia, Error de referencia, Tolerancia de referencia y Verificación de referencia. No inventes ni completes mediciones. Mantén calibrationMeasurements como un arreglo de filas y calibrationRowCount como el total indicado. Una verificación no está completa hasta tener todas las filas indicadas. Nunca afirmes que guardaste, finalizaste o creaste un reporte: esas acciones las confirma exclusivamente el sistema. Catálogo autorizado: ${JSON.stringify(catalog)}. Borrador actual: ${JSON.stringify(conversation.draft||{})}. Devuelve únicamente el esquema solicitado.`;
  const input=messages.slice(-20).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",instructions,input,text:{format:{type:"json_schema",name:"service_report_turn",strict:true,schema}},max_output_tokens:1200})});
  if(!response.ok){
    const failure=await response.json().catch(()=>null);
    const code=safe(failure?.error?.code)||safe(failure?.error?.type)||`http_${response.status}`;
    const detail=safeOpenAIError(failure?.error?.message)||"Sin detalle adicional";
    console.error("OpenAI request failed",response.status,code,detail);
    throw new Error(`OPENAI_${code}|${detail}`);
  }
  const data=await response.json();const raw=data.output_text||data.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==="output_text")?.text;
  if(!raw)throw new Error("OPENAI_EMPTY");return JSON.parse(raw);
}

async function readCalibrationImage(bytes:ArrayBuffer,type:string){
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_MISSING");
  const imageUrl=`data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||process.env.OPENAI_MODEL||"gpt-4o-mini",instructions:"Lee exclusivamente la tabla de verificación de calibración de la imagen. Puede contener máximo 4 filas y estas 12 columnas en orden: Base, Lectura arriba, Lectura abajo, Error, Tolerancia, Verificación, Referencia, Lectura arriba de referencia, Lectura abajo de referencia, Error de referencia, Tolerancia de referencia y Verificación de referencia. Transcribe literalmente; no calcules, corrijas ni inventes. Usa null cuando una celda esté vacía o no sea legible. Indica en uncertainFields cada celda dudosa usando el formato fila N - nombre de columna. En assistantReply presenta un resumen claro y pide confirmación antes de guardar.",input:[{role:"user",content:[{type:"input_text",text:"Extrae las mediciones visibles de esta tabla técnica."},{type:"input_image",image_url:imageUrl,detail:"high"}]}],text:{format:{type:"json_schema",name:"calibration_image_reading",strict:true,schema:imageSchema}},max_output_tokens:1600})});
  if(!response.ok){const failure=await response.json().catch(()=>null),code=safe(failure?.error?.code)||safe(failure?.error?.type)||`http_${response.status}`,detail=safeOpenAIError(failure?.error?.message)||"Sin detalle adicional";throw new Error(`OPENAI_${code}|${detail}`)}
  const data=await response.json(),raw=data.output_text||data.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==="output_text")?.text;if(!raw)throw new Error("OPENAI_EMPTY");return JSON.parse(raw);
}

async function persistReport(conversation:any,draft:any,status:"pending"|"completed"){
  const equipmentId=Number(draft.equipmentId||conversation.equipmentId||0);if(!equipmentId)throw new Error("EQUIPMENT_REQUIRED");
  const [equipment]=await selectRows<Record<string,any>>("equipment",`select=*&id=eq.${equipmentId}&limit=1`);if(!equipment)throw new Error("EQUIPMENT_REQUIRED");
  if(status==="completed"&&(!draft.serviceType||!draft.serviceDate||!draft.technician||!draft.summary||!draft.serviceDetail))throw new Error("REPORT_INCOMPLETE");
  if(status==="completed"&&draft.calibrationVerified&&(!draft.calibrationRowCount||!Array.isArray(draft.calibrationMeasurements)||draft.calibrationMeasurements.length<Number(draft.calibrationRowCount)))throw new Error("CALIBRATION_REQUIRED");
  const values={equipmentId,serviceType:draft.serviceType||"Pendiente",status,technician:draft.technician||"Pendiente",summary:draft.summary||"Borrador creado desde el asistente técnico",observations:draft.observations,serviceValue:Number(draft.serviceValue||0),serviceDate:new Date(`${reportDate(draft.serviceDate)}T12:00:00-05:00`),startTime:draft.startTime,endTime:draft.endTime,clientPhone:draft.clientPhone,equipmentDescription:equipment.name,equipmentModel:equipment.model,equipmentBrand:equipment.brand,equipmentSerial:equipment.serialNumber,reportedFaultCode:draft.reportedFaultCode,foundFaultCode:draft.foundFaultCode,serviceDetail:draft.serviceDetail,calibrationVerified:Boolean(draft.calibrationVerified),calibrationMeasurements:calibrationJson(draft.calibrationMeasurements),calibrationEvidenceKey:draft.calibrationEvidenceKey,receivedBy:draft.receivedBy};
  if(conversation.reportId){const[report]=await updateRows<Record<string,any>>("service_reports",`id=eq.${Number(conversation.reportId)}&status=neq.completed`,values);if(report)return report}
  const[last]=await selectRows<{id:number}>("service_reports","select=id&order=id.desc&limit=1");return insertRow<Record<string,any>>("service_reports",{...values,code:`SR${String((last?.id??0)+1).padStart(5,"0")}`});
}

export async function POST(request:Request){
  try{
    const user=await requireUser(),multipart=request.headers.get("content-type")?.includes("multipart/form-data"),body:any=multipart?await request.formData():await request.json(),action=safe(multipart?body.get("action"):body.action);
    if(action==="create"){
      const conversation=await insertRow<Record<string,any>>("assistant_conversations",{code:`CHAT-${Date.now().toString(36).toUpperCase()}`,title:"Nuevo reporte de servicio",createdBy:Number(user.id),draft:{}});
      const greeting="Hola. Cuéntame para qué empresa y equipo realizaste el servicio; iré organizando el reporte contigo.";
      await insertRow("assistant_messages",{conversationId:conversation.id,role:"assistant",content:greeting});return Response.json({conversation,greeting},{status:201});
    }
    const id=Number(multipart?body.get("conversationId"):body.conversationId||0),result=await details(id,user);if(!result)return Response.json({error:"Conversación no encontrada."},{status:404});
    if(result.conversation.status==="completed")return Response.json({error:"Este chat ya generó un reporte finalizado."},{status:409});
    if(action==="image"){
      const image=body.get("image");if(!(image instanceof File)||!image.size)return Response.json({error:"Selecciona una imagen."},{status:400});
      const allowed=new Set(["image/jpeg","image/png","image/webp"]);if(!allowed.has(image.type)||image.size>5*1024*1024)return Response.json({error:"La imagen debe ser JPG, PNG o WEBP y pesar máximo 5 MB."},{status:400});
      const bytes=await image.arrayBuffer(),attachmentKey=`assistant/${id}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;await putFile(attachmentKey,bytes,image.type);
      await insertRow("assistant_messages",{conversationId:id,role:"user",content:`Imagen de mediciones adjunta: ${image.name}`,attachmentKey,attachmentName:image.name,attachmentContentType:image.type});
      const reading=await readCalibrationImage(bytes,image.type),pendingCalibration={rowCount:Math.min(4,Math.max(0,Number(reading.rowCount||reading.measurements?.length||0))),measurements:reading.measurements||[],uncertainFields:reading.uncertainFields||[],imageKey:attachmentKey,fileName:image.name};
      const reply=`${reading.assistantReply}\n\n${pendingCalibration.uncertainFields.length?`Campos que debes revisar: ${pendingCalibration.uncertainFields.join(", ")}.`:"No marqué campos dudosos, pero confirma visualmente los valores antes de incorporarlos."}`;
      await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:reply});
      const draft={...(result.conversation.draft||{}),pendingCalibration},[conversation]=await updateRows<Record<string,any>>("assistant_conversations",`id=eq.${id}`,{draft,updatedAt:new Date()});return Response.json({conversation,message:reply});
    }
    if(action==="confirmCalibration"||action==="discardCalibration"){
      const pending=result.conversation.draft?.pendingCalibration;if(!pending)return Response.json({error:"No hay mediciones pendientes de confirmación."},{status:400});
      const draft={...(result.conversation.draft||{})};delete draft.pendingCalibration;
      let reply="Lectura descartada. Puedes adjuntar una nueva imagen más clara.";
      if(action==="confirmCalibration"){draft.calibrationVerified=true;draft.calibrationRowCount=pending.rowCount;draft.calibrationMeasurements=pending.measurements;draft.calibrationEvidenceKey=pending.imageKey;reply=`Confirmado. Incorporé ${pending.rowCount} fila(s) de calibración al borrador. Ahora puedes guardarlo parcialmente o continuar el reporte.`}
      await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:reply});const[conversation]=await updateRows<Record<string,any>>("assistant_conversations",`id=eq.${id}`,{draft,updatedAt:new Date()});return Response.json({conversation,message:reply});
    }
    if(action==="message"){
      const content=safe(body.content);if(!content)return Response.json({error:"Escribe un mensaje."},{status:400});
      await insertRow("assistant_messages",{conversationId:id,role:"user",content});
      const newTitle=requestedTitle(content);
      if(newTitle){
        const reply=`Listo. El chat quedó guardado como “${newTitle}” y mantendrá este nombre.`;
        await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:reply});
        const[conversation]=await updateRows<Record<string,any>>( "assistant_conversations",`id=eq.${id}`,{title:newTitle,draft:{...(result.conversation.draft||{}),titleLocked:true},updatedAt:new Date()});
        return Response.json({conversation,message:reply});
      }
      const allMessages=[...result.messages,{role:"user",content}],companies=await selectRows<Record<string,any>>("companies","select=id,name,city,status&order=name.asc"),equipment=await selectRows<Record<string,any>>("equipment","select=id,company_id,name,brand,model,serial_number&order=name.asc");
      const catalog=companies.map(company=>({companyId:company.id,company:company.name,city:company.city,equipment:equipment.filter(item=>item.companyId===company.id)}));
      const ai=await askOpenAI(result.conversation,allMessages,catalog),newFields=Object.fromEntries(Object.entries(ai.draft||{}).filter(([,value])=>value!==null&&value!=="")),draft={...(result.conversation.draft||{}),...newFields,...(ai.companyId?{companyId:ai.companyId}:{}),...(ai.equipmentId?{equipmentId:ai.equipmentId}:{})};
      let reply=ai.assistantReply,report:any=null,status="open";
      if(wantsDraftSave(content)||wantsFinalize(content)){
        report=await persistReport(result.conversation,draft,wantsFinalize(content)?"completed":"pending");status=wantsFinalize(content)?"completed":"draft";
        reply+=wantsFinalize(content)?`\n\nReporte ${report.code} finalizado correctamente.`:`\n\nBorrador ${report.code} guardado correctamente. Ya aparece en el historial del equipo y puedes abrir su PDF.`;
      }
      await insertRow("assistant_messages",{conversationId:id,role:"assistant",content:reply});
      const[conversation]=await updateRows<Record<string,any>>("assistant_conversations",`id=eq.${id}`,{title:draft.titleLocked?result.conversation.title:(ai.title||result.conversation.title),companyId:draft.companyId||result.conversation.companyId,equipmentId:draft.equipmentId||result.conversation.equipmentId,draft,...(report?{reportId:report.id}:{}),status,updatedAt:new Date()});
      return Response.json({conversation,message:reply,report});
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
    if(message.startsWith("OPENAI_invalid_api_key"))return Response.json({error:"La clave de OpenAI configurada no es válida. Revisa OPENAI_API_KEY en Netlify."},{status:502});
    if(message.startsWith("OPENAI_insufficient_quota"))return Response.json({error:"La cuenta de la API de OpenAI no tiene saldo disponible. Debes activar la facturación o agregar crédito en OpenAI Platform."},{status:502});
    if(message.startsWith("OPENAI_model_not_found"))return Response.json({error:"El modelo configurado no está disponible para esta clave. Revisa OPENAI_MODEL en Netlify o elimínala para usar el modelo compatible predeterminado."},{status:502});
    if(message.startsWith("OPENAI_")){const[code,detail]=message.slice(7).split("|",2);return Response.json({error:`OpenAI rechazó la solicitud (${code}): ${detail||"sin detalle"}`},{status:502});}
    if(message==="EQUIPMENT_REQUIRED")return Response.json({error:"Antes de guardar, identifica claramente la empresa y el equipo en la conversación."},{status:400});
    if(message==="REPORT_INCOMPLETE")return Response.json({error:"Faltan datos obligatorios. Continúa conversando hasta completar equipo, tipo, fecha, técnico, falla y detalle."},{status:400});
    if(message==="CALIBRATION_REQUIRED")return Response.json({error:"La verificación de calibración está marcada como Sí, pero faltan las filas de medición. Continúa el chat y registra cada medición antes de finalizar."},{status:400});
    return Response.json({error:"No fue posible procesar el asistente técnico."},{status:500});
  }
}
