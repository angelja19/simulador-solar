/* =================================================================
   SIMULADOR SOLAR - Dibujos (mismo diseño que el programa de PC)
   ================================================================= */
"use strict";

const COL = {
  card: "#ffffff", suave: "#f5f8fc", borde: "#dbe3ee", txt: "#14213d", txt2: "#44546d",
  muted: "#7b8aa1", azul: "#0d3b7a", azul2: "#1d5bb5", rojo: "#d7262f", sol: "#f5a300",
  solClaro: "#fff4d9", ok: "#16a34a", sim: "#e67e00",
};
const FAM = '"Segoe UI", system-ui, -apple-system, Roboto, "Noto Sans", Arial, sans-serif';
const fuente = (px, bold = true) => `${bold ? "700" : "400"} ${px}px ${FAM}`;

function mezclar(c1, c2, t) {
  const a = [1, 3, 5].map(i => parseInt(c1.slice(i, i + 2), 16));
  const b = [1, 3, 5].map(i => parseInt(c2.slice(i, i + 2), 16));
  return "#" + a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, "0")).join("");
}

/* ---------- Lienzo: pequeño adaptador estilo Tkinter sobre <canvas> ---------- */
class Lienzo {
  /** Prepara el canvas: ancho logico W (o el ancho real si W es null) y alto logico H. */
  constructor(canvas, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = canvas.clientWidth || W || 300;
    this.W = W || cssW;
    this.H = H;
    const esc = cssW / this.W;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(H * esc * dpr);
    this.ctx = canvas.getContext("2d");
    this.ctx.setTransform(esc * dpr, 0, 0, esc * dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.lineJoin = "round";
  }
  _trazo(o) {
    const c = this.ctx;
    if (o.relleno) { c.fillStyle = o.relleno; c.fill(); }
    if (o.borde) {
      c.strokeStyle = o.borde; c.lineWidth = o.ancho || 1;
      c.setLineDash(o.dash || []); c.stroke(); c.setLineDash([]);
    }
  }
  /** Camino suavizado como Tkinter (curvas por los puntos medios). */
  _suave(pts, cerrado) {
    const c = this.ctx, n = pts.length / 2;
    const P = i => [pts[2 * i], pts[2 * i + 1]];
    if (cerrado) {
      const m0 = [(P(0)[0] + P(1)[0]) / 2, (P(0)[1] + P(1)[1]) / 2];
      c.moveTo(m0[0], m0[1]);
      for (let i = 1; i <= n; i++) {
        const a = P(i % n), b = P((i + 1) % n);
        c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      c.closePath();
    } else {
      c.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n - 1; i++) {
        const a = P(i), b = P(i + 1);
        const mx = i < n - 2 ? (a[0] + b[0]) / 2 : b[0], my = i < n - 2 ? (a[1] + b[1]) / 2 : b[1];
        c.quadraticCurveTo(a[0], a[1], mx, my);
      }
      if (n === 2) c.lineTo(pts[2], pts[3]);
    }
  }
  linea(pts, o = {}) {
    const c = this.ctx; c.beginPath();
    if (o.suave && pts.length > 4) this._suave(pts, false);
    else { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); }
    c.lineCap = o.cap || "butt";
    this._trazo({ borde: o.color || "#000", ancho: o.ancho || 1, dash: o.dash });
    c.lineCap = "butt";
  }
  poligono(pts, o = {}) {
    const c = this.ctx; c.beginPath();
    if (o.suave) this._suave(pts, true);
    else { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
    this._trazo(o);
  }
  ovalo(x1, y1, x2, y2, o = {}) {
    const c = this.ctx; c.beginPath();
    c.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, 2 * Math.PI);
    this._trazo(o);
  }
  rect(x1, y1, x2, y2, o = {}) {
    const c = this.ctx; c.beginPath(); c.rect(x1, y1, x2 - x1, y2 - y1); this._trazo(o);
  }
  redondeado(x1, y1, x2, y2, r, o = {}) {
    const c = this.ctx; c.beginPath();
    r = Math.min(r, (x2 - x1) / 2, (y2 - y1) / 2);
    c.moveTo(x1 + r, y1); c.arcTo(x2, y1, x2, y2, r); c.arcTo(x2, y2, x1, y2, r);
    c.arcTo(x1, y2, x1, y1, r); c.arcTo(x1, y1, x2, y1, r); c.closePath();
    this._trazo(o);
  }
  /** Arco estilo Tk: start/extent en grados, antihorario desde las 3 en punto. */
  arco(x1, y1, x2, y2, start, extent, o = {}) {
    const c = this.ctx, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, r = (x2 - x1) / 2;
    c.beginPath();
    if (o.relleno) c.moveTo(cx, cy);
    c.arc(cx, cy, r, -rad(start), -rad(start + extent), extent > 0);
    if (o.relleno) c.closePath();
    this._trazo(o);
  }
  texto(x, y, t, o = {}) {
    const c = this.ctx;
    c.font = o.fuente || fuente(13);
    c.fillStyle = o.color || COL.txt;
    c.textBaseline = "middle";
    c.textAlign = { w: "left", e: "right" }[o.anchor] || "center";
    c.fillText(t, x, y);
  }
  medir(t, f) { this.ctx.font = f; return this.ctx.measureText(t).width; }
  degradado(x0, y0, x1, y1, c1, c2) {
    const g = this.ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    this.ctx.fillStyle = g; this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  pastilla(x, y, t, f, fondo, fg, o = {}) {
    const padx = o.padx || 10, alto = o.alto || 26;
    const w = this.medir(t, f) + 2 * padx;
    const x0 = o.anchor === "w" ? x : (o.anchor === "e" ? x - w : x - w / 2);
    this.redondeado(x0, y - alto / 2, x0 + w, y + alto / 2, alto / 2, { relleno: fondo, borde: o.borde || null, ancho: 1.5 });
    this.texto(x0 + w / 2, y, t, { fuente: f, color: fg });
    return w;
  }
}

/* =================================================================
   PAISES (ilustraciones)
   ================================================================= */
const PAIS_W = 300, PAIS_H = 172;

function dibujarPais(canvas, paisId) {
  const L = new Lienzo(canvas, PAIS_W, PAIS_H);
  const W = PAIS_W, H = PAIS_H - 36;
  const p = PAISES[paisId];
  ilustracionPais(L, p.nombre, W, H);
  L.rect(0, PAIS_H - 36, W, PAIS_H, { relleno: COL.azul });
  L.rect(0, PAIS_H - 36, W, PAIS_H - 33, { relleno: COL.sol });
  L.texto(14, PAIS_H - 17, p.nombre, { anchor: "w", color: "#fff", fuente: fuente(17) });
  L.texto(W - 14, PAIS_H - 17, `${p.ref}  ·  ${textoLatitud(p.lat)}`,
          { anchor: "e", color: "#c8d6ee", fuente: fuente(12) });
}

function ilustracionPais(L, nombre, W, H) {
  if (nombre === "Bolivia") {            // Cochabamba: Tunari y Cristo de la Concordia
    L.degradado(0, 0, W, H, "#6fb8ea", "#d9effb");
    L.ovalo(238, 14, 270, 46, { relleno: "#ffe9a3" });
    L.ovalo(244, 20, 264, 40, { relleno: "#ffd23f" });
    L.poligono([-5, H, -5, 84, 30, 62, 62, 74, 96, 40, 128, 66, 160, 50, 200, 72, 236, 46, 272, 68, 305, 56, 305, H],
               { relleno: "#8c9cc4" });
    L.poligono([90, 46, 96, 40, 104, 47, 98, 50], { relleno: "#fff" });
    L.poligono([230, 52, 236, 46, 244, 54, 237, 56], { relleno: "#fff" });
    L.poligono([-5, H, 40, 112, 100, 84, 150, 74, 200, 84, 262, 112, 305, H], { relleno: "#6f9a4a", suave: true });
    let i = 0;
    for (let x = 0; x < W; x += 22, i++) {
      const hh = 8 + (i * 7) % 9;
      const col = ["#f1e4c8", "#e9cfa6", "#f6efe0", "#e0b98a"][i % 4];
      L.rect(x, H - hh, x + 18, H, { relleno: col, borde: "#c7a77b" });
      L.poligono([x - 1, H - hh, x + 9, H - hh - 6, x + 19, H - hh], { relleno: "#b5533c" });
    }
    const cx = 150;
    L.rect(cx - 7, 66, cx + 7, 76, { relleno: "#e9e9e9", borde: "#bdbdbd" });
    L.poligono([cx - 4, 36, cx + 4, 36, cx + 6, 66, cx - 6, 66], { relleno: "#f7f7f7", borde: "#c9c9c9" });
    L.linea([cx - 22, 41, cx + 22, 41], { color: "#f7f7f7", ancho: 4, cap: "round" });
    L.ovalo(cx - 4, 27, cx + 4, 35, { relleno: "#f7f7f7", borde: "#c9c9c9" });
  } else if (nombre === "Colombia") {    // Bogota: cerros orientales y Monserrate
    L.degradado(0, 0, W, H, "#7cc3ee", "#e2f3fb");
    for (const [x, y] of [[40, 26], [205, 18]])
      for (const [dx, r] of [[0, 12], [14, 15], [30, 11]])
        L.ovalo(x + dx - r, y - r + 6, x + dx + r, y + r + 6, { relleno: "#fff" });
    L.poligono([-5, H, -5, 70, 50, 50, 110, 32, 160, 54, 220, 40, 305, 66, 305, H], { relleno: "#5f8f5c", suave: true });
    L.poligono([-5, H, -5, 96, 70, 78, 150, 92, 230, 76, 305, 92, 305, H], { relleno: "#3f6e44", suave: true });
    L.rect(102, 26, 120, 36, { relleno: "#fff", borde: "#c9c9c9" });
    L.rect(112, 18, 118, 26, { relleno: "#fff", borde: "#c9c9c9" });
    L.poligono([100, 26, 111, 20, 122, 26], { relleno: "#b5533c" });
    const edif = [[10, 28], [34, 40], [58, 30], [80, 52], [104, 36], [128, 62], [150, 44], [174, 34],
                  [198, 48], [222, 30], [246, 42], [270, 28]];
    for (const [x, hh] of edif) {
      L.rect(x, H - hh, x + 20, H, { relleno: "#c9d3df", borde: "#9fb0c4" });
      for (let wy = H - hh + 5; wy < H - 4; wy += 8)
        L.linea([x + 4, wy, x + 16, wy], { color: "#8aa0ba", ancho: 2, dash: [3, 2] });
    }
  } else if (nombre === "Ecuador") {     // Quito: Cotopaxi y linea equinoccial
    L.degradado(0, 0, W, H, "#8fcdf2", "#eaf6fc");
    L.ovalo(240, 14, 272, 46, { relleno: "#ffd23f" });
    L.poligono([30, H - 4, 150, 22, 270, H - 4], { relleno: "#6c6f7f" });
    L.poligono([150, 22, 270, H - 4, 210, H - 4], { relleno: "#5a5d6c" });
    L.poligono([150, 22, 122, 50, 132, 56, 141, 48, 150, 58, 159, 48, 168, 56, 178, 50], { relleno: "#fff" });
    L.poligono([-5, H, -5, 112, 80, 100, 160, 112, 240, 98, 305, 110, 305, H], { relleno: "#5c8d3f", suave: true });
    L.linea([0, H - 16, W, H - 16], { color: "#e11d2a", ancho: 3, dash: [8, 5] });
    L.pastilla(12, H - 30, "Línea ecuatorial 0°", fuente(11), "#fff", "#c0392b", { anchor: "w", alto: 20, padx: 8 });
  } else if (nombre === "España") {      // Madrid: Puerta de Alcala
    L.degradado(0, 0, W, H, "#f6a95c", "#fde3c4");
    L.ovalo(28, 18, 58, 48, { relleno: "#ffe08a" });
    L.rect(0, H - 14, W, H, { relleno: "#cdb48a" });
    for (const tx of [22, 278]) {
      L.rect(tx - 2, H - 34, tx + 2, H - 14, { relleno: "#6b4a2a" });
      L.ovalo(tx - 18, H - 66, tx + 18, H - 28, { relleno: "#4f7d3a" });
    }
    const x0 = 62, x1 = 238, yb = H - 14, yt = 50;
    L.rect(x0, yt, x1, yb, { relleno: "#ead8ae", borde: "#b89b62", ancho: 2 });
    L.rect(100, 30, 200, yt, { relleno: "#ead8ae", borde: "#b89b62", ancho: 2 });
    L.poligono([126, 30, 150, 14, 174, 30], { relleno: "#ead8ae", borde: "#b89b62", ancho: 2 });
    L.linea([x0, yt + 8, x1, yt + 8], { color: "#b89b62", ancho: 2 });
    for (const ax of [110, 150, 190]) {
      L.rect(ax - 12, yt + 30, ax + 12, yb, { relleno: "#6b5a3a" });
      L.ovalo(ax - 12, yt + 18, ax + 12, yt + 42, { relleno: "#6b5a3a" });
    }
    for (const ax of [78, 222]) L.rect(ax - 8, yt + 34, ax + 8, yb, { relleno: "#6b5a3a" });
    for (const cx of [92, 130, 170, 208]) L.linea([cx, yt + 12, cx, yb], { color: "#c9b07c", ancho: 3 });
  } else {                               // Noruega: fiordo con aurora
    L.degradado(0, 0, W, H, "#0b1d3a", "#2d5486");
    for (const [sx, sy] of [[30, 14], [70, 30], [120, 10], [180, 22], [232, 12], [280, 30], [150, 36]])
      L.ovalo(sx - 1, sy - 1, sx + 1, sy + 1, { relleno: "#fff" });
    for (const [col, ancho] of [["#1f6f5a", 14], ["#2fb07c", 8], ["#7cf2b6", 3]])
      L.linea([-5, 46, 60, 26, 130, 44, 200, 20, 305, 40], { color: col, ancho, suave: true });
    L.poligono([-5, 104, 40, 54, 80, 80, 130, 44, 180, 84, 230, 50, 305, 98, 305, 110, -5, 110], { relleno: "#cfd9e6" });
    L.poligono([130, 44, 180, 84, 150, 104], { relleno: "#a9b8cc" });
    L.poligono([40, 54, 80, 80, 58, 100], { relleno: "#a9b8cc" });
    L.rect(0, 104, W, H, { relleno: "#1f3b5c" });
    for (let y = 110; y < H; y += 7) L.linea([90, y, 210, y], { color: "#3d6189", dash: [6, 6] });
    for (const [tx, s] of [[22, 1.0], [48, 0.8], [262, 0.9], [284, 1.1]]) {
      L.poligono([tx, H - 50 * s, tx - 14 * s, H - 4, tx + 14 * s, H - 4], { relleno: "#1d4a33" });
      L.poligono([tx, H - 50 * s, tx - 6 * s, H - 36 * s, tx + 6 * s, H - 36 * s], { relleno: "#fff" });
    }
  }
}

/* =================================================================
   ESTACION DEL AÑO (escenas)
   ================================================================= */
const ESTACION_H = 118;
const COLOR_ESTACION = { Verano: "#d97706", Invierno: "#2563eb", Primavera: "#db2777", "Otoño": "#c2410c" };

function dibujarEstacion(canvas, franja, lat) {
  const L = new Lienzo(canvas, null, ESTACION_H);
  const W = L.W, H = ESTACION_H;
  if (franja == null) {
    L.degradado(0, 0, W, H, "#e3e9f1", "#f5f7fa");
    L.poligono([-5, H, -5, 80, W * 0.3, 62, W * 0.6, 84, W + 5, 66, W + 5, H], { relleno: "#d6dde7", suave: true });
    L.texto(W / 2, 40, "Estación del año", { color: COL.txt2, fuente: fuente(17) });
    L.texto(W / 2, 64, "Elija una fecha para verla", { color: COL.muted, fuente: fuente(13, false) });
    return;
  }
  const nombre = estacionNombre(franja, lat);
  ({ Verano: escenaVerano, Invierno: escenaInvierno, Primavera: escenaPrimavera, "Otoño": escenaOtono })[nombre](L, W, H);
  const hemis = lat >= 0 ? "Hemisferio Norte" : "Hemisferio Sur";
  const f1_ = fuente(20), f2_ = fuente(12);
  const t2 = `${hemis}  ·  ${ESTACION[franja]}`;
  const w = Math.max(L.medir(nombre, f1_), L.medir(t2, f2_)) + 28;
  L.redondeado(12, 12, 12 + w, 70, 12, { relleno: "#fff" });
  L.texto(26, 32, nombre, { anchor: "w", color: COLOR_ESTACION[nombre], fuente: f1_ });
  L.texto(26, 56, t2, { anchor: "w", color: COL.txt2, fuente: f2_ });
}

function arbol(L, x, base, alto, copa, tronco = "#7a4b2a") {
  L.rect(x - 4, base - alto * 0.45, x + 4, base, { relleno: tronco });
  const r = alto * 0.38, cy = base - alto * 0.62;
  L.ovalo(x - r, cy - r, x + r, cy + r, { relleno: copa });
  L.ovalo(x - r * 1.2, cy - r * 0.2, x - r * 0.1, cy + r * 0.8, { relleno: copa });
  L.ovalo(x + r * 0.1, cy - r * 0.2, x + r * 1.2, cy + r * 0.8, { relleno: copa });
}
function pino(L, x, base, alto, nieve) {
  for (let k = 0; k < 3; k++) {
    const yTop = base - alto + k * alto * 0.25, ancho = alto * (0.22 + k * 0.1), yBot = yTop + alto * 0.42;
    L.poligono([x, yTop, x - ancho, yBot, x + ancho, yBot], { relleno: "#24573a" });
    if (nieve) L.poligono([x, yTop, x - ancho * 0.45, yTop + alto * 0.19, x + ancho * 0.45, yTop + alto * 0.19], { relleno: "#fff" });
  }
  L.rect(x - 3, base - alto * 0.1, x + 3, base, { relleno: "#6b4a2a" });
}
function escenaVerano(L, W, H) {
  L.degradado(0, 0, W, H, "#3ea6f2", "#c4e8ff");
  const sx = W - 60, sy = 40;
  for (let a = 0; a < 360; a += 30)
    L.linea([sx + 26 * Math.cos(rad(a)), sy + 26 * Math.sin(rad(a)), sx + 40 * Math.cos(rad(a)), sy + 40 * Math.sin(rad(a))],
            { color: "#ffb300", ancho: 4, cap: "round" });
  L.ovalo(sx - 22, sy - 22, sx + 22, sy + 22, { relleno: "#ffd23f", borde: "#ffb300", ancho: 2 });
  L.poligono([-5, H, -5, 84, W * 0.35, 70, W * 0.7, 88, W + 5, 76, W + 5, H], { relleno: "#86c95e", suave: true });
  L.poligono([-5, H, -5, 100, W * 0.5, 92, W + 5, 104, W + 5, H], { relleno: "#5fae45", suave: true });
  arbol(L, W * 0.58, 96, 56, "#3f8f3a");
  for (let x = 30; x < W; x += 46) L.ovalo(x - 3, H - 12, x + 3, H - 6, { relleno: "#ffe14d" });
}
function escenaInvierno(L, W, H) {
  L.degradado(0, 0, W, H, "#9fb6cf", "#e9f0f7");
  L.ovalo(W - 80, 24, W - 52, 52, { relleno: "#f4f6f8" });
  L.poligono([-5, 92, W * 0.25, 46, W * 0.45, 80, W * 0.65, 40, W * 0.9, 76, W + 5, 60, W + 5, 100, -5, 100], { relleno: "#c3d1e1" });
  L.poligono([W * 0.25, 46, W * 0.2, 56, W * 0.3, 56], { relleno: "#fff" });
  L.poligono([W * 0.65, 40, W * 0.6, 51, W * 0.7, 51], { relleno: "#fff" });
  L.poligono([-5, H, -5, 92, W * 0.5, 86, W + 5, 94, W + 5, H], { relleno: "#fff", suave: true });
  for (const [x, a] of [[W * 0.55, 54], [W * 0.62, 42], [W * 0.86, 50], [W * 0.93, 38]]) pino(L, x, 104, a, true);
  let i = 0;
  for (let x = 20; x < W; x += 34, i++) {
    const y = 18 + (i * 23) % 70;
    for (const a of [0, 60, 120])
      L.linea([x - 4 * Math.cos(rad(a)), y - 4 * Math.sin(rad(a)), x + 4 * Math.cos(rad(a)), y + 4 * Math.sin(rad(a))], { color: "#fff" });
  }
}
function escenaPrimavera(L, W, H) {
  L.degradado(0, 0, W, H, "#8bd0fb", "#e6f7ff");
  L.ovalo(W - 76, 22, W - 44, 54, { relleno: "#ffe27a" });
  L.poligono([-5, H, -5, 82, W * 0.4, 68, W * 0.8, 86, W + 5, 78, W + 5, H], { relleno: "#9fdc84", suave: true });
  L.poligono([-5, H, -5, 98, W * 0.5, 90, W + 5, 100, W + 5, H], { relleno: "#72c35f", suave: true });
  const x = W * 0.6;
  L.rect(x - 4, 66, x + 4, 98, { relleno: "#7a4b2a" });
  for (const [dx, dy, r] of [[0, 48, 20], [-18, 58, 15], [18, 58, 15], [-8, 38, 13], [10, 38, 13]])
    L.ovalo(x + dx - r, dy - r, x + dx + r, dy + r, { relleno: "#f9a8d4" });
  const colores = ["#ec4899", "#facc15", "#ffffff", "#a855f7"];
  let i = 0;
  for (let fx = 18; fx < W; fx += 30, i++) {
    const fy = H - 10 - (i % 3) * 5;
    L.linea([fx, fy, fx, fy + 8], { color: "#3f8f3a", ancho: 2 });
    for (let a = 0; a < 360; a += 72) {
      const px = fx + 4 * Math.cos(rad(a)), py = fy + 4 * Math.sin(rad(a));
      L.ovalo(px - 3, py - 3, px + 3, py + 3, { relleno: colores[i % 4] });
    }
    L.ovalo(fx - 2, fy - 2, fx + 2, fy + 2, { relleno: "#f59e0b" });
  }
}
function escenaOtono(L, W, H) {
  L.degradado(0, 0, W, H, "#f7a95e", "#fde6c6");
  L.ovalo(W - 78, 26, W - 48, 56, { relleno: "#ffd27a" });
  L.poligono([-5, H, -5, 84, W * 0.4, 72, W * 0.75, 88, W + 5, 80, W + 5, H], { relleno: "#c9813f", suave: true });
  L.poligono([-5, H, -5, 100, W * 0.5, 92, W + 5, 102, W + 5, H], { relleno: "#a65a2a", suave: true });
  arbol(L, W * 0.58, 98, 58, "#e8761c", "#5e3a1e");
  arbol(L, W * 0.82, 100, 46, "#d9531e", "#5e3a1e");
  let i = 0;
  for (let x = 24; x < W; x += 38, i++) {
    const y = 30 + (i * 29) % 70;
    L.ovalo(x - 5, y - 3, x + 5, y + 3, { relleno: ["#e8761c", "#c2410c", "#f59e0b"][i % 3] });
  }
}

/* =================================================================
   HELIODON INCLINADO (vista lateral)
   s = angulo con signo: + hacia el Sur (derecha), - hacia el Norte (izquierda)
   ================================================================= */
const HELIO_W = 380, HELIO_H = 330;

function dibujarHeliodon(canvas, s, encendido = true) {
  const L = new Lienzo(canvas, HELIO_W, HELIO_H);
  const W = HELIO_W, cx = W / 2, cy = 168, R = 108, suelo = cy + R + 14;
  const activo = s != null;
  const ang = activo ? Math.abs(s) : 0, signo = !activo || ang < 0.05 ? 0 : Math.sign(s);

  // escala graduada (transportador)
  const RS = R + 14;
  L.arco(cx - RS, cy - RS, cx + RS, cy + RS, 0, 180, { borde: "#c7d2e0", ancho: 2 });
  for (let th = -90; th <= 90; th += 10) {
    const ux = Math.sin(rad(th)), uy = -Math.cos(rad(th));
    const largo = th % 30 === 0 ? 9 : 5;
    L.linea([cx + (RS - largo) * ux, cy + (RS - largo) * uy, cx + RS * ux, cy + RS * uy],
            { color: "#9fb0c6", ancho: th % 30 === 0 ? 2 : 1 });
    if (th % 30 === 0)
      L.texto(cx + (RS + 14) * ux, cy + (RS + 12) * uy, `${Math.abs(th)}°`, { color: COL.muted, fuente: fuente(11) });
  }
  L.linea([cx, cy, cx, cy - RS], { color: "#b7c3d3", dash: [4, 4] });

  // suelo
  L.linea([12, suelo, W - 12, suelo], { color: "#8d9aab", ancho: 2 });
  for (let x = 18; x < W - 12; x += 14) L.linea([x, suelo + 1, x - 7, suelo + 8], { color: "#c3ccd8" });

  // estructura
  const acero = "#3a4049";
  L.linea([cx - 66, suelo, cx - 66, cy + 10], { color: acero, ancho: 6 });
  L.linea([cx + 66, suelo, cx + 66, cy + 10], { color: acero, ancho: 6 });
  L.linea([cx - 80, cy + 10, cx + 80, cy + 10], { color: acero, ancho: 6 });
  L.linea([cx - 66, suelo - 24, cx + 66, suelo - 24], { color: acero, ancho: 5 });
  L.linea([cx - 86, suelo - 2, cx + 86, suelo - 2], { color: acero, ancho: 6 });

  // anillo
  const a = rad(activo ? s : 0);
  const u = [Math.sin(a), -Math.cos(a)], v = [Math.cos(a), Math.sin(a)], r2 = 40;
  const punto = t => [cx + R * Math.cos(t) * u[0] + r2 * Math.sin(t) * v[0],
                      cy + R * Math.cos(t) * u[1] + r2 * Math.sin(t) * v[1]];
  const atras = [], frente = [];
  for (let k = 0; k <= 180; k += 6) atras.push(...punto(rad(k)));
  for (let k = 180; k <= 360; k += 6) frente.push(...punto(rad(k)));
  const tx = cx + (R - 4) * u[0], ty = cy + (R - 4) * u[1];
  const bx = cx + (R - 20) * u[0], by = cy + (R - 20) * u[1];
  const on = activo && encendido;

  L.linea(atras, { color: "#b9c2cd", ancho: 6, suave: true, cap: "round" });
  if (on) {
    L.poligono([bx, by, cx - 46, cy, cx + 46, cy], { relleno: "#fff0c2" });
    L.linea([bx, by, cx, cy - 2], { color: "#f5b400", ancho: 2, dash: [5, 4] });
  }
  // mesa y maqueta
  L.linea([cx - 26, cy + 8, cx + 26, suelo - 26], { color: "#2f343b", ancho: 3 });
  L.linea([cx + 26, cy + 8, cx - 26, suelo - 26], { color: "#2f343b", ancho: 3 });
  L.ovalo(cx - 56, cy - 2, cx + 56, cy + 14, { relleno: "#b9824c" });
  L.ovalo(cx - 56, cy - 7, cx + 56, cy + 9, { relleno: "#d9a46b", borde: "#b9824c" });
  if (on && signo !== 0) {
    const largo = Math.min(34, 10 * Math.tan(rad(ang)) + 6), sxm = cx - signo * (6 + largo / 2);
    L.ovalo(sxm - largo / 2 - 6, cy - 3, sxm + largo / 2 + 6, cy + 4, { relleno: "#a77a4a" });
  }
  L.rect(cx - 7, cy - 14, cx + 7, cy - 2, { relleno: "#fff", borde: "#6b7787" });
  L.poligono([cx - 9, cy - 14, cx, cy - 22, cx + 9, cy - 14], { relleno: COL.rojo, borde: "#9b1c22" });

  L.linea(frente, { color: activo ? "#7f8b99" : "#b7c0cb", ancho: 8, suave: true, cap: "round" });
  L.linea(frente, { color: "#e3e8ee", ancho: 3, suave: true, cap: "round" });
  L.ovalo(cx - 9, cy + 1, cx + 9, cy + 19, { relleno: acero });
  L.ovalo(cx - 4, cy + 6, cx + 4, cy + 14, { relleno: "#aab3bd" });

  // soporte del foco y bombilla
  const hx = 14 * v[0], hy = 14 * v[1], ux4 = 5 * u[0], uy4 = 5 * u[1];
  L.poligono([tx - hx - ux4, ty - hy - uy4, tx + hx - ux4, ty + hy - uy4, tx + hx + ux4, ty + hy + uy4, tx - hx + ux4, ty - hy + uy4],
             { relleno: "#2b3036" });
  L.linea([tx, ty, bx, by], { color: "#2b3036", ancho: 3 });
  if (on) for (const [rr, t] of [[20, 0.8], [15, 0.6]])
    L.ovalo(bx - rr, by - rr, bx + rr, by + rr, { relleno: mezclar("#ffd23f", "#ffffff", t) });
  L.ovalo(bx - 9, by - 9, bx + 9, by + 9, { relleno: on ? "#ffd23f" : "#dfe5ee", borde: on ? "#e09b00" : "#a9b4c3", ancho: 2 });

  // arco y valor del angulo
  if (activo && signo !== 0) {
    const ra = 62, inicio = signo < 0 ? 90 : 90 - ang;
    L.arco(cx - ra, cy - ra, cx + ra, cy + ra, inicio, ang, { borde: "#e08a00", ancho: 4 });
    let px, py;
    if (ang >= 40) { const mid = rad(ang / 2) * signo; px = cx + 84 * Math.sin(mid); py = cy - 84 * Math.cos(mid); }
    else { px = cx - signo * 40; py = cy - 78; }
    L.pastilla(px, py, `${f1(ang)}°`, fuente(15), "#fff", "#9a6700", { borde: "#f3c766", alto: 28, padx: 9 });
  }

  // Norte / Sur
  const yb = suelo + 22;
  L.redondeado(12, yb - 13, 112, yb + 13, 13, { relleno: COL.azul });
  L.poligono([22, yb, 32, yb - 7, 32, yb + 7], { relleno: "#fff" });
  L.texto(72, yb, "NORTE", { color: "#fff", fuente: fuente(13) });
  L.redondeado(W - 112, yb - 13, W - 12, yb + 13, 13, { relleno: COL.rojo });
  L.poligono([W - 22, yb, W - 32, yb - 7, W - 32, yb + 7], { relleno: "#fff" });
  L.texto(W - 68, yb, "SUR", { color: "#fff", fuente: fuente(13) });
  L.texto(W / 2, yb, "vista lateral", { color: COL.muted, fuente: fuente(12, false) });
}

/* =================================================================
   EL SOL SOBRE UNA CASA (misma inclinacion que el anillo)
   ================================================================= */
const SOL_H = 160;

function dibujarSolCasa(canvas, s) {
  const L = new Lienzo(canvas, null, SOL_H);
  const W = L.W, H = SOL_H, suelo = H - 24, cx = W / 2, activo = s != null;
  if (activo) {
    const altura = 90 - Math.abs(s);
    const arriba = altura < 25 ? mezclar("#2f8fe0", "#f7a24b", (25 - altura) / 25) : "#2f8fe0";
    L.degradado(0, 0, W, suelo, arriba, "#cfe9fb");
  } else L.degradado(0, 0, W, suelo, "#dfe6ef", "#f2f5f9");
  L.rect(0, suelo, W, H, { relleno: "#7cbf5a" });
  L.rect(0, suelo, W, suelo + 3, { relleno: "#5fa645" });

  const hw = 22, hh = 26, base = suelo;
  if (activo && Math.abs(s) > 0.5) {
    const largo = Math.min(W / 2 - 4, (hh + 12) * Math.tan(rad(Math.min(Math.abs(s), 88))));
    const lado = s > 0 ? -1 : 1, x0 = cx + lado * hw * 0.2, x1 = cx + lado * (hw + largo);
    L.poligono([x0, base, x1, base, x1, base + 9, x0, base + 9], { relleno: "#4f8a3b" });
  }
  L.rect(cx - hw, base - hh, cx + hw, base, { relleno: "#f4ead7", borde: "#b9a27c" });
  L.poligono([cx - hw - 6, base - hh, cx, base - hh - 20, cx + hw + 6, base - hh], { relleno: COL.rojo, borde: "#9b1c22" });
  L.rect(cx - 6, base - 15, cx + 6, base, { relleno: "#8a5a33" });
  L.rect(cx - hw + 5, base - hh + 6, cx - hw + 13, base - hh + 13, { relleno: "#9fd3f2", borde: "#7a8ea6" });
  L.rect(cx + hw - 13, base - hh + 6, cx + hw - 5, base - hh + 13, { relleno: "#9fd3f2", borde: "#7a8ea6" });
  L.texto(10, H - 11, "◂ NORTE", { anchor: "w", color: "#fff", fuente: fuente(11) });
  L.texto(W - 10, H - 11, "SUR ▸", { anchor: "e", color: "#fff", fuente: fuente(11) });

  if (!activo) {
    L.texto(cx, 30, "El Sol al mediodía", { color: COL.txt2, fuente: fuente(13) });
    L.texto(cx, 50, "Elija una fecha", { color: COL.muted, fuente: fuente(12, false) });
    return;
  }
  const oy = base - hh / 2, r = Math.min(W / 2 - 22, oy - 18);
  L.arco(cx - r, oy - r, cx + r, oy + r, 0, 180, { borde: "#ffffff", dash: [3, 4] });
  const sx = cx + r * Math.sin(rad(s)), sy = oy - r * Math.cos(rad(s));
  L.linea([sx, sy, cx, base - hh - 8], { color: "#ffd23f", ancho: 2, dash: [5, 3] });
  for (const [rr, t] of [[24, 0.75], [18, 0.5]]) L.ovalo(sx - rr, sy - rr, sx + rr, sy + rr, { relleno: mezclar("#ffd23f", "#cfe9fb", t) });
  for (let a = 0; a < 360; a += 45)
    L.linea([sx + 15 * Math.cos(rad(a)), sy + 15 * Math.sin(rad(a)), sx + 20 * Math.cos(rad(a)), sy + 20 * Math.sin(rad(a))],
            { color: "#ffb300", ancho: 2 });
  L.ovalo(sx - 12, sy - 12, sx + 12, sy + 12, { relleno: "#ffd23f", borde: "#f0a500", ancho: 2 });
  const corto = W < 250;
  const ladoSol = s > 0.5 ? (corto ? "Al SUR" : "Sol hacia el SUR")
    : (s < -0.5 ? (corto ? "Al NORTE" : "Sol hacia el NORTE") : (corto ? "Encima" : "Sol justo encima"));
  L.pastilla(8, 16, `${ladoSol} · ${corto ? "" : "altura "}${f1(90 - Math.abs(s))}°`, fuente(11), "#fff", COL.txt, { anchor: "w", alto: 22, padx: 8 });
}

/* =================================================================
   DIAGRAMA: la Tierra, los rayos del Sol y el angulo theta
   ================================================================= */
function dibujarDiagramaTierra(canvas, lat, decl, ciudad) {
  const W = 360, H = 260;
  const L = new Lienzo(canvas, W, H);
  const cx = 150, cy = 132, R = 92;
  L.rect(0, 0, W, H, { relleno: "#0f1f3d" });
  for (const [x, y] of [[20, 20], [60, 230], [300, 30], [340, 210], [250, 240], [110, 16]])
    L.ovalo(x - 1, y - 1, x + 1, y + 1, { relleno: "#ffffff" });
  // rayos del Sol (llegan desde la derecha, paralelos)
  for (let k = -3; k <= 3; k++) {
    const y = cy + k * 28;
    L.linea([W - 6, y, cx + Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) + 4, y], { color: "#ffcf4d", ancho: 2 });
    L.poligono([cx + Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) + 4, y, cx + Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) + 12, y - 4,
                cx + Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) + 12, y + 4], { relleno: "#ffcf4d" });
  }
  L.texto(W - 10, 16, "Rayos del Sol", { anchor: "e", color: "#ffcf4d", fuente: fuente(12) });
  // Tierra: el punto de latitud L esta en el angulo (L - decl) medido desde el rayo
  L.ovalo(cx - R, cy - R, cx + R, cy + R, { relleno: "#2f7fd1", borde: "#a9cdf5", ancho: 2 });
  L.ovalo(cx - R * 0.55, cy - R * 0.5, cx - R * 0.05, cy + R * 0.2, { relleno: "#4ea35a" });
  L.ovalo(cx + R * 0.05, cy + R * 0.05, cx + R * 0.6, cy + R * 0.7, { relleno: "#4ea35a" });
  const pos = (latG, r = R) => [cx + r * Math.cos(rad(latG - decl)), cy - r * Math.sin(rad(latG - decl))];
  // ecuador y eje
  const e1 = pos(0, R), e2 = [2 * cx - e1[0], 2 * cy - e1[1]];
  L.linea([e2[0], e2[1], e1[0], e1[1]], { color: "#ffffff", ancho: 1.5, dash: [5, 4] });
  const n1 = pos(90, R + 16), n2 = pos(-90, R + 16);
  L.linea([n2[0], n2[1], n1[0], n1[1]], { color: "#cfe0f7", ancho: 1.5 });
  L.texto(n1[0], n1[1] - 8, "N", { color: "#cfe0f7", fuente: fuente(12) });
  L.texto(n2[0], n2[1] + 9, "S", { color: "#cfe0f7", fuente: fuente(12) });
  const et = pos(0, R - 26);
  L.texto(et[0] - 6, et[1] - 9, "Ecuador", { color: "#ffffff", fuente: fuente(10), anchor: "e" });
  // punto donde el Sol esta vertical (latitud = declinacion)
  const sp = pos(decl);
  L.ovalo(sp[0] - 5, sp[1] - 5, sp[0] + 5, sp[1] + 5, { relleno: "#ffcf4d", borde: "#ffffff" });
  // observador
  const ob = pos(lat), z = pos(lat, R + 62);
  L.linea([ob[0], ob[1], z[0], z[1]], { color: "#ffffff", ancho: 2 });
  L.texto(z[0] + (z[0] < cx ? -4 : 4), z[1] - 9, "cenit", { color: "#ffffff", fuente: fuente(11), anchor: z[0] < cx ? "e" : "w" });
  const sol = [ob[0] + 60, ob[1]];
  L.linea([ob[0], ob[1], sol[0], sol[1]], { color: "#ffcf4d", ancho: 2, dash: [4, 3] });
  const th = lat - decl;                 // angulo entre cenit y rayo
  const start = 0, ext = th;             // desde el rayo (0°) hasta el cenit (th)
  if (Math.abs(th) > 0.5) L.arco(ob[0] - 30, ob[1] - 30, ob[0] + 30, ob[1] + 30, start, ext, { borde: "#ff8a3d", ancho: 3 });
  L.ovalo(ob[0] - 6, ob[1] - 6, ob[0] + 6, ob[1] + 6, { relleno: COL.rojo, borde: "#ffffff", ancho: 2 });
  L.pastilla(ob[0] + 44, ob[1] + (th >= 0 ? -22 : 22), `θ = ${f1(Math.abs(th))}°`, fuente(12), "#ff8a3d", "#ffffff", { alto: 22, padx: 7 });
  L.pastilla(12, H - 18, `${ciudad}: φ = ${f1(Math.abs(lat))}° ${lat >= 0 ? "N" : "S"}`, fuente(11), "#ffffff", COL.rojo, { anchor: "w", alto: 22, padx: 8 });
  L.pastilla(W - 12, H - 18, `Sol vertical en δ = ${f1(decl)}°`, fuente(11), "#ffcf4d", "#3b2500", { anchor: "e", alto: 22, padx: 8 });
}


