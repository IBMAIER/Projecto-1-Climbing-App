// planes.js: pantalla "Plan".
//
// Un plan define, para un período de N semanas desde una fecha de inicio:
//   - la semana tipo: qué día prediseñado toca cada día (vacío = descanso;
//     dos o más = opciones),
//   - cada cuántas semanas hay descarga y si en la descarga va un test,
//   - un foco (fuerza, resistencia, roca) y una nota.
// El Calendario y Hoy leen el plan vigente para saber qué toca cada día.

import {
  PLANTILLAS, SEMANA_SUGERIDA, FOCOS, finPlan, planVigente, hoyISO, sumarDias, lunesDe,
  formatoFecha, desdeISO,
} from "./calculos.js";
import { esc } from "./ui.js";

const DIAS = [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]];
const ESCALADA = new Set(["board", "resistencia", "max_boulder", "roca", "test"]);

const fechaCorta = (iso) => formatoFecha(iso, { day: "numeric", month: "short", year: "numeric" });

function copia(x) {
  return JSON.parse(JSON.stringify(x));
}

// ---------------------------------------------------------------------------
// Lista de planes
// ---------------------------------------------------------------------------

export function mostrarPlanes(contenedor, planes) {
  const hoy = hoyISO();
  const vigente = planVigente(hoy, planes);
  const proximos = planes.filter((p) => p.inicio > hoy).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const pasados = planes.filter((p) => finPlan(p) < hoy);
  const otrosActuales = planes.filter((p) => p !== vigente && p.inicio <= hoy && finPlan(p) >= hoy);

  const tarjeta = (p, estado) => {
    const semanaActual = estado === "vigente"
      ? Math.floor((desdeISO(hoy) - desdeISO(p.inicio)) / (7 * 86400000)) + 1
      : null;
    const progreso = semanaActual ? Math.round((semanaActual / p.semanas) * 100) : null;
    return `<a class="tarjeta plan-tarjeta ${estado}" href="#plan/${p.id}">
      <div class="sesion-cabecera">
        <b>${esc(p.nombre || "Plan sin nombre")}</b>
        <span class="insignia ${estado === "vigente" ? "cumplido" : "pendiente"}">${
          { vigente: "En curso", proximo: "Próximo", pasado: "Terminado", solapado: "Reemplazado" }[estado]}</span>
      </div>
      <div class="sesion-datos">
        ${fechaCorta(p.inicio)} → ${fechaCorta(finPlan(p))} · ${p.semanas} semanas
        ${p.foco ? ` · foco ${FOCOS[p.foco]?.toLowerCase() || esc(p.foco)}` : ""}
      </div>
      ${progreso != null ? `<div class="progreso"><div style="width:${Math.min(100, progreso)}%"></div></div>
        <small>Semana ${semanaActual} de ${p.semanas}</small>` : ""}
      <div class="semana-mini">${DIAS.map(([d, n]) => {
        const tipos = p.semana?.[d] || [];
        return `<span title="${n}"><i>${n[0]}</i>${tipos.map((t) => PLANTILLAS[t]?.icono || "").join("") || "·"}</span>`;
      }).join("")}</div>
    </a>`;
  };

  contenedor.innerHTML = `
    <h2>Plan de entrenamiento</h2>
    <p class="ayuda">Define por cuánto tiempo seguirás un plan y qué toca cada día de la semana.
      El Calendario y la pantalla Hoy usan el plan vigente.</p>
    <a class="boton primario grande" href="#plan/nuevo">+ Nuevo plan</a>

    <h3>En curso</h3>
    ${vigente ? tarjeta(vigente, "vigente") : `<p class="vacio">No hay un plan para hoy. Crea uno para ver la planificación en el calendario.</p>`}
    ${otrosActuales.map((p) => tarjeta(p, "solapado")).join("")}

    ${proximos.length ? `<h3>Próximos</h3>${proximos.map((p) => tarjeta(p, "proximo")).join("")}` : ""}
    ${pasados.length ? `<h3>Terminados</h3>${pasados.map((p) => tarjeta(p, "pasado")).join("")}` : ""}
  `;
  return () => {};
}

// ---------------------------------------------------------------------------
// Editor de un plan
// ---------------------------------------------------------------------------

function planNuevo(planes) {
  const hoy = hoyISO();
  const vigente = planVigente(hoy, planes);
  // Empieza el lunes de esta semana, o al día siguiente del plan vigente
  // (copiando su semana tipo).
  const inicio = vigente ? sumarDias(finPlan(vigente), 1) : lunesDe(hoy);
  return {
    nombre: "",
    foco: "fuerza",
    inicio,
    semanas: 6,
    semana: copia(vigente?.semana || SEMANA_SUGERIDA),
    descargaCada: 3,
    testEnDescarga: true,
    nota: "",
  };
}

