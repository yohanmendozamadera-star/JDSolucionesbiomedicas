"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id?: number; name: string; category: string; image: string; price?: string; priceNumber?: number; badge?: string };
const defaultSettings={aboutKicker:"QUIÉNES SOMOS",aboutTitle:"Tu equipo óptico, siempre en su máxima precisión.",aboutParagraph:"En JD Soluciones Bio entendemos que detrás de cada equipo hay diagnósticos que cambian vidas. Somos especialistas en tecnología para ópticas y consultorios, con atención técnica confiable y documentada.",experienceYears:"12+",experienceLabel:"Años cuidando tu inversión",feature1Title:"Mantenimiento especializado",feature1Text:"Preventivo y correctivo para extender la vida útil.",feature2Title:"Calibración y certificación",feature2Text:"Mediciones precisas con reporte técnico detallado.",feature3Title:"Reparación multimarca",feature3Text:"Diagnóstico experto y repuestos garantizados.",aboutImageUrl:"/brand/technician-maintenance.webp",contactCity:"Bogotá, Colombia",contactEmail:"servicio@jdsolucionesbio.co",contactPhone:"+57 300 555 0189",contactHours:"Lun–Sáb, 8:00 a. m.–6:00 p. m.",whatsappPhone:"573005550189"};

const fallbackProducts: Product[] = [
  { name: "Lensómetro digital LM-7", category: "Diagnóstico", price: "$4.850.000", badge: "Más vendido", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=700&q=80" },
  { name: "Unidad oftálmica compacta", category: "Consultorio", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80" },
  { name: "Autorefractómetro AR-310", category: "Diagnóstico", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=700&q=80" },
  { name: "Lámpara de hendidura SL-2", category: "Examen", price: "$7.290.000", image: "https://images.unsplash.com/photo-1580281658628-5262b3db3f77?auto=format&fit=crop&w=700&q=80" },
  { name: "Foróptero profesional", category: "Refracción", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=700&q=80" },
  { name: "Proyector de optotipos", category: "Examen", price: "$2.180.000", image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=700&q=80" },
];

const companies = [
  { name: "Óptica Visión Central", city: "Bogotá", equipment: 8, status: "Activa" },
  { name: "Centro Visual del Norte", city: "Barranquilla", equipment: 5, status: "Activa" },
  { name: "Óptica Nueva Mirada", city: "Medellín", equipment: 3, status: "Pendiente" },
];

function Logo() {
  return <a className="logo" href="#inicio" aria-label="JD Soluciones Biomédicas, inicio"><img src="/brand/jd-soluciones-logo.png" alt="JD Soluciones Biomédicas" /></a>;
}

export default function Home() {
  const [view, setView] = useState<"public" | "admin">("public");
  const [modal, setModal] = useState<"login" | "register" | "quote" | "order" | null>(null);
  const [allProducts, setAllProducts] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [adminTab, setAdminTab] = useState("Resumen");
  const [selectedCompany, setSelectedCompany] = useState(0);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [products,setProducts]=useState<Product[]>(fallbackProducts);
  const [settings,setSettings]=useState(defaultSettings),[selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [authenticated,setAuthenticated]=useState(false);
  useEffect(()=>{fetch("/api/products").then(r=>r.json()).then(d=>{if(d.products?.length)setProducts(d.products.map((p:any)=>({id:p.id,name:p.name,category:p.category,image:p.imageUrl||"https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80",priceNumber:p.price==null?undefined:Number(p.price),price:p.price==null?undefined:new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(p.price)}))) });fetch("/api/settings").then(r=>r.json()).then(d=>{if(d.settings)setSettings(d.settings)}).catch(()=>{});fetch("/api/auth/session").then(r=>r.json()).then(d=>setAuthenticated(Boolean(d.authenticated))).catch(()=>{})},[]);

  const filtered = useMemo(() => products.filter(p => category === "Todos" || p.category === category), [category,products]);
  const shownProducts = allProducts ? filtered : filtered.slice(0, 4);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  if (view === "admin") {
    return <AdminPanel tab={adminTab} setTab={setAdminTab} company={selectedCompany} setCompany={setSelectedCompany} onExit={() => setView("public")} notify={notify} toast={toast} />;
  }

  return (
    <main>
      <div className="topline"><span>Servicio técnico especializado para el sector óptico</span><span>📞 {settings.contactPhone} · {settings.contactHours}</span></div>
      <header className="header">
        <Logo />
        <nav className={menu ? "nav open" : "nav"}>
          <a href="#nosotros" onClick={() => setMenu(false)}>Nosotros</a>
          <a href="#servicios" onClick={() => setMenu(false)}>Servicios</a>
          <a href="#productos" onClick={() => setMenu(false)}>Productos</a>
          <a href="#contacto" onClick={() => setMenu(false)}>Contacto</a>
        </nav>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => authenticated?window.location.href="/portal":setModal("login")}>{authenticated?"Ir al panel":"Ingresar"}</button>
          <button className="btn primary" onClick={() => setModal("register")}>Registrar empresa</button>
        </div>
        <button className="menu-btn" aria-label="Abrir menú" onClick={() => setMenu(!menu)}>☰</button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">INGENIERÍA BIOMÉDICA PARA ÓPTICAS</span>
          <h1>Precisión que protege<br /><em>la visión de tus pacientes.</em></h1>
          <p>Mantenimiento, reparación y calibración certificada de equipos ópticos en toda Colombia.</p>
          <div className="hero-actions">
            <button className="btn light" onClick={() => setModal("quote")}>Solicitar servicio <span>→</span></button>
            <a className="text-link" href="#servicios">Conocer nuestros servicios ↓</a>
          </div>
          <div className="hero-stats">
            <div><b>+12</b><span>Años de experiencia</span></div>
            <div><b>+480</b><span>Equipos intervenidos</span></div>
            <div><b>98%</b><span>Clientes satisfechos</span></div>
          </div>
        </div>
        <aside className="news-card">
          <span className="live">● NOVEDAD</span>
          <p>Jornada de calibración preventiva</p>
          <small>Agenda tu visita técnica antes del 30 de agosto y recibe diagnóstico inicial sin costo.</small>
          <button onClick={() => setModal("quote")}>Reservar ahora →</button>
        </aside>
      </section>

      <section className="trust-strip">
        <span>✓ Técnicos certificados</span><span>✓ Trazabilidad de cada servicio</span><span>✓ Cobertura nacional</span><span>✓ Repuestos garantizados</span>
      </section>

      <section className="about section" id="nosotros">
        <div className="about-image">
          <img src={settings.aboutImageUrl} alt="Imagen de presentación de JD Soluciones Bio" />
          <div className="experience"><b>{settings.experienceYears}</b><span>{settings.experienceLabel}</span></div>
        </div>
        <div className="about-copy">
          <span className="section-kicker">{settings.aboutKicker}</span>
          <h2>{settings.aboutTitle}</h2>
          <p>{settings.aboutParagraph}</p>
          <div className="feature-list">
            <div><i>⚙</i><span><b>{settings.feature1Title}</b><small>{settings.feature1Text}</small></span></div>
            <div><i>◎</i><span><b>{settings.feature2Title}</b><small>{settings.feature2Text}</small></span></div>
            <div><i>◇</i><span><b>{settings.feature3Title}</b><small>{settings.feature3Text}</small></span></div>
          </div>
          <a href="#contacto" className="arrow-link">Conoce nuestra historia <span>→</span></a>
        </div>
      </section>

      <section className="services section" id="servicios">
        <div className="section-head"><div><span className="section-kicker">LO QUE HACEMOS</span><h2>Soluciones para que nunca <em>detengas tu operación.</em></h2></div><p>Atendemos equipos de diagnóstico, refracción, montaje y laboratorio óptico.</p></div>
        <div className="service-grid">
          {[['01','Mantenimiento preventivo','Inspección, limpieza, lubricación, ajustes y pruebas para evitar fallas inesperadas.'],['02','Reparación técnica','Diagnóstico y solución de fallas electrónicas, mecánicas y ópticas multimarca.'],['03','Calibración certificada','Verificación metrológica, ajuste de precisión y certificado con trazabilidad.']].map(s => <article className="service-card" key={s[0]}><span>{s[0]}</span><h3>{s[1]}</h3><p>{s[2]}</p><button onClick={() => setModal("quote")}>Solicitar servicio →</button></article>)}
        </div>
      </section>

      <section className="products section" id="productos">
        <div className="section-head"><div><span className="section-kicker">EQUIPOS Y REPUESTOS</span><h2>Tecnología para tu <em>óptica.</em></h2></div><button className="arrow-link button-link" onClick={() => setAllProducts(!allProducts)}>{allProducts ? "Ver menos" : "Mostrar todos los productos"} →</button></div>
        <div className="filters">{["Todos", "Diagnóstico", "Consultorio", "Examen", "Refracción"].map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => { setCategory(c); setAllProducts(true); }}>{c}</button>)}</div>
        <div className="product-grid">
          {shownProducts.map((p, i) => <article className="product-card" key={p.name}>
            <div className="product-image"><img src={p.image} alt={p.name} />{p.badge && <span>{p.badge}</span>}<button aria-label="Agregar a favoritos">♡</button></div>
            <small>{p.category}</small><h3>{p.name}</h3>
            {p.price ? <div className="price-row"><b>{p.price}</b><button aria-label={`Pedir ${p.name}`} onClick={() => {setSelectedProduct(p);setModal("order")}}>＋</button></div> : <button className="quote-link" onClick={() => {setSelectedProduct(p);setModal("quote")}}>Cotizar equipo →</button>}
          </article>)}
        </div>
      </section>

      <section className="cta section" id="contacto"><div><span>¿TU EQUIPO PRESENTA FALLAS?</span><h2>Hablemos. Un técnico puede orientarte hoy.</h2></div><button className="btn light" onClick={() => setModal("quote")}>Agendar diagnóstico →</button></section>
      <footer><Logo /><p>Especialistas en mantenimiento, reparación y calibración de equipos para ópticas.</p><div><b>Explorar</b><a href="#servicios">Servicios</a><a href="#productos">Productos</a><a href="#nosotros">Nosotros</a></div><div><b>Contacto</b><span>{settings.contactCity}</span><span>{settings.contactEmail}</span><span>{settings.contactPhone}</span></div><small>© 2026 JD Soluciones Bio. Todos los derechos reservados.</small></footer>
      <button className="whatsapp" aria-label="Contactar por WhatsApp" onClick={() => window.open(`https://wa.me/${settings.whatsappPhone.replace(/\D/g,"")}`,"_blank")}>◉<span>¿Necesitas ayuda?</span></button>

      {modal && <Modal type={modal} product={selectedProduct} products={products} close={() => {setModal(null);setSelectedProduct(null)}} submit={(message) => { setModal(null);setSelectedProduct(null); notify(message); }} admin={() => { setModal(null); setView("admin"); }} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Modal({ type, product,products, close, submit, admin }: { type: "login" | "register" | "quote" | "order"; product:Product|null;products:Product[];close: () => void; submit: (m: string) => void; admin: () => void }) {
  const titles = { login: "Ingresa a tu cuenta", register: "Registra tu empresa", quote: "Solicita una cotización",order:"Realiza tu pedido" };
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={close}>×</button><Logo /><h2>{titles[type]}</h2><p>{type === "login" ? "Consulta tus equipos, reportes y solicitudes." : "Déjanos tus datos y nuestro equipo te contactará."}</p>
    <form onSubmit={async e => { e.preventDefault(); if (type === "login") { window.location.href = "/login"; return; }const form=new FormData(e.currentTarget),data:any=Object.fromEntries(form);if(type==="quote"){data.customerName=data.customerName||data.companyName;const selections=form.getAll("quoteSelections").map(String);data.items=selections.map(value=>{if(value.startsWith("product:")){const selected=products.find(p=>p.id===Number(value.slice(8)));return selected?{productId:selected.id,productName:selected.name,quantity:1,unitPrice:selected.priceNumber??null}:null}return{productId:null,productName:value.slice(8),quantity:1,unitPrice:null}}).filter(Boolean);if(!data.items.length){submit("Selecciona al menos un producto o servicio.");return}data.notes=[`Solicitud: ${data.items.map((item:any)=>item.productName).join(", ")}`,data.notes].filter(Boolean).join("\n");const response=await fetch("/api/quotations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});if(!response.ok){submit("No pudimos guardar la solicitud. Inténtalo nuevamente.");return}}if(type==="order"){data.productId=product?.id;const response=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});if(!response.ok){const result=await response.json().catch(()=>({}));submit(result.error||"No pudimos registrar el pedido.");return}}submit(type === "register" ? "Registro enviado para aprobación" : type==="order"?"Pedido registrado correctamente.":"Solicitud recibida; te contactaremos pronto"); }}>
      {type !== "login" && <><label>Nombre de contacto<input name="customerName" required placeholder="Nombre completo" /></label><label>Empresa<input name="companyName" required placeholder="Nombre de la empresa" /></label></>}
      <label>Correo electrónico<input name="email" required type="email" placeholder="nombre@empresa.com" /></label>
      {type === "quote" ? <><label>Teléfono<input name="phone" required placeholder="Número de contacto"/></label><fieldset className="multi-quote-options"><legend>¿Qué deseas cotizar? Puedes elegir varios</legend>{["Mantenimiento preventivo","Reparación técnica","Calibración certificada"].map(name=><label key={name}><input type="checkbox" name="quoteSelections" value={`service:${name}`}/><span>{name}</span></label>)}{products.map(p=><label key={p.id||p.name}><input type="checkbox" name="quoteSelections" value={`product:${p.id}`} defaultChecked={p.id===product?.id}/><span>{p.name}{p.price?` · ${p.price}`:" · Por cotizar"}</span></label>)}</fieldset><label>Cuéntanos qué necesitas<textarea name="notes" placeholder="Describe los equipos, cantidades o servicios" /></label></> : type==="order"?<><label>Teléfono<input name="phone" required placeholder="Número de contacto"/></label><div className="selected-product"><b>{product?.name}</b><span>{product?.price} por unidad</span></div><label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required/></label><label>Observaciones<textarea name="notes" placeholder="Dirección, horario u observaciones"/></label></>:<label>Contraseña<input required type="password" placeholder="••••••••" /></label>}
      <button className="btn primary full" type="submit">{type === "login" ? "Ingresar al portal" : type==="order"?"Confirmar pedido":"Enviar solicitud"}</button>
    </form>{type === "login" && <small className="demo-note">Usa el correo y la contraseña de tu perfil autorizado.</small>}</div></div>;
}

function AdminPanel({ tab, setTab, company, setCompany, onExit, notify, toast }: { tab: string; setTab: (t: string) => void; company: number; setCompany: (i: number) => void; onExit: () => void; notify: (m: string) => void; toast: string }) {
  const tabs = [["Resumen","⌂"],["Empresas","▦"],["Equipos","⚙"],["Reportes de servicio","▤"],["Pedidos","▣"],["Cotizaciones","◫"],["Facturación","▧"],["Aprobaciones","✓"]];
  return <div className="dashboard"><aside className="sidebar"><Logo /><div className="side-profile"><span>JA</span><div><b>Juan Administrador</b><small>Administrador</small></div></div><nav>{tabs.map(t => <button key={t[0]} className={tab === t[0] ? "active" : ""} onClick={() => setTab(t[0])}><i>{t[1]}</i>{t[0]}{t[0] === "Aprobaciones" && <em>2</em>}</button>)}</nav><button className="exit" onClick={onExit}>← Volver al sitio web</button></aside>
    <section className="dash-main"><header><div><small>PORTAL ADMINISTRATIVO</small><h1>{tab}</h1></div><div className="dash-actions"><button>⌕</button><button>♢<em>3</em></button><button className="new-btn" onClick={() => notify("Acción creada correctamente")}>＋ Nuevo</button></div></header><div className="dash-content"><AdminContent tab={tab} company={company} setCompany={setCompany} notify={notify} /></div></section>{toast && <div className="toast">✓ {toast}</div>}</div>;
}

function AdminContent({ tab, company, setCompany, notify }: { tab: string; company: number; setCompany: (i: number) => void; notify: (m: string) => void }) {
  if (tab === "Empresas") return <><div className="panel-title"><div><h2>Directorio de empresas</h2><p>Selecciona una empresa para ver sus equipos y actividad.</p></div><input placeholder="Buscar empresa…" /></div><div className="company-layout"><div className="company-list">{companies.map((c,i)=><button key={c.name} className={company===i?"active":""} onClick={()=>setCompany(i)}><span>{c.name.slice(0,2).toUpperCase()}</span><div><b>{c.name}</b><small>{c.city} · {c.equipment} equipos</small></div><em>{c.status}</em></button>)}</div><div className="company-detail"><span className="company-avatar">{companies[company].name.slice(0,2).toUpperCase()}</span><h2>{companies[company].name}</h2><p>{companies[company].city} · Cliente desde 2023</p><div className="detail-actions"><button onClick={()=>notify("Conversación de WhatsApp iniciada")}>◉ WhatsApp</button><button onClick={()=>notify("Datos de empresa listos para editar")}>Editar datos</button></div><h3>Equipos registrados</h3>{["Autorefractómetro AR-310","Lensómetro digital LM-7","Lámpara de hendidura SL-2"].slice(0,Math.min(3,companies[company].equipment)).map((e,i)=><button className="equipment-row" key={e} onClick={()=>notify(`Abriendo historial de ${e}`)}><i>⚙</i><span><b>{e}</b><small>Serie JD-{20240+i} · Próximo servicio: {12+i} sep. 2026</small></span><em>Ver reportes →</em></button>)}</div></div></>;

  if (tab !== "Resumen") {
    const content: Record<string, [string,string,string][]> = {
      "Equipos": [["AR-310 · Óptica Visión Central","Operativo","12 sep. 2026"],["LM-7 · Centro Visual del Norte","En mantenimiento","18 ago. 2026"],["SL-2 · Óptica Nueva Mirada","Revisión pendiente","22 ago. 2026"]],
      "Reportes de servicio": [["SRV-1082 · Mantenimiento preventivo","Finalizado","14 ago. 2026"],["SRV-1081 · Calibración","Firmado","13 ago. 2026"],["SRV-1080 · Reparación electrónica","En proceso","12 ago. 2026"]],
      "Pedidos": [["PED-0421 · Lensómetro LM-7","Nuevo","$4.850.000"],["PED-0420 · Kit de fusibles","Preparando","$320.000"],["PED-0419 · Lámpara LED SL-2","Enviado","$890.000"]],
      "Cotizaciones": [["COT-0918 · Centro Visual del Norte","Por revisar","$7.290.000"],["COT-0917 · Óptica Horizonte","Enviada","$2.180.000"],["COT-0916 · Visión Total IPS","Aceptada","$4.850.000"]],
      "Facturación": [["FV-2081 · Óptica Visión Central","Pagada","$1.240.000"],["FV-2080 · Centro Visual del Norte","Pendiente","$780.000"],["FV-2079 · Óptica Horizonte","Vencida","$465.000"]],
      "Aprobaciones": [["Óptica Nueva Mirada · Medellín","Registro nuevo","Hoy, 10:32"],["Servicios Visuales SAS · Cali","Documentos completos","Ayer, 16:18"]],
    };
    return <><div className="panel-title"><div><h2>Gestión de {tab.toLowerCase()}</h2><p>Revisa y administra todos los registros desde aquí.</p></div><input placeholder="Buscar…" /></div><div className="data-table"><div className="table-head"><span>Detalle</span><span>Estado</span><span>Valor / fecha</span><span>Acción</span></div>{content[tab].map((r,i)=><div className="table-row" key={r[0]}><span><b>{r[0]}</b><small>Actualizado recientemente</small></span><span><em>{r[1]}</em></span><span>{r[2]}</span><button onClick={()=>notify(tab === "Aprobaciones" ? "Empresa aprobada y notificada" : "Detalle abierto")}>{tab === "Aprobaciones" ? "Aprobar" : "Ver detalle"}</button></div>)}</div></>;
  }

  return <><div className="welcome"><div><span>VIERNES, 14 DE AGOSTO</span><h2>Buenas tardes, Juan 👋</h2><p>Este es el estado de la operación de JD Soluciones Bio.</p></div><button onClick={()=>notify("Reporte general preparado")}>Descargar reporte ↓</button></div><div className="kpis">{[["Empresas activas","42","+3 este mes","▦"],["Servicios en curso","12","4 para hoy","⚙"],["Cotizaciones abiertas","8","$24,6 M en valor","◫"],["Facturas pendientes","6","$8,2 M por cobrar","▧"]].map(k=><article key={k[0]}><i>{k[3]}</i><small>{k[0]}</small><b>{k[1]}</b><span>{k[2]}</span></article>)}</div><div className="dash-grid"><section className="activity"><div className="card-head"><h3>Actividad reciente</h3><button>Ver todo →</button></div>{[["Servicio finalizado","Lensómetro LM-7 · Óptica Visión Central","Hace 18 min"],["Nueva cotización","Autorefractómetro · Centro Visual del Norte","Hace 1 h"],["Empresa por aprobar","Óptica Nueva Mirada · Medellín","Hace 3 h"],["Pago recibido","Factura FV-2081 · $1.240.000","Ayer"]].map((a,i)=><div className="activity-row" key={a[0]}><i>{["✓","◫","▦","$"][i]}</i><span><b>{a[0]}</b><small>{a[1]}</small></span><em>{a[2]}</em></div>)}</section><section className="agenda"><div className="card-head"><h3>Agenda de hoy</h3><span>4 servicios</span></div>{[["08:30","Mantenimiento preventivo","Óptica Visión Central"],["11:00","Calibración","Centro Visual del Norte"],["14:30","Diagnóstico técnico","Óptica Horizonte"]].map(a=><div className="agenda-row" key={a[0]}><b>{a[0]}</b><span><strong>{a[1]}</strong><small>{a[2]}</small></span></div>)}</section></div></>;
}
