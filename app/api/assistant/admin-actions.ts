import { deleteRows, insertRow, selectRows, updateRows } from "../../../db/supabase";

const nullableString={type:["string","null"]},nullableInteger={type:["integer","null"]},nullableNumber={type:["number","null"]},nullableBoolean={type:["boolean","null"]};
const payloadKeys=["companyName","nit","representative","phone","email","department","municipality","companyId","equipmentName","brand","model","serialNumber","location","ownerName","purchaseDate","requiresMetrology","calibrationFrequency","expenseDate","category","description","supplier","paymentMethod","documentNumber","amount","notes","quotationId","quotationCode","tax","validDays","quotationStatus","quotationItems"];
const itemSchema={type:"object",additionalProperties:false,required:["productName","quantity","unitPrice"],properties:{productName:{type:"string"},quantity:{type:"number"},unitPrice:{type:"number"}}};
const operationSchema={type:"object",additionalProperties:false,required:["intent","assistantReply","readyToConfirm","payload"],properties:{intent:{type:"string",enum:["none","create_company","create_equipment","create_expense","list_pending_quotations","update_quotation","show_report_pdf"]},assistantReply:{type:"string"},readyToConfirm:{type:"boolean"},payload:{type:"object",additionalProperties:false,required:payloadKeys,properties:{companyName:nullableString,nit:nullableString,representative:nullableString,phone:nullableString,email:nullableString,department:nullableString,municipality:nullableString,companyId:nullableInteger,equipmentName:nullableString,brand:nullableString,model:nullableString,serialNumber:nullableString,location:nullableString,ownerName:nullableString,purchaseDate:nullableString,requiresMetrology:nullableBoolean,calibrationFrequency:nullableString,expenseDate:nullableString,category:nullableString,description:nullableString,supplier:nullableString,paymentMethod:nullableString,documentNumber:nullableString,amount:nullableNumber,notes:nullableString,quotationId:nullableInteger,quotationCode:nullableString,tax:nullableNumber,validDays:nullableInteger,quotationStatus:nullableString,quotationItems:{type:["array","null"],items:itemSchema}}}}};
const safe=(value:unknown)=>String(value??"").trim();
export const isAdminRequest=(content:string,current:any)=>Boolean(current)||/(?:crear?|crea|registrar?|registra|agregar?|agrega|nueva?)\b[\s\S]{0,35}\b(?:empresa|hoja de vida|hv|equipo|gasto)\b|\b(?:empresa|hoja de vida|hv|equipo|gasto)\b[\s\S]{0,35}\b(?:crear?|crea|registrar?|registra|agregar?|agrega)|\b(?:muestra|listar?|revisa|buscar?)\b[\s\S]{0,30}\bcotizaciones?\b|\b(?:ajusta|modifica|cambia|actualiza)\b[\s\S]{0,40}\bcotizaci[oó]n\b|\b(?:muestra|abre|genera)\b[\s\S]{0,30}\bpdf\b/i.test(content);

async function openAI(body:any){
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_MISSING");
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body)});
  if(!response.ok){const failure=await response.json().catch(()=>null),code=safe(failure?.error?.code)||safe(failure?.error?.type)||`http_${response.status}`,detail=safe(failure?.error?.message).replace(/sk-[A-Za-z0-9_-]+/g,"[clave oculta]").slice(0,300)||"Sin detalle adicional";throw new Error(`OPENAI_${code}|${detail}`)}
  const data=await response.json(),raw=data.output_text||data.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==="output_text")?.text;if(!raw)throw new Error("OPENAI_EMPTY");return JSON.parse(raw);
}

