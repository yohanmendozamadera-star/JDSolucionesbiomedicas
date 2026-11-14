import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {insertRow,selectRows,updateRows} from "./supabase";

export type RiskDefinition={id:string;name:string;level:string;category:string};
export type EquipmentPlanning={riskId?:string;invimaRegistration?:string;nextMaintenanceDate?:string};
export type AgendaEvent={id:string;companyId:number;equipmentId?:number;title:string;service:string;date:string;startTime?:string;endTime?:string;technician?:string;city?:string;address?:string;status:"planned"|"confirmed"|"in_progress"|"completed"|"cancelled";notes?:string};
export type LocalEquipmentConfig={risks:RiskDefinition[];equipment:Record<string,EquipmentPlanning>;agenda:AgendaEvent[]};
const file=path.join(process.cwd(),"data","local-equipment-config.json");

export async function readLocalEquipmentConfig():Promise<LocalEquipmentConfig>{
  try{const[row]=await selectRows<{payload:Partial<LocalEquipmentConfig>}>("app_config","select=payload&id=eq.1&limit=1");if(row?.payload)return{risks:row.payload.risks||[],equipment:row.payload.equipment||{},agenda:row.payload.agenda||[]}}catch{}
  try{const value=JSON.parse(await readFile(file,"utf8")) as Partial<LocalEquipmentConfig>;return{risks:value.risks||[],equipment:value.equipment||{},agenda:value.agenda||[]}}catch{return{risks:[],equipment:{},agenda:[]}}
}
export async function writeLocalEquipmentConfig(value:LocalEquipmentConfig){try{const rows=await updateRows("app_config","id=eq.1",{payload:value,updatedAt:new Date()});if(!rows.length)await insertRow("app_config",{id:1,payload:value,updatedAt:new Date()});return}catch{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2),"utf8")}}
export function slug(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
