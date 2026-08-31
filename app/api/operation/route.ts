import { selectRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";

export async function GET() {
  if (!await getSessionUser()) return Response.json({error:"No autorizado"},{status:401});
  const reports=await selectRows<Record<string,any>>("service_reports","select=*&order=service_date.desc,created_at.desc");
  const equipment=await selectRows<Record<string,any>>("equipment","select=id,name,code,company_id");
  const companies=await selectRows<Record<string,any>>("companies","select=id,name,city");
  const eq=new Map(equipment.map(e=>[e.id,e])),co=new Map(companies.map(c=>[c.id,c]));
  return Response.json({reports:reports.map(r=>({...r,equipment:eq.get(r.equipmentId),company:co.get(eq.get(r.equipmentId)?.companyId)}))});
}
