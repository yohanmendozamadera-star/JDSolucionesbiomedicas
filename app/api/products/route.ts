import { insertRow, selectRows, updateRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";
import { putFile } from "../../../db/file-storage";

const allowed=new Set(["image/jpeg","image/png","image/webp"]);
const mapped=(p:any)=>({...p,imageUrl:p.imageKey?`/api/products/${p.id}/image`:p.imageUrl});

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  if (admin && !await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const products = await selectRows<Record<string, any>>("products", `select=*&${admin ? "" : "active=eq.true&"}order=category.asc,name.asc`);
  return Response.json({ products:products.map(mapped) });
}

export async function POST(request: Request) {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const multipart=request.headers.get("content-type")?.includes("multipart/form-data");
  const data=multipart?await request.formData():await request.json();
  const body:any=multipart?Object.fromEntries(data as FormData):data;
  const active=multipart?body.active==="true":body.active!==false;
  const values:any = { name:String(body.name||"").trim(), category:String(body.category||"").trim() || "General", description:String(body.description||"").trim(), price: body.price === "" || body.price == null ? null : Number(body.price), active, updatedAt: new Date() };
  if (!values.name) return Response.json({ error: "Indica el nombre del producto." }, { status: 400 });
  const photo=multipart?(data as FormData).get("photo"):null;if(photo instanceof File&&photo.size){if(!allowed.has(photo.type)||photo.size>5*1024*1024)return Response.json({error:"La foto debe ser JPG, PNG o WEBP y pesar máximo 5 MB."},{status:400});const key=`products/${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;await putFile(key,await photo.arrayBuffer(),photo.type);values.imageKey=key;values.imageName=photo.name;values.imageContentType=photo.type;}
  if (body.id) { const [product] = await updateRows<Record<string, any>>("products", `id=eq.${Number(body.id)}`, values); return Response.json({ product:mapped(product) }); }
  const [last] = await selectRows<{ id: number }>("products", "select=id&order=id.desc&limit=1");
  const product = await insertRow<Record<string, any>>("products", { ...values, code: `PRD-${String((last?.id ?? 0) + 1).padStart(3, "0")}` });
  return Response.json({ product:mapped(product) }, { status: 201 });
}
