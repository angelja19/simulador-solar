/* =================================================================
   SIMULADOR SOLAR - App web (version para celular)
   ================================================================= */
"use strict";

const $ = (s) => document.querySelector(s);
const estado = { paisId: PAIS_DEFECTO, dia: 21, mes: 12 };
let anguloVisible = null;     // angulo con signo que se esta dibujando (para animar)
let animId = null;

/* ---------- banderas sencillas ---------- */
const BANDERAS = {
  1: '<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#007934"/><rect width="3" height="1.333" fill="#f9e300"/><rect width="3" height=".667" fill="#d52b1e"/></svg>',
  2: '<svg viewBox="0 0 4 4"><rect width="4" height="4" fill="#ce1126"/><rect width="4" height="3" fill="#003893"/><rect width="4" height="2" fill="#fcd116"/></svg>',
  3: '<svg viewBox="0 0 4 4"><rect width="4" height="4" fill="#ed1c24"/><rect width="4" height="3" fill="#034ea2"/><rect width="4" height="2" fill="#ffd100"/><ellipse cx="2" cy="2" rx=".42" ry=".55" fill="#7a5c2e" stroke="#ffd100" stroke-width=".08"/></svg>',
  4: '<svg viewBox="0 0 4 4"><rect width="4" height="4" fill="#aa151b"/><rect y="1" width="4" height="2" fill="#f1bf00"/></svg>',
  5: '<svg viewBox="0 0 22 16"><rect width="22" height="16" fill="#ba0c2f"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="22" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205b"/><rect y="7" width="22" height="2" fill="#00205b"/></svg>',
};

/* ---------- memoria de la ultima seleccion ---------- */
function guardar() {
  try { localStorage.setItem("simuladorSolar", JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ }
}
function recuperar() {
  try {
    const d = JSON.parse(localStorage.getItem("simuladorSolar") || "null");
    if (d && PAISES[d.paisId] && fechaValida(d.dia, d.mes)) { Object.assign(estado, d); return; }
  } catch (e) { /* ignorar */ }
  const h = new Date();                       // primera visita: la fecha de hoy
  if (fechaValida(h.getDate(), h.getMonth() + 1)) { estado.dia = h.getDate(); estado.mes = h.getMonth() + 1; }
}

/* ---------- controles ---------- */
function construirControles() {
  const cont = $("#paises");
  for (const id of [1, 2, 3, 4, 5]) {
    const b = document.createElement("button");
    b.className = "pais";
    b.setAttribute("role", "radio");
    b.dataset.id = id;
    b.innerHTML = `${BANDERAS[id]}<span>${PAISES[id].nombre}</span>`;
    b.addEventListener("click", () => { estado.paisId = id; actualizar(); });
    cont.appendChild(b);
  }
  const selMes = $("#sel-mes");
  for (let m = 1; m <= 12; m++) selMes.add(new Option(MESES[m][0].toUpperCase() + MESES[m].slice(1), m));
  selMes.addEventListener("change", () => {
    estado.mes = +selMes.value;
    estado.dia = Math.min(estado.dia, DIAS_MES[estado.mes]);
    llenarDias(); actualizar();
  });
  $("#sel-dia").addEventListener("change", (e) => { estado.dia = +e.target.value; actualizar(); });
  document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.f === "hoy") {
      const h = new Date();
      estado.dia = h.getDate(); estado.mes = h.getMonth() + 1;
      if (!fechaValida(estado.dia, estado.mes)) estado.dia = 28;   // 29/02 no existe en la tabla
    } else {
      const [d, m] = b.dataset.f.split("/").map(Number);
      estado.dia = d; estado.mes = m;
    }
    llenarDias(); actualizar();
  }));
}

function llenarDias() {
  const sel = $("#sel-dia");
  sel.innerHTML = "";
  for (let d = 1; d <= DIAS_MES[estado.mes]; d++) sel.add(new Option(String(d), d));
  sel.value = estado.dia;
  $("#sel-mes").value = estado.mes;
}