/* =================================================================
   EJEMPLO EN BOLIVIA: el alero de una casa en Cochabamba
   (angulos de invierno y verano calculados con tablaEstaciones)
   ================================================================= */
function dibujarAlero(canvas, lat) {
  const L = new Lienzo(canvas, null, 230);
  const W = L.W, H = 230, suelo = H - 30;
  const t = tablaEstaciones(lat);
  const verano = t[0], invierno = t[2];
  // altura del Sol (grados sobre el horizonte) y lado (+1 Sur, -1 Norte)
  const alt = (x) => 90 - x.ang;
  const lado = (x) => (x.lado === "Sur" ? 1 : x.lado === "Norte" ? -1 : 0);

  L.degradado(0, 0, W, suelo, "#7fc0ef", "#d9effb");
  L.rect(0, suelo, W, H, { relleno: "#7cbf5a" });
  L.texto(12, H - 14, "NORTE", { anchor: "w", color: "#fff", fuente: fuente(12) });
  L.texto(W - 12, H - 14, "SUR", { anchor: "e", color: "#fff", fuente: fuente(12) });

  // casa: muro norte a la izquierda con ventana, alero hacia el norte
  const x0 = W * 0.5, x1 = Math.min(W - 20, x0 + 150), techo = suelo - 100, alero = 26;
  const vTop = techo + 22, vBot = techo + 66;
  L.rect(x0, techo, x1, suelo, { relleno: "#f4ead7", borde: "#b9a27c", ancho: 2 });
  L.rect(x0 - alero, techo - 10, x1 + 10, techo, { relleno: "#d7262f" });
  L.rect(x0 - 3, vTop, x0 + 5, vBot, { relleno: "#9fd3f2", borde: "#7a8ea6" });

  // invierno: Sol bajo hacia el norte -> entra por la ventana y llega al piso
  const aI = rad(alt(invierno)), dI = [-lado(invierno) * Math.cos(aI), Math.sin(aI)];   // direccion del rayo (hacia abajo)
  const objetivo = [x0 + 2, (vTop + vBot) / 2];
  const largo = (objetivo[1] - 74) / dI[1], sI = [objetivo[0] - dI[0] * largo, objetivo[1] - dI[1] * largo];
  const kPiso = (suelo - objetivo[1]) / dI[1], piso = [objetivo[0] + dI[0] * kPiso, suelo];
  L.poligono([objetivo[0], vTop + 4, objetivo[0], vBot - 4, piso[0] + 30, suelo - 2, piso[0] - 4, suelo - 2], { relleno: "#fff1c2" });
  L.linea([sI[0], sI[1], objetivo[0], objetivo[1], piso[0], piso[1]], { color: "#f08c00", ancho: 3, dash: [6, 4] });
  L.ovalo(sI[0] - 14, sI[1] - 14, sI[0] + 14, sI[1] + 14, { relleno: "#ffd23f", borde: "#f0a500", ancho: 2 });
  const wI = L.pastilla(8, 18, `Invierno (21/06): Sol a ${f1(alt(invierno))}°`, fuente(11), "#fff", "#b35c00", { anchor: "w", alto: 22, padx: 7, borde: "#f08c00" });

  // verano: Sol casi vertical -> el techo y el alero dan sombra a la ventana
  const aV = rad(alt(verano)), dV = [-lado(verano) * Math.cos(aV), Math.sin(aV)];
  const golpe = [x0 - alero + 14, techo - 10];
  const kV = (golpe[1] - 74) / dV[1];                     // el Sol queda dentro del dibujo
  const sV = [golpe[0] - dV[0] * kV, golpe[1] - dV[1] * kV];
  L.linea([sV[0], sV[1], golpe[0], golpe[1]], { color: "#d7262f", ancho: 3, dash: [6, 4] });
  L.ovalo(sV[0] - 14, sV[1] - 14, sV[0] + 14, sV[1] + 14, { relleno: "#ffd23f", borde: "#f0a500", ancho: 2 });
  L.pastilla(8, 44, `Verano (21/12): Sol a ${f1(alt(verano))}°`, fuente(11), "#fff", "#9b1c22", { anchor: "w", alto: 22, padx: 7, borde: "#d7262f" });
  L.rect(x0 - alero, suelo - 4, x0, suelo, { relleno: "#4f8a3b" });
}
