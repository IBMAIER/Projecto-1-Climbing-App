// ui.js: piezas de interfaz compartidas entre pantallas
// (tarjeta de sesión, detalle completo y planificación de un día).

import {
  TIPOS_BLOQUE, PLANTILLAS, PARTES_CALENTAMIENTO, GRADOS, VIAS,
  intensidad, intensidadBloque, duracionTotal, gradoMaximo, viaMaxima, formatoFecha,
} from "./calculos.js";

export const RESULTADOS = { cumplido: "Cumplido", medias: "A medias", no: "No cumplido" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function nombreSesion(s) {
  const p = PLANTILLAS[s.tipo] || PLANTILLAS.libre;
  return { nombre: p.nombre, icono: p.icono };
}

function listaGrados(grados) {
  return GRADOS.filter((g) => grados?.[g]).map((g) => `${g}×${grados[g]}`).join(", ");
}

function listaVias(vias) {
  return VIAS.filter((x) => vias?.[x.yds]).map((x) => `${x.yds}×${vias[x.yds]}`).join(", ");
}

const AGARRE = { half_crimp: "Half crimp", pinza: "Pinza" };

// Líneas de texto que describen el contenido de un bloque.
export function describirBloque(b) {
  const l = [];
  switch (b.tipo) {
    case "calentamiento": {
      const hechas = PARTES_CALENTAMIENTO.filter(([k]) => b.partes?.includes(k)).map(([, t]) => t);
      if (hechas.length) l.push(hechas.join(" · "));
      break;
    }
    case "dedos":
      if (b.regletaMm) l.push(`Regleta ${b.regletaMm} mm`);
      (b.series || []).forEach((x, i) =>
        l.push(`Serie ${i + 1}: ${AGARRE[x.agarre] || x.agarre} ${x.kg} kg × ${x.seg} s (margen ${x.margenSeg} s)`));
      break;
    case "board":
      l.push(`${b.tablero || ""} ${b.angulo != null ? `${b.angulo}°` : ""}`.trim());
      if (b.gradoTrabajado) l.push(`Trabajado sin encadenar: ${b.gradoTrabajado}`);
      break;
    case "boulder":
      if (b.estilos?.length) l.push(`Estilos: ${b.estilos.join(", ")}`);
      if (b.proyecto) l.push(`Proyecto: ${b.proyecto}${b.avance ? ` — ${b.avance}` : ""}`);
      break;
    case "resistencia":
      l.push(`Formato ${b.formato === "vias" ? "vías" : b.formato} · ${b.rondas ?? "?"} rondas · descanso ${b.descansoMin ?? "?"} min · ${b.caidas ?? 0} caídas`);
      break;
    case "roca":
      if (b.lugar) l.push(b.lugar);
      break;
    case "fisico":
      l.push(`Rutina ${b.variante || ""} · trote ${b.troteMin ?? 0} min`);
      (b.ejercicios || []).forEach((x) =>
        l.push(`${x.grupo}${x.ejercicio ? ` (${x.ejercicio})` : ""}: ${x.series}×${x.reps}${x.peso ? ` @ ${x.peso} kg` : ""}`));
      break;
    case "test":
      if (b.halfCrimpKg != null) l.push(`Half crimp 10 s: ${b.halfCrimpKg} kg${b.regletaMm ? ` (${b.regletaMm} mm)` : ""}`);
      if (b.pinzaKg != null) l.push(`Pinza: ${b.pinzaKg} kg`);
      if (b.boardMax) l.push(`Board máx: ${b.boardMax}${b.boardAngulo ? ` a ${b.boardAngulo}°` : ""}`);
      if (b.pesoCorporal) l.push(`Peso corporal: ${b.pesoCorporal} kg`);
      break;
    case "otro":
      if (b.nombre) l.push(b.nombre);
      break;
  }
  if (b.grados && Object.keys(b.grados).length) l.push(`Bloques: ${listaGrados(b.grados)}`);
  if (b.vias && Object.keys(b.vias).length) l.push(`Vías: ${listaVias(b.vias)}`);
  if (b.nota) l.push(`“${b.nota}”`);
  return l.filter(Boolean);
}

// Tarjeta resumida (Hoy e Historial).
export function tarjetaSesion(s) {
  const { nombre, icono } = nombreSesion(s);
  const inten = intensidad(s);
  const max = gradoMaximo(...(s.bloques || []));
  const via = viaMaxima(...(s.bloques || []));
  const datos = [];
  if (inten != null) datos.push(`Intensidad <b>${inten}</b>`);
  if (max) datos.push(`Máx <b>${max}</b>`);
  if (via) datos.push(`Vía <b>${via}</b>`);
  if (s.codo != null) datos.push(`Codo <b>${s.codo}</b>${s.codoDiaSiguiente != null ? `→<b>${s.codoDiaSiguiente}</b>` : ""}`);
  const dur = duracionTotal(s);
  if (dur) datos.push(`${dur} min`);
  const bloques = (s.bloques || []).map((b) => TIPOS_BLOQUE[b.tipo]?.icono || "•").join(" ");

  return `
    <a class="tarjeta sesion" href="#editar/${s.id}">
      <div class="sesion-cabecera">
        <span>${icono} <b>${nombre}</b> <span class="iconos-bloques">${bloques}</span></span>
        <span class="fecha">${formatoFecha(s.fecha)}</span>
      </div>
      <div class="sesion-datos">${datos.join(" · ")}</div>
      ${insignia(s.resultado)}
      ${s.nota ? `<p class="nota">${esc(s.nota)}</p>` : ""}
    </a>`;
}

export function insignia(resultado) {
  return resultado
    ? `<span class="insignia ${resultado}">${RESULTADOS[resultado]}</span>`
    : `<span class="insignia pendiente">Sin resultado</span>`;
}

function objetivoHTML(p) {
  if (!p?.objetivo) return "";
  return `<div class="objetivo">
    <div><small>Objetivo</small> ${esc(p.objetivo)}</div>
    ${p.criterio ? `<div><small>Lo cumpliste si</small> ${esc(p.criterio)}</div>` : ""}
    ${p.progresar ? `<div><small>Cómo progresar</small> ${esc(p.progresar)}</div>` : ""}
  </div>`;
}

// Detalle completo de una sesión realizada (Calendario).
export function detalleSesion(s) {
  const p = PLANTILLAS[s.tipo];
  const { nombre, icono } = nombreSesion(s);
  const inten = intensidad(s);
  const cifras = [
    ["Duración", `${duracionTotal(s)} min`],
    ["Intensidad", inten ?? "—"],
    ["Codo", s.codo != null ? `${s.codo}${s.codoDiaSiguiente != null ? ` → ${s.codoDiaSiguiente}` : ""}` : "—"],
    ["Esfuerzo", s.esfuerzo ?? "—"],
  ];

  return `
    <div class="tarjeta detalle">
      <div class="sesion-cabecera">
        <span>${icono} <b>${nombre}</b></span>
        ${insignia(s.resultado)}
      </div>
      <div class="cifras">${cifras.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}</div>
      ${objetivoHTML(p)}
      <div class="bloques-detalle">
        ${(s.bloques || []).map((b) => {
          const t = TIPOS_BLOQUE[b.tipo] || { nombre: b.tipo, icono: "•" };
          const ib = intensidadBloque(b);
          return `<div class="bloque-detalle">
            <div class="bloque-detalle-cabecera">
              <span>${t.icono} <b>${b.tipo === "otro" && b.nombre ? esc(b.nombre) : t.nombre}</b></span>
              <span>${b.duracionMin ? `${b.duracionMin} min` : ""}${ib ? ` · int. ${ib}` : ""}</span>
            </div>
            ${describirBloque(b).map((x) => `<div class="linea">${esc(x)}</div>`).join("")}
          </div>`;
        }).join("") || `<p class="vacio">Sin bloques registrados.</p>`}
      </div>
      ${s.nota ? `<p class="nota">${esc(s.nota)}</p>` : ""}
      <a class="boton secundario" href="#editar/${s.id}">Editar sesión</a>
    </div>`;
}

// Planificación de un día futuro (Calendario y Hoy).
export function detallePlan(tipo, fecha) {
  const p = PLANTILLAS[tipo];
  return `
    <div class="tarjeta detalle plan-detalle">
      <div class="sesion-cabecera"><span>${p.icono} <b>${p.nombre}</b></span><span class="insignia pendiente">Planificado</span></div>
      ${objetivoHTML(p)}
      <div class="bloques-detalle">
        ${p.bloques.map((b) => {
          const t = TIPOS_BLOQUE[b.tipo];
          return `<div class="bloque-detalle">
            <div class="bloque-detalle-cabecera">
              <span>${t.icono} <b>${t.nombre}${b.variante ? ` ${b.variante}` : ""}</b></span><span>~${t.duracion} min</span>
            </div>
            ${t.pista ? `<div class="linea">${esc(t.pista)}</div>` : ""}
          </div>`;
        }).join("")}
      </div>
      <a class="boton primario" href="#registrar/${tipo}/${fecha}">Registrar esta sesión</a>
    </div>`;
}