/* ---------- simulacion ---------- */
function actualizar(animar = true) {
  const r = simular(estado.paisId, estado.dia, estado.mes);
  guardar();

  document.querySelectorAll(".pais").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.id === estado.paisId)));
  $("#txt-angulo").textContent = r.lado ? `${f1(r.ang)}° hacia el ${r.lado.toUpperCase()}` : "0° · anillo vertical";

  dibujarPais($("#cv-pais"), r.paisId);
  dibujarEstacion($("#cv-estacion"), r.franja, r.pais.lat);

  $("#d-pais").textContent = r.pais.nombre;
  $("#d-ciudad").textContent = r.pais.ref;
  $("#d-lat").textContent = textoLatitud(r.pais.lat);
  $("#d-fecha").textContent = `${String(r.dia).padStart(2, "0")}/${String(r.mes).padStart(2, "0")}`;
  $("#d-n").textContent = `${r.n} del año`;
  $("#d-temp").textContent = `${r.temp} °C`;

  const colores = { Verano: "#f59e0b", Equinoccio: "#10b981", Invierno: "#3b82f6" };
  $("#tabla-est").innerHTML = tablaEstaciones(r.pais.lat).map((t) =>
    `<li><span class="punto" style="background:${colores[t.nombre]}"></span>
      <span class="nom">${t.nombre}<small>${t.fechas}</small></span>
      <span class="val">${textoInclinacion(t.ang, t.lado)}</span></li>`).join("");

  animarA(r.ang * r.signo, animar);
  actualizarFormula(r);
}

/** Anima el anillo y el Sol hasta el nuevo angulo (coordinados). */
function animarA(destino, animar) {
  if (animId) cancelAnimationFrame(animId);
  const reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inicio = anguloVisible == null ? (destino >= 0 ? 85 : -85) : anguloVisible;
  if (!animar || reducir || Math.abs(destino - inicio) < 0.05) {
    anguloVisible = destino; dibujarAngulo(destino); return;
  }
  const t0 = performance.now(), dur = 800;
  const paso = (t) => {
    let k = Math.min(1, (t - t0) / dur);
    k = 1 - Math.pow(1 - k, 3);
    anguloVisible = inicio + (destino - inicio) * k;
    dibujarAngulo(anguloVisible);
    if (k < 1) animId = requestAnimationFrame(paso); else { anguloVisible = destino; dibujarAngulo(destino); animId = null; }
  };
  animId = requestAnimationFrame(paso);
}
function dibujarAngulo(s) {
  dibujarHeliodon($("#cv-helio"), s, true);
  dibujarSolCasa($("#cv-sol"), s);
}

/* ---------- pagina Formula ---------- */
function tex(id, expr) {
  const el = document.getElementById(id);
  if (window.katex) katex.render(expr, el, { displayMode: true, throwOnError: false });
  else el.textContent = expr;
}
const g2 = (x) => x.toFixed(2);
const par = (x) => (x < 0 ? `(${g2(x)})` : g2(x));

