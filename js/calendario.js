// calendario.js: pantalla "Calendario".
//
// - Días pasados: muestran lo que realmente se hizo (no lo planificado).
// - Hoy y días futuros sin registro: muestran lo planificado según el plan
//   semanal.
// - Al tocar un día aparece el detalle completo debajo del calendario.

import { PLANTILLAS, hoyISO, aISO, desdeISO, planDelDia, formatoFecha, intensidad } from "./calculos.js";
import { detalleSesion, detallePlan, nombreSesion } from "./ui.js";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

// Se recuerdan entre visitas a la pantalla.
let mesVisible = null; // Date del día 1 del mes que se ve
let diaElegido = null; // "YYYY-MM-DD"

// Permite que otra pantalla deje elegido un día (ej. al guardar una sesión).
export function elegirDia(iso) {
  diaElegido = iso;
  const d = desdeISO(iso);
  mesVisible = new Date(d.getFullYear(), d.getMonth(), 1);
}

export function mostrarCalendario(contenedor, sesiones) {
  const hoy = hoyISO();
  if (!mesVisible) {
    const d = desdeISO(hoy);
    mesVisible = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  if (!diaElegido) diaElegido = hoy;

  const porDia = {};
  for (const s of sesiones) (porDia[s.fecha] ||= []).push(s);

  function dibujar() {
    const anio = mesVisible.getFullYear();
    const mes = mesVisible.getMonth();
    const titulo = mesVisible.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

    // Celdas: desde el lunes de la semana del día 1 hasta completar semanas.
    const primero = new Date(anio, mes, 1);
    const inicio = new Date(primero);
    inicio.setDate(1 - ((primero.getDay() + 6) % 7));
    const ultimo = new Date(anio, mes + 1, 0);
    const celdas = [];
    for (const d = new Date(inicio); d <= ultimo || d.getDay() !== 1; d.setDate(d.getDate() + 1)) {
      celdas.push(aISO(d));
    }

    const intensidadMes = sesiones
      .filter((s) => desdeISO(s.fecha).getMonth() === mes && desdeISO(s.fecha).getFullYear() === anio)
      .reduce((t, s) => t + (intensidad(s) || 0), 0);

    contenedor.innerHTML = `
      <div class="cal-cabecera">
        <button type="button" class="mini" data-cal="anterior" aria-label="Mes anterior">‹</button>
        <h2>${titulo}</h2>
        <button type="button" class="mini" data-cal="siguiente" aria-label="Mes siguiente">›</button>
      </div>
      <div class="cal-leyenda">
        <span><i class="punto hecho"></i>Realizado</span>
        <span><i class="punto planificado"></i>Planificado</span>
        <span>Intensidad del mes: <b>${Math.round(intensidadMes)}</b></span>
      </div>
      <div class="calendario">
        ${DIAS.map((d) => `<div class="cal-dia-semana">${d}</div>`).join("")}
        ${celdas.map((iso) => celda(iso)).join("")}
      </div>
      <button type="button" class="link" data-cal="hoy">Ir a hoy</button>
      <div class="cal-detalle">${detalleDia(diaElegido)}</div>`;
  }

  function celda(iso) {
    const d = desdeISO(iso);
    const fuera = d.getMonth() !== mesVisible.getMonth();
    const hechas = porDia[iso] || [];
    let contenido = "";
    let clase = "";

    if (hechas.length) {
      contenido = hechas.map((s) => nombreSesion(s).icono).join("");
      clase = "hecho";
    } else if (iso >= hoy) {
      const plan = planDelDia(iso);
      if (plan.length) {
        contenido = plan.map((t) => PLANTILLAS[t].icono).join("");
        clase = "planificado";
      }
    }

    return `<button type="button" class="cal-celda ${clase} ${fuera ? "fuera" : ""}
        ${iso === hoy ? "hoy" : ""} ${iso === diaElegido ? "elegido" : ""}" data-cal="dia" data-fecha="${iso}">
      <span class="num">${d.getDate()}</span>
      <span class="iconos">${contenido}</span>
    </button>`;
  }

  function detalleDia(iso) {
    const titulo = formatoFecha(iso, { weekday: "long", day: "numeric", month: "long" });
    const hechas = porDia[iso] || [];
    let cuerpo;

    if (hechas.length) {
      cuerpo = hechas.map(detalleSesion).join("") +
        `<a class="boton secundario ancho" href="#registrar//${iso}">+ Agregar otra sesión este día</a>`;
    } else if (iso >= hoy) {
      const plan = planDelDia(iso);
      cuerpo = plan.length
        ? (plan.length > 1 ? `<p class="ayuda">Elige una de estas opciones:</p>` : "") +
          plan.map((t) => detallePlan(t, iso)).join("")
        : `<p class="vacio">Descanso planificado.</p>
           <a class="boton secundario ancho" href="#registrar//${iso}">+ Registrar una sesión</a>`;
    } else {
      cuerpo = `<p class="vacio">Sin sesiones registradas (descanso).</p>
        <a class="boton secundario ancho" href="#registrar//${iso}">+ Registrar una sesión</a>`;
    }

    return `<h3 class="cal-titulo-dia">${titulo}</h3>${cuerpo}`;
  }

  function alHacerClick(ev) {
    const b = ev.target.closest("[data-cal]");
    if (!b) return;
    const accion = b.dataset.cal;
    if (accion === "anterior") mesVisible.setMonth(mesVisible.getMonth() - 1);
    if (accion === "siguiente") mesVisible.setMonth(mesVisible.getMonth() + 1);
    if (accion === "hoy") {
      const d = desdeISO(hoy);
      mesVisible = new Date(d.getFullYear(), d.getMonth(), 1);
      diaElegido = hoy;
    }
    if (accion === "dia") {
      diaElegido = b.dataset.fecha;
      const d = desdeISO(diaElegido);
      mesVisible = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    dibujar();
    if (accion === "dia") contenedor.querySelector(".cal-detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  contenedor.addEventListener("click", alHacerClick);
  dibujar();
  return () => contenedor.removeEventListener("click", alHacerClick);
}
