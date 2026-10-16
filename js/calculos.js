/* =================================================================
   SIMULADOR SOLAR - Calculos (copia fiel de simulador_solar_app.py)
   Mismos datos, mismas formulas y mismas reglas que el programa de PC.
   ================================================================= */
"use strict";

const DIAS_MES = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Cada pais usa una ciudad de referencia para la latitud y la temperatura.
//   lat  : + Norte / - Sur
//   temp : temperatura promedio mensual aprox. (grados C), indice 1..12
const PAISES = {
  1: { nombre: "Bolivia",  ref: "Cochabamba", lat: -18.0,
       temp: [null, 19, 19, 19, 18, 16, 15, 15, 17, 19, 20, 20, 19] },
  2: { nombre: "Colombia", ref: "Bogotá",     lat: 5.0,
       temp: [null, 14, 14, 15, 15, 15, 14, 14, 14, 14, 14, 14, 14] },
  3: { nombre: "Ecuador",  ref: "Quito",      lat: -0.2,
       temp: [null, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14] },
  4: { nombre: "España",   ref: "Madrid",     lat: 40.0,
       temp: [null,  6,  8, 11, 13, 17, 22, 26, 25, 21, 15,  9,  6] },
  5: { nombre: "Noruega",  ref: "Oslo",       lat: 60.0,
       temp: [null, -4, -4, -1,  5, 11, 15, 17, 16, 11,  6,  1, -3] },
};
const PAIS_DEFECTO = 1;   // Bolivia

const ESTACION = {
  1: "21-Sep al 21-Dic",
  2: "22-Dic al 21-Mar",
  3: "22-Mar al 21-Jun",
  4: "22-Jun al 20-Sep",
};

const DECL_JUNIO = 23.45;       // solsticio de junio (21/06)
const DECL_EQUINOCIO = 0.0;     // equinoccios (21/03 y 23/09)
const DECL_DICIEMBRE = -23.45;  // solsticio de diciembre (21/12)

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const rad = (g) => g * Math.PI / 180;

function diaDelAnio(dia, mes) {
  let s = 0;
  for (let m = 1; m < mes; m++) s += DIAS_MES[m];
  return dia + s;
}

function fechaValida(dia, mes) {
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > DIAS_MES[mes]) return false;
  return true;
}

/** Ecuacion de Cooper. */
function declinacionSolar(n) {
  const ang = (360.0 / 365.0) * (284 + n);
  return 23.45 * Math.sin(rad(ang));
}

/** Angulo del anillo respecto a la vertical. Devuelve [angulo, lado]. */
function inclinacionAnillo(lat, decl) {
  const d = lat - decl;
  if (Math.abs(d) < 0.5) return [0.0, ""];      // menos de medio grado: vertical
  return [Math.abs(d), d > 0 ? "Sur" : "Norte"];
}

/** Igual que f"{x:.1f}" de Python (redondeo al par en empates exactos). */
function f1(x) {
  // Empate exacto (x termina en .25 o .75 exactos): Python redondea al par.
  if (Number.isInteger(x * 4) && !Number.isInteger(x * 2)) {
    const abajo = Math.floor(x * 10) / 10, arriba = Math.ceil(x * 10) / 10;
    return (Math.round(abajo * 10) % 2 === 0 ? abajo : arriba).toFixed(1);
  }
  return x.toFixed(1);
}

function textoInclinacion(angulo, lado) {
  if (!lado) return "0° (vertical)";
  return `${f1(angulo)}° hacia el ${lado}`;
}

function textoLatitud(lat) {
  return `${String(Math.abs(lat))}° ${lat >= 0 ? "N" : "S"}`;
}

function determinarEstacion(dia, mes) {
  const n = diaDelAnio(dia, mes);
  if (n >= 264 && n <= 355) return 1;
  if (n >= 356 || n <= 80) return 2;
  if (n >= 81 && n <= 172) return 3;
  return 4;
}

function estacionNombre(franja, lat) {
  const norte = { 1: "Otoño", 2: "Invierno", 3: "Primavera", 4: "Verano" };
  const sur = { 1: "Primavera", 2: "Verano", 3: "Otoño", 4: "Invierno" };
  return (lat >= 0 ? norte : sur)[franja];
}

function tablaEstaciones(lat) {
  let verano, invierno;
  if (lat >= 0) {
    verano = ["Verano", "solsticio 21/06", DECL_JUNIO];
    invierno = ["Invierno", "solsticio 21/12", DECL_DICIEMBRE];
  } else {
    verano = ["Verano", "solsticio 21/12", DECL_DICIEMBRE];
    invierno = ["Invierno", "solsticio 21/06", DECL_JUNIO];
  }
  const equinoccio = ["Equinoccio", "21/03 y 23/09", DECL_EQUINOCIO];
  return [verano, equinoccio, invierno].map(([nombre, fechas, decl]) => {
    const [ang, lado] = inclinacionAnillo(lat, decl);
    return { nombre, fechas, ang, lado };
  });
}

/** Todo el resultado de una simulacion (lo mismo que muestra la PC). */
function simular(paisId, dia, mes) {
  const p = PAISES[paisId];
  const n = diaDelAnio(dia, mes);
  const decl = declinacionSolar(n);
  const [ang, lado] = inclinacionAnillo(p.lat, decl);
  const franja = determinarEstacion(dia, mes);
  return {
    paisId, pais: p, dia, mes, n, decl, ang, lado, franja,
    estacion: estacionNombre(franja, p.lat),
    temp: p.temp[mes],
    texto: textoInclinacion(ang, lado),
    signo: lado === "Sur" ? 1 : (lado === "Norte" ? -1 : 0),
  };
}

if (typeof module !== "undefined") {
  module.exports = { DIAS_MES, PAISES, ESTACION, diaDelAnio, fechaValida, declinacionSolar,
    inclinacionAnillo, textoInclinacion, textoLatitud, determinarEstacion, estacionNombre,
    tablaEstaciones, simular, f1 };
}