function actualizarFormula(r) {
  const p = r.pais;
  $("#f-ejemplo").textContent = `${p.nombre} (${p.ref}) · ${r.dia} de ${MESES[r.mes]}  →  ${r.texto}`;

  const previos = r.n - r.dia;
  tex("f-n", `n = ${r.dia} + ${previos} = \\boxed{${r.n}}`);
  $("#f-n-txt").textContent = r.mes === 1
    ? `${r.dia} de enero: todavía no pasó ningún mes completo (0 días).`
    : `${r.dia} días de ${MESES[r.mes]} + ${previos} días de los meses anteriores (enero${r.mes > 2 ? " a " + MESES[r.mes - 1] : ""}).`;

  const argumento = (360 / 365) * (284 + r.n);
  const seno = Math.sin(rad(argumento));
  tex("f-delta-gen", `\\delta = 23.45^\\circ \\cdot \\sin\\!\\left(\\frac{360^\\circ}{365}\\,(284 + n)\\right)`);
  tex("f-delta", `\\begin{aligned}
    \\delta &= 23.45^\\circ \\cdot \\sin\\!\\left(\\tfrac{360^\\circ}{365}\\,(284 + ${r.n})\\right) \\\\
            &= 23.45^\\circ \\cdot \\sin(${g2(argumento)}^\\circ) \\\\
            &= 23.45^\\circ \\cdot (${seno.toFixed(4)}) \\\\
            &= \\boxed{${g2(r.decl)}^\\circ}
  \\end{aligned}`);

  const dif = p.lat - r.decl;
  tex("f-theta-gen", `\\theta = \\lvert\\, \\varphi - \\delta \\,\\rvert`);
  tex("f-theta", `\\begin{aligned}
     \\theta &= \\lvert\\, ${par(p.lat)}^\\circ - ${par(r.decl)}^\\circ \\,\\rvert \\\\
            &= \\lvert\\, ${g2(dif)}^\\circ \\,\\rvert = ${g2(Math.abs(dif))}^\\circ \\\\
            &${r.lado ? `\\approx \\boxed{${f1(r.ang)}^\\circ}` : `< 0.5^\\circ \\;\\Rightarrow\\; \\boxed{0^\\circ}`}
     \\end{aligned}`);

  let lado;
  if (!r.lado) lado = `La diferencia es menor a 0,5°: el Sol está prácticamente en el cenit, así que el anillo queda vertical (0°).`;
  else if (dif > 0) lado = `φ − δ = ${g2(dif)}° es positivo: el Sol de mediodía está al Sur del cenit, por eso el anillo se inclina ${f1(r.ang)}° hacia el SUR.`;
  else lado = `φ − δ = ${g2(dif)}° es negativo: el Sol de mediodía está al Norte del cenit, por eso el anillo se inclina ${f1(r.ang)}° hacia el NORTE.`;
  $("#f-lado").textContent = lado;

  tex("f-alfa", `\\alpha = 90^\\circ - \\theta = 90^\\circ - ${f1(r.ang)}^\\circ = \\boxed{${f1(90 - r.ang)}^\\circ}`);

  dibujarDiagramaTierra($("#cv-tierra"), p.lat, r.decl, p.ref);
  $("#f-teoria").innerHTML = textoTeoria(r);
}

