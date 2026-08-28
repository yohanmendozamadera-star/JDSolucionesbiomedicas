import { getSessionUser } from "../../../app-auth";
export async function GET(){const user=await getSessionUser();return Response.json(user?{authenticated:true,user:{name:user.name,email:user.email,role:user.role}}:{authenticated:false})}
