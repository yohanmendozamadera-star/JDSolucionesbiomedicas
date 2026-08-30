import { getSessionUser } from "../../../app-auth";
import { selectRows } from "../../../../db/supabase";
import { getFile } from "../../../../db/file-storage";

export async function GET(request:Request){
  const user=await getSessionUser();if(!user)return Response.json({error:"No autorizado"},{status:401});
  const messageId=Number(new URL(request.url).searchParams.get("messageId")||0);if(!messageId)return Response.json({error:"Imagen no encontrada"},{status:404});
  const[message]=await selectRows<Record<string,any>>("assistant_messages",`select=id,conversation_id,attachment_key,attachment_content_type&id=eq.${messageId}&limit=1`);if(!message?.attachmentKey)return Response.json({error:"Imagen no encontrada"},{status:404});
  const[conversation]=await selectRows<Record<string,any>>("assistant_conversations",`select=id&id=eq.${Number(message.conversationId)}&created_by=eq.${Number(user.id)}&limit=1`);if(!conversation)return Response.json({error:"No autorizado"},{status:403});
  const file=await getFile(message.attachmentKey);if(!file)return Response.json({error:"Imagen no encontrada"},{status:404});
  return new Response(file.body,{headers:{"content-type":file.type||message.attachmentContentType||"image/jpeg","cache-control":"private, max-age=300"}});
}