export function crearEditorPlan(contenedor, { plan, planes, alGuardar, alCancelar, alBorrar }) {
  const estado = plan ? copia(plan) : planNuevo(planes);
  // Asegurar las 7 claves de la semana.
  for (const [d] of DIAS) estado.semana[d] ||= [];
  let diaAbierto = null;

  function resumen() {
    const dias = DIAS.map(([d]) => estado.semana[d]);
    const escalada = dias.filter((t) => t.some((x) => ESCALADA.has(x))).length;
    const fisico = dias.filter((t) => t.some((x) => x.startsWith("fisico"))).length;
    const descanso = dias.filter((t) => !t.length).length;
    const avisos = [];
    if (escalada > 3) avisos.push("Más de 3 días de escalada: tu plan dice 4 solo si el codo está tranquilo, y siempre seguida de descarga.");
    // Días fuertes seguidos (sin 48-72 h entre medio).
    const orden = DIAS.map(([d]) => estado.semana[d].some((x) => ESCALADA.has(x)));
    for (let i = 0; i < 7; i++) {
      if (orden[i] && orden[(i + 1) % 7]) {
        avisos.push(`${DIAS[i][1]} y ${DIAS[(i + 1) % 7][1].toLowerCase()} son días de escalada seguidos: después descansa dos días.`);
        break;
      }
    }
    return { escalada, fisico, descanso, avisos };
  }

  function solapes() {
    const fin = finPlan(estado);
    return planes.filter((p) => p.id !== estado.id && p.inicio <= fin && finPlan(p) >= estado.inicio);
  }

  function textoDescargas() {
    if (!estado.descargaCada) return "0 = sin descarga.";
    const lista = [];
    for (let s = estado.descargaCada; s <= estado.semanas; s += estado.descargaCada) lista.push(s);
    return lista.length
      ? `Semanas de descarga: ${lista.join(", ")} (volumen a la mitad, sin ir al límite).`
      : "El plan es más corto que el intervalo de descarga.";
  }

  function dibujar() {
    const r = resumen();
    const sol = solapes();

    contenedor.innerHTML = `
      <h2>${estado.id ? "Editar plan" : "Nuevo plan"}</h2>

      <div class="campo"><span class="etiqueta">Nombre</span>
        <input type="text" data-campo="nombre" value="${esc(estado.nombre)}" placeholder="Ej: Bloque de fuerza noviembre"></div>

      <div class="campo"><span class="etiqueta">Foco</span>
        <div class="chips">${Object.entries(FOCOS).map(([k, t]) =>
          `<button type="button" class="chip ${estado.foco === k ? "activo" : ""}" data-plan="foco" data-valor="${k}">${t}</button>`).join("")}</div></div>

      <div class="fila-contadores">
        <div class="campo"><span class="etiqueta">Inicio</span>
          <input type="date" data-campo="inicio" value="${estado.inicio}"></div>
        <div class="campo"><span class="etiqueta">Duración</span>
          <div class="contador">
            <button type="button" data-plan="semanas" data-delta="-1">−</button>
            <label class="valor-editable"><input type="number" inputmode="numeric" data-plan-num="semanas"
              data-min="1" data-max="52" value="${estado.semanas}" aria-label="Semanas"><span>sem</span></label>
            <button type="button" data-plan="semanas" data-delta="1">+</button>
          </div></div>
      </div>
      <p class="ayuda" id="fechas-plan">Del ${fechaCorta(estado.inicio)} al ${fechaCorta(finPlan(estado))}.</p>
      ${sol.length ? `<div class="tarjeta aviso">⚠️ Se cruza con ${sol.map((p) => `"${esc(p.nombre || "sin nombre")}"`).join(", ")}.
        En los días que coinciden manda el plan que empieza más tarde.</div>` : ""}

      <h3>Semana tipo</h3>
      <p class="ayuda">Toca + para agregar un día prediseñado. Sin nada = descanso. Con dos o más, ese día eliges una opción.</p>
      <div class="semana-editor">
        ${DIAS.map(([d, nombre]) => {
          const tipos = estado.semana[d];
          return `<div class="dia-plan">
            <div class="dia-plan-fila">
              <span class="dia-nombre">${nombre}</span>
              <span class="chips">
                ${tipos.length ? tipos.map((t, i) => `<button type="button" class="chip activo"
                  data-plan="quitar" data-dia="${d}" data-indice="${i}">${PLANTILLAS[t].icono} ${PLANTILLAS[t].nombre} ✕</button>`).join("")
                  : `<span class="descanso">Descanso</span>`}
              </span>
              <button type="button" class="mini" data-plan="abrir" data-dia="${d}" aria-label="Agregar">${diaAbierto === d ? "−" : "+"}</button>
            </div>
            ${diaAbierto === d ? `<div class="chips menu-bloques">${Object.entries(PLANTILLAS)
              .filter(([k]) => !tipos.includes(k))
              .map(([k, p]) => `<button type="button" class="chip" data-plan="agregar" data-dia="${d}" data-valor="${k}">${p.icono} ${p.nombre}</button>`)
              .join("")}</div>` : ""}
          </div>`;
        }).join("")}
      </div>
      <div class="resumen-dia">
        <span><b>${r.escalada}</b> días de escalada</span>
        <span><b>${r.fisico}</b> de físico</span>
        <span><b>${r.descanso}</b> de descanso</span>
      </div>
      ${r.avisos.map((a) => `<div class="tarjeta aviso">⚠️ ${a}</div>`).join("")}

      <h3>Descarga</h3>
      <div class="campo"><span class="etiqueta">Cada cuántas semanas</span>
        <div class="contador">
          <button type="button" data-plan="descarga" data-delta="-1">−</button>
          <label class="valor-editable"><input type="number" inputmode="numeric" data-plan-num="descargaCada"
            data-min="0" data-max="12" value="${estado.descargaCada}" aria-label="Semanas entre descargas"><span>sem</span></label>
          <button type="button" data-plan="descarga" data-delta="1">+</button>
        </div></div>
      <p class="ayuda" id="descargas-plan">${textoDescargas()}</p>
      <label class="check">
        <input type="checkbox" data-plan-check="testEnDescarga" ${estado.testEnDescarga ? "checked" : ""}>
        Test máximo en la descarga (reemplaza el primer día de escalada de esa semana)
      </label>

      <div class="campo"><span class="etiqueta">Nota <small>(opcional)</small></span>
        <textarea data-campo="nota" rows="2" placeholder="Objetivos del período, ajustes...">${esc(estado.nota)}</textarea></div>

      <div class="acciones">
        <button type="button" class="primario" data-plan="guardar">Guardar plan</button>
        <button type="button" class="secundario" data-plan="cancelar">Cancelar</button>
        ${estado.id ? `<button type="button" class="link peligro" data-plan="borrar">Borrar plan</button>` : ""}
      </div>`;
  }

  function alHacerClick(ev) {
    const b = ev.target.closest("[data-plan]");
    if (!b || !contenedor.contains(b)) return;
    const accion = b.dataset.plan;
    const dia = Number(b.dataset.dia);

    switch (accion) {
      case "foco":
        estado.foco = b.dataset.valor;
        break;
      case "semanas":
        estado.semanas = Math.min(52, Math.max(1, estado.semanas + Number(b.dataset.delta)));
        break;
      case "descarga":
        estado.descargaCada = Math.min(12, Math.max(0, estado.descargaCada + Number(b.dataset.delta)));
        break;
      case "abrir":
        diaAbierto = diaAbierto === dia ? null : dia;
        break;
      case "agregar":
        estado.semana[dia].push(b.dataset.valor);
        diaAbierto = null;
        break;
      case "quitar":
        estado.semana[dia].splice(Number(b.dataset.indice), 1);
        break;
      case "guardar":
        if (!estado.inicio) return alert("Elige una fecha de inicio.");
        if (!estado.nombre.trim()) estado.nombre = `Plan ${FOCOS[estado.foco]?.toLowerCase() || ""} ${formatoFecha(estado.inicio, { day: "numeric", month: "short" })}`.trim();
        alGuardar(estado);
        return;
      case "cancelar":
        alCancelar();
        return;
      case "borrar":
        if (confirm("¿Borrar este plan? Las sesiones registradas no se borran.")) alBorrar(estado.id);
        return;
    }
    dibujar();
  }

  function alEscribir(ev) {
    const campo = ev.target.dataset.campo;
    if (campo) {
      estado[campo] = ev.target.value;
      if (campo === "inicio" && estado.inicio) {
        const p = contenedor.querySelector("#fechas-plan");
        if (p) p.textContent = `Del ${fechaCorta(estado.inicio)} al ${fechaCorta(finPlan(estado))}.`;
      }
    }
    const check = ev.target.dataset.planCheck;
    if (check) estado[check] = ev.target.checked;
    const num = ev.target.dataset.planNum;
    if (num && ev.target.value !== "" && !isNaN(Number(ev.target.value))) {
      const { min, max } = ev.target.dataset;
      estado[num] = Math.min(Number(max), Math.max(Number(min), Math.round(Number(ev.target.value))));
      const p = contenedor.querySelector("#fechas-plan");
      if (p && estado.inicio) p.textContent = `Del ${fechaCorta(estado.inicio)} al ${fechaCorta(finPlan(estado))}.`;
      const d = contenedor.querySelector("#descargas-plan");
      if (d) d.textContent = textoDescargas();
    }
  }

  // Al salir del campo de fecha, redibujar (actualiza avisos de cruce).
  function alCambiar(ev) {
    if (ev.target.dataset.campo === "inicio") dibujar();
    // Números: mostrar el valor guardado (por si quedó vacío o fuera de rango).
    if (ev.target.dataset.planNum) ev.target.value = estado[ev.target.dataset.planNum];
  }

  function alEnfocar(ev) {
    if (ev.target.matches?.("input[type=number]")) ev.target.select();
  }

  contenedor.addEventListener("click", alHacerClick);
  contenedor.addEventListener("input", alEscribir);
  contenedor.addEventListener("change", alCambiar);
  contenedor.addEventListener("focusin", alEnfocar);
  dibujar();
  return () => {
    contenedor.removeEventListener("click", alHacerClick);
    contenedor.removeEventListener("input", alEscribir);
    contenedor.removeEventListener("change", alCambiar);
    contenedor.removeEventListener("focusin", alEnfocar);
  };
}