/** Explicacion en palabras, calculada para la fecha y el pais elegidos. */
function textoTeoria(r) {
  const p = r.pais, d = r.decl, dif = p.lat - d, g = (x) => f1(Math.abs(x)).replace(".", ",");
  const fecha = `El ${r.dia} de ${MESES[r.mes]}`;
  // donde esta el Sol vertical
  const dondeSol = Math.abs(d) < 0.5 ? `prácticamente sobre el <b>ecuador</b>`
    : `sobre la latitud <b>${g(d)}° ${d > 0 ? "Norte" : "Sur"}</b>`;
  // hacia donde se mueve (mañana comparado con hoy, con la misma ecuacion)
  const nSig = r.n === 365 ? 1 : r.n + 1;
  const haciaMov = declinacionSolar(nSig) - d > 0 ? "Norte" : "Sur";
  // la ciudad respecto a ese punto
  let ciudad, lado;
  if (!r.lado) {
    ciudad = `${p.ref} (${textoLatitud(p.lat)}) está casi en la misma latitud que ese punto (a solo ${g(dif)}°).`;
    lado = `Por eso, al mediodía el Sol queda <b>casi justo encima</b> de la ciudad y el anillo va <b>vertical (0°)</b>.`;
  } else {
    const dirCiudad = dif < 0 ? "Sur" : "Norte";
    ciudad = `${p.ref} (${textoLatitud(p.lat)}) está <b>${g(dif)}° más al ${dirCiudad}</b> que ese punto.`;
    lado = `Por eso, al mediodía el Sol no está justo encima: se ve <b>${g(dif)}° separado del cenit, hacia el ${r.lado}</b>, que es el lado donde está ese punto. El anillo se inclina esos mismos ${g(dif)}° hacia el ${r.lado}.`;
  }
  // tendencia del angulo en los proximos dias
  const difMan = p.lat - declinacionSolar(nSig);
  const hoy = Math.abs(dif), manana = Math.abs(difMan);
  let tendencia;
  if (Math.abs(declinacionSolar(nSig) - d) < 0.05) tendencia = `En estos días el ángulo casi no cambia: el Sol está por dar la vuelta (cerca de un solsticio).`;
  else if (Math.sign(difMan) !== Math.sign(dif)) tendencia = `En estos días el Sol pasa <b>justo por encima</b> de ${p.ref} (cerca de 0°) y luego seguirá de largo hacia el ${haciaMov}.`;
  else if (manana < hoy) tendencia = `Como el Sol se está <b>acercando</b> a la latitud de ${p.ref}, en los próximos días el ángulo irá <b>bajando</b> y el Sol de mediodía estará cada vez más alto.`;
  else tendencia = `Como el Sol se está <b>alejando</b> de la latitud de ${p.ref}, en los próximos días el ángulo irá <b>subiendo</b> y el Sol de mediodía estará cada vez más bajo.`;

  return `
    <div class="paso-idea"><span>1</span><p>La Tierra gira inclinada 23,45°. Por eso, cada día del año el Sol cae <b>vertical</b> (justo encima) sobre una latitud distinta, siempre entre el Trópico de Cáncer (23,45° N) y el de Capricornio (23,45° S).</p></div>
    <div class="paso-idea"><span>2</span><p>${fecha}, según la ecuación de Cooper, el Sol está vertical ${dondeSol}, y cada día se mueve un poco hacia el <b>${haciaMov}</b>.</p></div>
    <div class="paso-idea"><span>3</span><p>${ciudad}</p></div>
    <div class="paso-idea"><span>4</span><p>Cada grado de latitud que uno se aleja del punto donde el Sol está vertical, el Sol del mediodía se ve <b>un grado más inclinado</b>. ${lado}</p></div>
    <p class="nota">${tendencia}</p>`;
}

/* ---------- pagina Heliodon ---------- */
function prepararPrueba() {
  const rango = $("#rango");
  const dibujar = () => {
    const s = +rango.value;
    $("#rango-val").textContent = s === 0 ? "0° (vertical)" : `${Math.abs(s)}° hacia el ${s > 0 ? "Sur" : "Norte"}`;
    dibujarHeliodon($("#cv-helio-prueba"), s, true);
    dibujarSolCasa($("#cv-sol-prueba"), s);
  };
  rango.addEventListener("input", dibujar);
  dibujar();

  // Dias en que el Sol pasa por el cenit de Cochabamba (declinacion = latitud)
  const lat = PAISES[1].lat, dias = [];
  for (let n = 1; n <= 365; n++) {
    const a = declinacionSolar(n) - lat, b = declinacionSolar(n + 1) - lat;
    if (a === 0 || a * b < 0) dias.push(Math.abs(a) <= Math.abs(b) ? n : n + 1);
  }
  const fecha = (n) => {
    let m = 1; while (n > DIAS_MES[m]) { n -= DIAS_MES[m]; m++; }
    return `${n} de ${MESES[m]}`;
  };
  if (dias.length)
    $("#cenit-cocha").textContent = `Dato curioso: Cochabamba (18° S) está entre el ecuador y el Trópico de Capricornio, ` +
      `así que el Sol de mediodía pasa exactamente por el cenit (0°, casi sin sombra) dos veces al año: ` +
      `alrededor del ${dias.map(fecha).join(" y del ")}, según la misma ecuación del programa.`;
}

/* ---------- navegacion ---------- */
function irA(nombre) {
  document.querySelectorAll(".pagina").forEach((p) => p.classList.toggle("activa", p.id === `pag-${nombre}`));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("activo", b.dataset.ir === nombre));
  window.scrollTo({ top: 0 });
  // los canvas de una pagina oculta no tienen ancho: se redibujan al mostrarla
  redibujarTodo();
}
document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => irA(b.dataset.ir)));

