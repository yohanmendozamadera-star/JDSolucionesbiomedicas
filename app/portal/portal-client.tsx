"use client";

import { useEffect, useState } from "react";
import CompaniesView from "./companies-view";
import { OrdersView, ProductsView, QuotationsView, SettingsView } from "./commercial-views";
import ExpensesView from "./expenses-view";
import AssistantView from "./assistant-view";
import OperationView from "./operation-view";
import InvoicesView from "./invoices-view";
import AgendaView from "./agenda-view";

type Role = "superowner" | "owner" | "admin" | "technician";
type Profile = { id: number; name: string; email: string; role: "owner" | "admin" | "technician"; company: string; status: string };

const menuBase = [["Dashboard","⌂"],["Operación","⚙"],["Agenda","◷"],["Asistente técnico","✦"],["Productos y servicios","◆"],["Cotizaciones","◫"],["Pedidos","▣"],["Facturación","▧"],["Gastos","$"]];

export default function PortalClient({ email, name, role, company }: { email: string; name: string; role: Role; company: string }) {
  const [tab, setTab] = useState("Dashboard");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const fullMenu = [...menuBase.slice(0,3), ["Empresas","▦"], ...menuBase.slice(3), ["Configuraciones","◈"], ["Usuarios y permisos","♙"]];
  const menu = role === "superowner" || role === "owner" ? fullMenu : menuBase;
  const roleLabel = role === "superowner" ? "Superpropietario" : role === "owner" ? "Propietario" : role === "admin" ? "Administrador" : role === "technician" ? "Técnico" : "Acceso pendiente";

  const loadProfiles = async () => {
    if (role !== "superowner" && role !== "owner") return;
    const response = await fetch("/api/profiles");
    if (response.ok) setProfiles((await response.json()).profiles);
  };
  useEffect(() => { loadProfiles(); setCollapsed(localStorage.getItem("jd-sidebar-collapsed") === "true");const requested=new URLSearchParams(window.location.search).get("tab");if(requested&&menu.some(item=>item[0]===requested))setTab(requested); }, []);
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
    <main className="owner-main"><header><div><small>PORTAL DE {company.toUpperCase()}</small><h1>{tab}</h1></div><div className="role-badge">◆ {roleLabel}</div></header><section className="owner-content">{tab === "Dashboard" && <Dashboard name={name} role={roleLabel} />}{tab === "Operación" && <OperationView/>}{tab === "Agenda" && <AgendaView/>}{tab === "Facturación" && <InvoicesView/>}{tab === "Asistente técnico" && <AssistantView />}{tab === "Productos y servicios" && <ProductsView />}{tab === "Cotizaciones" && <QuotationsView />}{tab === "Pedidos" && <OrdersView />}{tab === "Gastos" && <ExpensesView />}{tab === "Empresas" && <CompaniesView />}{tab === "Configuraciones" && <SettingsView />}{tab === "Usuarios y permisos" && <Permissions role={role} profiles={profiles} createProfile={createProfile} />}</section></main>{notice && <div className="portal-toast">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}</div>;
}

function Dashboard({ name, role }: { name: string; role: string }) {
  const [reportMetrics,setReportMetrics]=useState({pendingReports:0,completedReports:0,openOrders:0,openQuotations:0});
  const[upcoming,setUpcoming]=useState<Array<{id:string;date:string;time:string;title:string;company:string}>>([]);
  useEffect(()=>{Promise.all([fetch("/api/dashboard").then(r=>r.json()),fetch("/api/companies").then(r=>r.json()),fetch("/api/local-equipment-config").then(r=>r.json())]).then(([metrics,companyData,config])=>{setReportMetrics(metrics);const companies=companyData.companies||[],nameById=new Map(companies.map((c:any)=>[c.id,c.name])),manual=(config.agenda||[]).filter((e:any)=>!["completed","cancelled"].includes(e.status)).map((e:any)=>({id:e.id,date:e.date,time:e.startTime||"Sin hora",title:e.title,company:String(nameById.get(e.companyId)||"Empresa")})),planned=companies.flatMap((c:any)=>c.equipment.filter((e:any)=>e.planning?.nextMaintenanceDate).map((e:any)=>({id:`m-${e.id}`,date:e.planning.nextMaintenanceDate,time:"Por confirmar",title:`Mantenimiento · ${e.name}`,company:c.name})));setUpcoming([...manual,...planned].filter((e:any)=>e.date>=new Date().toISOString().slice(0,10)).sort((a:any,b:any)=>a.date.localeCompare(b.date)).slice(0,4))}).catch(()=>{})},[]);
  return <><div className="owner-welcome"><div><span>CONTROL GENERAL</span><h2>Hola, {name.split(" ")[0]}</h2><p>Tienes acceso como {role.toLowerCase()} a la operación de JD Soluciones Biomédicas.</p></div><i>JD</i></div><div className="owner-kpis">{[["Reportes pendientes",String(reportMetrics.pendingReports),"Guardados parcialmente"],["Reportes finalizados",String(reportMetrics.completedReports),"Servicios terminados"],["Pedidos abiertos",String(reportMetrics.openOrders),"Recibidos desde productos"],["Cotizaciones abiertas",String(reportMetrics.openQuotations),"Solicitudes por gestionar"]].map(k => <article key={k[0]}><small>{k[0]}</small><b>{k[1]}</b><span>{k[2]}</span></article>)}</div><div className="portal-panels"><section><h3>Actividad reciente</h3>{["Reportes pendientes conectados a la base de datos","Pedidos conectados al catálogo público","Cotizaciones recibidas desde la página principal"].map(x => <p key={x}>✓ <span>{x}</span><small>Estado actual</small></p>)}</section><section><h3>Próximas actividades</h3>{upcoming.length?upcoming.map(item=><p key={item.id}>◷ <span>{item.date} · {item.time} · {item.title}</span><small>{item.company}</small></p>):<p><span>No hay actividades próximas.</span><small>Regístralas desde Agenda</small></p>}</section></div></>;
}

function Permissions({ role,profiles, createProfile }: { role:Role;profiles: Profile[]; createProfile: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="permissions-layout"><section className="permission-form"><span>USUARIOS AUTORIZADOS</span><h2>Crear perfil autorizado</h2><p>El propietario puede crear administradores y técnicos. Solo el superpropietario puede asignar nuevos propietarios.</p><form onSubmit={createProfile}><label>Nombre completo<input name="name" required /></label><label>Correo autorizado<input name="email" type="email" required /></label><label>Empresa<input name="company" required /></label><label>Tipo de acceso<select name="role">{role==="superowner"&&<option value="owner">Propietario</option>}<option value="admin">Administrador</option><option value="technician">Técnico</option></select></label><button type="submit">Crear perfil y generar enlace</button></form></section><section className="permission-list"><h3>Usuarios autorizados</h3><div className="superowner-row"><i>◆</i><span><b>Yohan Mendoza</b><small>yohan_mendoza@outlook.com</small></span><em>Superpropietario</em></div>{profiles.map(p => <div className="profile-row" key={p.id}><i>{p.name.slice(0,2).toUpperCase()}</i><span><b>{p.name}</b><small>{p.email} · {p.company}</small></span><em>{p.role === "owner" ? "Propietario" : p.role === "technician" ? "Técnico" : "Administrador"}</em></div>)}</section></div>;
}
