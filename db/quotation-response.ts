import {createHmac,timingSafeEqual} from "node:crypto";

function secret(){const value=process.env.QUOTATION_RESPONSE_SECRET||process.env.SUPABASE_SECRET_KEY;if(!value)throw new Error("QUOTATION_RESPONSE_SECRET_MISSING");return value}
export function quotationResponseToken(id:number,email:string){return createHmac("sha256",secret()).update(`${id}|${String(email||"").trim().toLowerCase()}`).digest("hex")}
export function validQuotationResponseToken(id:number,email:string,token:string){const expected=quotationResponseToken(id,email),received=String(token||"");if(expected.length!==received.length)return false;return timingSafeEqual(Buffer.from(expected),Buffer.from(received))}
