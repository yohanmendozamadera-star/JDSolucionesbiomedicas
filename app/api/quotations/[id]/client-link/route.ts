import {getSessionUser} from "../../../../app-auth";
import {selectRows} from "../../../../../db/supabase";
import {quotationResponseToken} from "../../../../../db/quotation-response";

export async function GET(request:Request,context:{params:Promise<{id:string}>}){if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});const{id}=await context.params,[quotation]=await selectRows<Record<string,any>>("quotations",`select=id,email&id=eq.${Number(id)}&limit=1`);if(!quotation?.email)return Response.json({error:"La cotización no tiene correo."},{status:400});const token=quotationResponseToken(quotation.id,quotation.email);return Response.json({url:`${new URL(request.url).origin}/cotizacion/${quotation.id}?token=${token}`})}
