import { insertRow, selectRows, updateRows } from "../../../db/supabase";
import { getSessionUser } from "../../app-auth";

export async function POST(request: Request) {
  if (!await getSessionUser()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const reportStatus = body.reportStatus === "completed" ? "completed" : "pending";
  if (!body.equipmentId) return Response.json({ error: "No se encontró el equipo del reporte." }, { status: 400 });
  if (reportStatus === "completed" && (!body.serviceType || !body.serviceDate || !body.technician || !body.summary || !body.serviceDetail)) return Response.json({ error: "Completa los campos obligatorios antes de finalizar el reporte." }, { status: 400 });
  const values = { equipmentId: Number(body.equipmentId), serviceType: body.serviceType || "Pendiente", status: reportStatus, technician: body.technician || "Pendiente", summary: body.summary || "Borrador pendiente de completar", observations: body.observations, serviceValue: Number(body.serviceValue || 0), serviceDate: body.serviceDate ? new Date(`${body.serviceDate}T12:00:00`) : new Date(), startTime: body.startTime, endTime: body.endTime, clientPhone: body.clientPhone, equipmentDescription: body.equipmentDescription, equipmentModel: body.equipmentModel, equipmentBrand: body.equipmentBrand, equipmentSerial: body.equipmentSerial, reportedFaultCode: body.reportedFaultCode, foundFaultCode: body.foundFaultCode, serviceDetail: body.serviceDetail, calibrationVerified: body.calibrationVerified === "yes", calibrationMeasurements: body.calibrationMeasurements, receivedBy: body.receivedBy };
  if (body.reportId) {
    const [existing] = await selectRows<{id:number;equipmentId:number;status:string}>("service_reports", `select=id,equipment_id,status&id=eq.${Number(body.reportId)}&limit=1`);
    if (!existing || existing.equipmentId !== Number(body.equipmentId)) return Response.json({ error: "No se encontró el reporte pendiente." }, { status: 404 });
    if (existing.status === "completed") return Response.json({ error: "Este reporte ya fue finalizado y no puede modificarse." }, { status: 409 });
    const [updated] = await updateRows<Record<string, any>>("service_reports", `id=eq.${existing.id}`, values);
    return Response.json({ report: updated });
  }
  const [last] = await selectRows<{id:number}>("service_reports", "select=id&order=id.desc&limit=1");
  const code = `SR${String((last?.id ?? 0) + 1).padStart(5, "0")}`;
  const created = await insertRow<Record<string, any>>("service_reports", { ...values, code });
  return Response.json({ report: created }, { status: 201 });
}