function dibujarImagenesHeliodon() {
  document.querySelectorAll("canvas[data-grados]").forEach((c) => dibujarSolCasa(c, +c.dataset.grados));
  const lat = PAISES[1].lat, t = tablaEstaciones(lat);
  dibujarAlero($("#cv-alero"), lat);
  $("#alero-txt").textContent = `Ejemplo en Cochabamba: en invierno (21/06) el Sol de mediodía está a ${f1(90 - t[2].ang)}° sobre el horizonte, ` +
    `hacia el Norte, y entra por una ventana que mira al Norte. En verano (21/12) está casi vertical (${f1(90 - t[0].ang)}°), ` +
    `así que el techo y el alero dan sombra. Son los mismos ángulos que calcula el programa.`;
}

function redibujarTodo() {
  const r = simular(estado.paisId, estado.dia, estado.mes);
  dibujarPais($("#cv-pais"), r.paisId);
  dibujarEstacion($("#cv-estacion"), r.franja, r.pais.lat);
  dibujarAngulo(anguloVisible == null ? r.ang * r.signo : anguloVisible);
  dibujarDiagramaTierra($("#cv-tierra"), r.pais.lat, r.decl, r.pais.ref);
  const s = +$("#rango").value;
  dibujarHeliodon($("#cv-helio-prueba"), s, true);
  dibujarSolCasa($("#cv-sol-prueba"), s);
  dibujarImagenesHeliodon();
}
let tRes = null;
window.addEventListener("resize", () => { clearTimeout(tRes); tRes = setTimeout(redibujarTodo, 120); });

/* ---------- QR ---------- */
// Si la pagina se publica en un sitio que la muestra dentro de otro marco,
// <meta name="url-publica" content="https://..."> indica el enlace real para el QR.
function urlPublica() {
  const m = document.querySelector('meta[name="url-publica"]');
  return (m && m.content) ? m.content : location.href.split("#")[0];
}
function mostrarQR(grande = false) {
  const url = urlPublica();
  const modal = $("#modal-qr");
  modal.classList.toggle("grande", grande);
  try {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("#qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  } catch (e) { $("#qr").textContent = "No se pudo generar el QR."; }
  $("#qr-url").textContent = url;
  $("#qr-aviso").textContent = location.protocol === "file:"
    ? "Está abriendo el archivo desde su computadora: publique la carpeta (por ejemplo en GitHub Pages) para que el QR funcione en otros celulares."
    : "";
  modal.hidden = false;
}
$("#btn-qr").addEventListener("click", () => mostrarQR(false));
$("#qr-grande").addEventListener("click", () => mostrarQR(!$("#modal-qr").classList.contains("grande")));
$("#qr-cerrar").addEventListener("click", () => { $("#modal-qr").hidden = true; });
$("#modal-qr").addEventListener("click", (e) => { if (e.target.id === "modal-qr") e.currentTarget.hidden = true; });
$("#qr-copiar").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(urlPublica()); $("#qr-copiar").textContent = "¡Copiado!"; }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents($("#qr-url"));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    $("#qr-copiar").textContent = "Enlace seleccionado";
  }
  setTimeout(() => { $("#qr-copiar").textContent = "Copiar enlace"; }, 2000);
});

/* ---------- instalar como app (PWA) ---------- */
let eventoInstalar = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); eventoInstalar = e; $("#btn-instalar").hidden = false;
});
$("#btn-instalar").addEventListener("click", async () => {
  if (!eventoInstalar) return;
  eventoInstalar.prompt();
  try { await eventoInstalar.userChoice; } catch (e) { /* nada */ }
  eventoInstalar = null; $("#btn-instalar").hidden = true;
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/* ---------- inicio ---------- */
recuperar();
construirControles();
llenarDias();
prepararPrueba();
actualizar(true);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redibujarTodo);
