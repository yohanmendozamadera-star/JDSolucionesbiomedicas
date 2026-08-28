"use client";

import { useEffect, useState } from "react";
import CompaniesView from "./companies-view";
import { OrdersView, ProductsView, QuotationsView, SettingsView } from "./commercial-views";
import ExpensesView from "./expenses-view";

type Role = "superowner" | "owner" | "admin";
type Profile = { id: number; name: string; email: string; role: "owner" | "admin"; company: string; status: string };

const menuBase = [["Dashboard","⌂"],["Operación","⚙"],["Productos","◆"],["Cotizaciones","◫"],["Pedidos","▣"],["Facturación","▧"],["Gastos","$"]];
const records: Record<string, string[][]> = {
  "Operación": [["SRV-1082","Mantenimiento preventivo","En proceso"],["SRV-1081","Calibración de lensómetro","Programado"],["SRV-1080","Reparación electrónica","Finalizado"]],
  "Cotizaciones": [["COT-0918","Autorefractómetro AR-310","Por revisar"],["COT-0917","Calibración anual","Enviada"],["COT-0916","Lámpara de hendidura","Aceptada"]],
  "Pedidos": [["PED-0421","Lensómetro digital LM-7","Nuevo"],["PED-0420","Kit de repuestos","Preparando"],["PED-0419","Lámpara LED SL-2","Enviado"]],
  "Facturación": [["FV-2081","Servicio preventivo","Pagada"],["FV-2080","Calibración certificada","Pendiente"],["FV-2079","Repuesto electrónico","Vencida"]],
};

export default function PortalClient({ email, name, role, company }: { email: string; name: string; role: Role; company: string }) {
  const [tab, setTab] = useState("Dashboard");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const menu = role === "superowner" ? [...menuBase.slice(0,2), ["Empresas","▦"], ...menuBase.slice(2), ["Configuraciones","◈"], ["Usuarios y permisos","♙"]] : menuBase;
  const roleLabel = role === "superowner" ? "Superpropietario" : role === "owner" ? "Propietario" : role === "admin" ? "Administrador" : "Acceso pendiente";

  const loadProfiles = async () => {
    if (role !== "superowner") return;
    const response = await fetch("/api/profiles");
    if (response.ok) setProfiles((await response.json()).profiles);
  };
  useEffect(() => { loadProfiles(); setCollapsed(localStorage.getItem("jd-sidebar-collapsed") === "true"); }, []);
  const toggleSidebar = () => setCollapsed(value => { const next = !value; localStorage.setItem("jd-sidebar-collapsed", String(next)); return next; });

  const createProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/profiles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    setNotice(response.ok ? `Perfil creado. Enlace de activación: ${data.activationUrl}` : data.error ?? "No se pudo crear el perfil.");
    if (response.ok) { event.currentTarget.reset(); loadProfiles(); }
  };

  return <div className={`owner-portal ${collapsed ? "sidebar-collapsed" : ""}`}><aside className="owner-sidebar"><button className="sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? "Expandir menú" : "Contraer menú"} title={collapsed ? "Expandir menú" : "Contraer menú"}>{collapsed ? "›" : "‹"}</button><a href="/" className="owner-logo"><img src="/brand/jd-soluciones-logo.png" alt="JD Soluciones Biomédicas" /></a><div className="account-chip"><span>{name.slice(0,2).toUpperCase()}</span><div><b>{name}</b><small>{roleLabel}</small></div></div><nav>{menu.map(item => <button key={item[0]} title={collapsed ? item[0] : undefined} className={tab === item[0] ? "active" : ""} onClick={() => setTab(item[0])}><i>{item[1]}</i><span>{item[0]}</span></button>)}</nav><div className="owner-id"><small>CUENTA ACTIVA</small><b>{email}</b></div><a className="portal-exit" href="/api/auth/logout">Cerrar sesión</a></aside>
    <main className="owner-main"><header><div><small>PORTAL DE {company.toUpperCase()}</small><h1>{tab}</h1></div><div className="role-badge">◆ {roleLabel}</div></header><section className="owner-content">{tab === "Dashboard" && <Dashboard name={name} role={roleLabel} />}{records[tab] && !["Cotizaciones","Pedidos"].includes(tab) && <Records title={tab} rows={records[tab]} />}{tab === "Productos" && <ProductsView />}{tab === "Cotizaciones" && <QuotationsView />}{tab === "Pedidos" && <OrdersView />}{tab === "Gastos" && <ExpensesView />}{tab === "Empresas" && <CompaniesView />}{tab === "Configuraciones" && <SettingsView />}{tab === "Usuarios y permisos" && <Permissions profiles={profiles} createProfile={createProfile} />}</section></main>{notice && <div className="portal-toast">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}</div>;
}

