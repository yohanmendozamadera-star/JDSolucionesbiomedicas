import { selectRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";
export async function GET(){
 if(!await getSessionUser())return Response.json({error:"No autorizado"},{status:401});
 const [reports,orders,quotations]=await Promise.all([selectRows<{status:string}>("service_reports","select=status"),selectRows<{status:string}>("orders","select=status"),selectRows<{status:string}>("quotations","select=status")]);
 return Response.json({pendingReports:reports.filter(r=>r.status!=="completed").length,completedReports:reports.filter(r=>r.status==="completed").length,openOrders:orders.filter(o=>!["delivered","cancelled"].includes(o.status)).length,openQuotations:quotations.filter(q=>!["accepted","rejected","expired"].includes(q.status)).length});
}