export async function interpretAdmin(content:string,current:any){
  const [companies,equipment,quotations,items]=await Promise.all([
    selectRows<Record<string,any>>("companies","select=id,code,name,nit,representative,phone,representative_email,department,municipality,city,status&order=name.asc"),
    selectRows<Record<string,any>>("equipment","select=id,code,company_id,name,brand,model,serial_number,status&order=name.asc"),
    selectRows<Record<string,any>>("quotations","select=id,code,status,customer_name,company_name,email,phone,tax,total,valid_days,notes,service_conditions&order=created_at.desc&limit=40"),
    selectRows<Record<string,any>>("quotation_items","select=id,quotation_id,product_name,quantity,unit_price,line_total&order=id.asc")
  ]);
  const context={companies:companies.map(c=>({...c,equipment:equipment.filter(e=>e.companyId===c.id)})),quotations:quotations.map(q=>({...q,items:items.filter(i=>i.quotationId===q.id)}))};
  const instructions=`Eres el asistente administrativo interno de JD Soluciones Biomédicas. Interpreta solicitudes para crear empresas, crear hojas de vida/equipos, registrar gastos, listar cotizaciones pendientes, ajustar una cotización existente o abrir el PDF del reporte vinculado. Nunca inventes datos. Solicita solamente los campos faltantes. Para empresa exige nombre, NIT, representante, teléfono, correo, departamento y municipio. Para equipo exige empresa existente, nombre, propietario y ubicación; marca, modelo y serie pueden quedar vacíos. Para gasto exige fecha AAAA-MM-DD, categoría, descripción y valor. Para actualizar cotización exige cotización existente y devuelve quotationItems como la lista COMPLETA final, conservando líneas no modificadas. Las consultas no requieren confirmación. Las creaciones y modificaciones solo quedan readyToConfirm cuando están completas. Catálogo real: ${JSON.stringify(context)}. Acción en construcción: ${JSON.stringify(current||null)}. Devuelve exclusivamente el esquema.`;
  return openAI({model:process.env.OPENAI_MODEL||"gpt-4o-mini",instructions,input:content,text:{format:{type:"json_schema",name:"administrative_operation",strict:true,schema:operationSchema}},max_output_tokens:1800});
}

export function cleanPayload(payload:any){return Object.fromEntries(Object.entries(payload||{}).filter(([,value])=>value!==null&&value!==""))}
export function actionSummary(intent:string,p:any){
  if(intent==="create_company")return `Crear empresa ${p.companyName}\nNIT: ${p.nit}\nRepresentante: ${p.representative}\nContacto: ${p.phone} · ${p.email}\nUbicación: ${p.municipality}, ${p.department}`;
  if(intent==="create_equipment")return `Crear hoja de vida\nEquipo: ${p.equipmentName}\nEmpresa ID: ${p.companyId}\nMarca / modelo: ${p.brand||"No registra"} / ${p.model||"No registra"}\nSerie: ${p.serialNumber||"No registra"}\nUbicación: ${p.location}`;
  if(intent==="create_expense")return `Registrar gasto\nFecha: ${p.expenseDate}\nCategoría: ${p.category}\nConcepto: ${p.description}\nValor: $${Number(p.amount||0).toLocaleString("es-CO")}`;
  if(intent==="update_quotation")return `Actualizar ${p.quotationCode||`cotización #${p.quotationId}`}\n${(p.quotationItems||[]).map((i:any)=>`${i.quantity} × ${i.productName}: $${Number(i.unitPrice).toLocaleString("es-CO")}`).join("\n")}\nImpuestos: $${Number(p.tax||0).toLocaleString("es-CO")}`;
  return "Acción administrativa";
}

export async function readAdminAction(intent:string,p:any,conversation:any,user:any){
  if(intent==="list_pending_quotations"){
    if(user.role==="technician")throw new Error("FORBIDDEN_ADMIN_ACTION");
    const rows=await selectRows<Record<string,any>>("quotations","select=id,code,status,customer_name,company_name,total,created_at&status=in.(pending,draft)&order=created_at.desc&limit=20");
    return{message:rows.length?`Cotizaciones pendientes:\n${rows.map(q=>`• ${q.code} · ${q.companyName||q.customerName} · $${Number(q.total||0).toLocaleString("es-CO")} · ${q.status}`).join("\n")}`:"No hay cotizaciones pendientes.",link:"/portal?tab=Cotizaciones"};
  }
  if(intent==="show_report_pdf"){
    const reportId=Number(conversation.reportId||0);if(!reportId)return{message:"Este chat todavía no tiene un reporte guardado. Guárdalo parcialmente primero para generar su PDF."};
    return{message:`Aquí tienes el PDF del reporte vinculado #${reportId}.`,link:`/api/reports/${reportId}/pdf`};
  }
  return null;
}