function Dashboard({ name, role }: { name: string; role: string }) {
  const [reportMetrics,setReportMetrics]=useState({pendingReports:0,completedReports:0,openOrders:0,openQuotations:0});
  useEffect(()=>{fetch("/api/dashboard").then(r=>r.json()).then(data=>setReportMetrics(data)).catch(()=>{})},[]);
  return <><div className="owner-welcome"><div><span>CONTROL GENERAL</span><h2>Hola, {name.split(" ")[0]}</h2><p>Tienes acceso como {role.toLowerCase()} a la operación de JD Soluciones Biomédicas.</p></div><i>JD</i></div><div className="owner-kpis">{[["Reportes pendientes",String(reportMetrics.pendingReports),"Guardados parcialmente"],["Reportes finalizados",String(reportMetrics.completedReports),"Servicios terminados"],["Pedidos abiertos",String(reportMetrics.openOrders),"Recibidos desde productos"],["Cotizaciones abiertas",String(reportMetrics.openQuotations),"Solicitudes por gestionar"]].map(k => <article key={k[0]}><small>{k[0]}</small><b>{k[1]}</b><span>{k[2]}</span></article>)}</div><div className="portal-panels"><section><h3>Actividad reciente</h3>{["Reportes pendientes conectados a la base de datos","Pedidos conectados al catálogo público","Cotizaciones recibidas desde la página principal"].map(x => <p key={x}>✓ <span>{x}</span><small>Estado actual</small></p>)}</section><section><h3>Agenda de operación</h3>{["08:30 · Mantenimiento preventivo","11:00 · Calibración","14:30 · Diagnóstico técnico"].map(x => <p key={x}>◷ <span>{x}</span></p>)}</section></div></>;
}

function Records({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="portal-table"><div className="portal-title"><div><h2>{title}</h2><p>Consulta y administra la información de tu empresa.</p></div><button>＋ Nuevo registro</button></div><div className="portal-table-head"><span>Referencia</span><span>Detalle</span><span>Estado</span><span>Acción</span></div>{rows.map(r => <div className="portal-table-row" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><em>{r[2]}</em><button>Ver detalle →</button></div>)}</div>;
}

function Permissions({ profiles, createProfile }: { profiles: Profile[]; createProfile: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="permissions-layout"><section className="permission-form"><span>ACCESO EXCLUSIVO</span><h2>Crear perfil autorizado</h2><p>Solo el superpropietario puede asignar nuevos propietarios o administradores. El sistema generará un enlace para que cada usuario cree su contraseña.</p><form onSubmit={createProfile}><label>Nombre completo<input name="name" required /></label><label>Correo autorizado<input name="email" type="email" required /></label><label>Empresa<input name="company" required /></label><label>Tipo de acceso<select name="role"><option value="owner">Propietario</option><option value="admin">Administrador</option></select></label><button type="submit">Crear perfil y generar enlace</button></form></section><section className="permission-list"><h3>Usuarios autorizados</h3><div className="superowner-row"><i>◆</i><span><b>Yohan Mendoza</b><small>yohan_mendoza@outlook.com</small></span><em>Superpropietario</em></div>{profiles.map(p => <div className="profile-row" key={p.id}><i>{p.name.slice(0,2).toUpperCase()}</i><span><b>{p.name}</b><small>{p.email} · {p.company}</small></span><em>{p.role === "owner" ? "Propietario" : "Administrador"}</em></div>)}</section></div>;
}
