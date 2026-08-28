import { deleteRows, insertRow, selectRows, updateRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";

export async function GET() {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const [quotations,items]=await Promise.all([selectRows<Record<string, any>>("quotations", "select=*&order=created_at.desc"),selectRows<Record<string,any>>("quotation_items","select=*&order=id.asc")]);
  return Response.json({ quotations: quotations.map(q=>({...q,items:items.filter(item=>item.quotationId===q.id)})) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(), body = await request.json();
  if (!body.customerName) return Response.json({ error: "Indica el nombre del cliente." }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 1) * Number(item.unitPrice || 0), 0);
  const [last] = await selectRows<{ id: number }>("quotations", "select=id&order=id.desc&limit=1");
  const quotation = await insertRow<Record<string, any>>("quotations", { code: `COT-${new Date().getFullYear()}-${String((last?.id ?? 0) + 1).padStart(4, "0")}`, source: user ? "owner" : "client", status: user ? "draft" : "pending", customerName: body.customerName, companyName: body.companyName, customerNit: body.customerNit, customerAddress: body.customerAddress, contactName: body.contactName||body.customerName, phone: body.phone, email: body.email, validDays:Number(body.validDays||10), serviceConditions:body.serviceConditions, notes: body.notes, subtotal, tax:Number(body.tax||0), total: subtotal+Number(body.tax||0), createdBy: user?.id ?? null });
  for (const item of items) await insertRow("quotation_items", { quotationId: quotation.id, productId: item.productId || null, productName: item.productName, quantity: Number(item.quantity || 1), unitPrice: item.unitPrice == null ? null : Number(item.unitPrice), lineTotal: Number(item.quantity || 1) * Number(item.unitPrice || 0) });
  return Response.json({ quotation }, { status: 201 });
}

export async function PATCH(request:Request){
  if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});
  try{const body=await request.json(),id=Number(body.id),items=Array.isArray(body.items)?body.items.filter((item:any)=>String(item.productName||"").trim()):[];if(!id||!items.length)return Response.json({error:"Agrega al menos un producto o servicio."},{status:400});const subtotal=items.reduce((sum:number,item:any)=>sum+Math.max(1,Number(item.quantity||1))*Math.max(0,Number(item.unitPrice||0)),0),tax=Math.max(0,Number(body.tax||0));const [quotation]=await updateRows<Record<string,any>>("quotations",`id=eq.${id}`,{status:body.status==="sent"?"sent":"draft",customerName:body.customerName,companyName:body.companyName,customerNit:body.customerNit,customerAddress:body.customerAddress,contactName:body.contactName,phone:body.phone,email:body.email,validDays:Math.max(1,Number(body.validDays||10)),serviceConditions:body.serviceConditions||null,notes:body.notes||null,subtotal,tax,total:subtotal+tax,updatedAt:new Date()});if(!quotation)return Response.json({error:"Cotización no encontrada."},{status:404});await deleteRows("quotation_items",`quotation_id=eq.${id}`);for(const item of items){const quantity=Math.max(1,Number(item.quantity||1)),unitPrice=Math.max(0,Number(item.unitPrice||0));await insertRow("quotation_items",{quotationId:id,productId:item.productId||null,productName:String(item.productName).trim(),quantity,unitPrice,lineTotal:quantity*unitPrice})}return Response.json({quotation:{...quotation,items}})}catch(error){console.error("Quotation update failed",error);return Response.json({error:"No pudimos actualizar la cotización."},{status:500})}}