export async function executeAdminAction(intent:string,p:any,user:any){
  if(user.role==="technician")throw new Error("FORBIDDEN_ADMIN_ACTION");
  if(intent==="create_company"){
    const duplicates=await selectRows<Record<string,any>>("companies",`select=id,code,name&or=(nit.eq.${encodeURIComponent(p.nit)},name.ilike.${encodeURIComponent(p.companyName)})&limit=1`);if(duplicates.length)throw new Error("DUPLICATE_COMPANY");
    const[last]=await selectRows<{id:number}>("companies","select=id&order=id.desc&limit=1"),company=await insertRow<Record<string,any>>("companies",{code:`EMP-${String((last?.id||0)+1).padStart(4,"0")}`,name:p.companyName,nit:p.nit,representative:p.representative,phone:p.phone,representativeEmail:p.email,department:p.department,municipality:p.municipality,city:p.municipality,status:"pending",createdAt:new Date()});return{message:`Empresa ${company.code} creada correctamente.`,link:"/portal?tab=Empresas",record:company};
  }
  if(intent==="create_equipment"){
    const[company]=await selectRows<Record<string,any>>("companies",`select=id,name&id=eq.${Number(p.companyId)}&limit=1`);if(!company)throw new Error("COMPANY_REQUIRED");
    const[last]=await selectRows<{id:number}>("equipment","select=id&order=id.desc&limit=1"),equipment=await insertRow<Record<string,any>>("equipment",{companyId:company.id,code:`HV-${String((last?.id||0)+1).padStart(5,"0")}`,name:p.equipmentName,brand:p.brand||null,model:p.model||null,serialNumber:p.serialNumber||null,location:p.location,ownerName:p.ownerName||company.name,purchaseDate:p.purchaseDate?new Date(`${p.purchaseDate}T12:00:00-05:00`):null,requiresMetrology:Boolean(p.requiresMetrology),calibrationFrequency:p.calibrationFrequency||null,technicalDocuments:"[]",status:"operational",registeredAt:new Date()});return{message:`Hoja de vida ${equipment.code} creada para ${company.name}.`,link:`/api/equipment/${equipment.id}/pdf`,record:equipment};
  }
  if(intent==="create_expense"){
    const[last]=await selectRows<{id:number}>("expenses","select=id&order=id.desc&limit=1"),expense=await insertRow<Record<string,any>>("expenses",{code:`GAS-${new Date().getFullYear()}-${String((last?.id||0)+1).padStart(4,"0")}`,expenseDate:p.expenseDate,category:p.category,description:p.description,supplier:p.supplier||null,paymentMethod:p.paymentMethod||null,documentNumber:p.documentNumber||null,amount:Number(p.amount),notes:p.notes||null,createdBy:user.id});return{message:`Gasto ${expense.code} registrado por $${Number(expense.amount).toLocaleString("es-CO")}.`,link:"/portal?tab=Gastos",record:expense};
  }
  if(intent==="update_quotation"){
    const id=Number(p.quotationId),[existing]=await selectRows<Record<string,any>>("quotations",`select=*&id=eq.${id}&limit=1`);if(!existing)throw new Error("QUOTATION_REQUIRED");const quoteItems=Array.isArray(p.quotationItems)?p.quotationItems:[];if(!quoteItems.length)throw new Error("QUOTATION_ITEMS_REQUIRED");
    const subtotal=quoteItems.reduce((sum:number,item:any)=>sum+Math.max(1,Number(item.quantity))*Math.max(0,Number(item.unitPrice)),0),tax=Math.max(0,Number(p.tax??existing.tax??0));const[quotation]=await updateRows<Record<string,any>>("quotations",`id=eq.${id}`,{status:p.quotationStatus||"draft",tax,subtotal,total:subtotal+tax,validDays:Number(p.validDays||existing.validDays||10),notes:p.notes??existing.notes,updatedAt:new Date()});await deleteRows("quotation_items",`quotation_id=eq.${id}`);for(const item of quoteItems){const quantity=Math.max(1,Number(item.quantity)),unitPrice=Math.max(0,Number(item.unitPrice));await insertRow("quotation_items",{quotationId:id,productName:item.productName,quantity,unitPrice,lineTotal:quantity*unitPrice})}return{message:`Cotización ${quotation.code} actualizada. Total: $${Number(quotation.total).toLocaleString("es-CO")}.`,link:`/api/quotations/${id}/pdf`,record:quotation};
  }
  throw new Error("UNSUPPORTED_ADMIN_ACTION");
}
