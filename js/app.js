// app.js: arranque de la app y navegación entre pantallas.
//
// Flujo:
//   1. Se registra el service worker (uso sin señal).
//   2. db.iniciar() avisa quién es el usuario (evento de login).
//   3. Con usuario, se escuchan las sesiones; cada cambio redibuja la pantalla.
//   4. La pantalla visible depende del "hash" de la URL: #hoy, #registrar,
//      #historial, #editar/<id>. Cambiar el hash dispara el evento hashchange.

import * as db from "./db.js";
import { crearFormulario } from "./formularios.js";
import {
  TIPOS, RESULTADOS, PLAN_SEMANA,
  intensidad, gradoMaximo, hoyISO, lunesDe, formatoFecha, aISO, desdeISO,
} from "./calculos.js";

const $ = (sel) => document.querySelector(sel);
const vista = $("#vista");

let usuario = null;
let sesiones = [];
let dejarDeEscuchar = null;
let desmontarFormulario = null;
let filtroHistorial = "todos";

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Service worker:", e));
}

db.iniciar(alCambiarUsuario).catch((e) => {
  console.error(e);
  vista.innerHTML = `<div class="tarjeta aviso">No se pudo conectar con Firebase. Revisa js/config.js.</div>`;
});

window.addEventListener("hashchange", mostrarPantalla);

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-app]");
  if (!b) return;
  const accion = b.dataset.app;
  if (accion === "entrar") db.entrar().catch((e) => alert("No se pudo iniciar sesión: " + e.message));
  if (accion === "salir") db.salir();
  if (accion === "filtro") {
    filtroHistorial = b.dataset.valor;
    mostrarPantalla();
  }
});

function alCambiarUsuario(u) {
  usuario = u;
  if (dejarDeEscuchar) dejarDeEscuchar();
  dejarDeEscuchar = null;
  sesiones = [];

  document.body.classList.toggle("sin-usuario", !u);
  $("#usuario").innerHTML = u
    ? `${esc(u.nombre || u.email)}${db.modoLocal ? "" : ` · <button class="link" data-app="salir">Salir</button>`}`
    : "";
  $("#aviso-local").hidden = !db.modoLocal;

  if (!u) {
    mostrarLogin();
    return;
  }

  // Evento: cada vez que cambian las sesiones, se actualiza la pantalla
  // (salvo el formulario, para no borrar lo que estás escribiendo).
  dejarDeEscuchar = db.escucharSesiones(
    (lista) => {
      sesiones = lista;
      if (!pantallaActual().startsWith("registrar") && !pantallaActual().startsWith("editar")) {
        mostrarPantalla();
      }
    },
    (err) => {
      const msg = err.code === "permission-denied"
        ? `La cuenta ${esc(u.email)} no tiene permiso para usar esta app.`
        : `No se pudieron cargar los datos (${esc(err.code || err.message)}).`;
      vista.innerHTML = `<div class="tarjeta aviso">${msg}</div>
        <button class="secundario" data-app="salir">Cambiar de cuenta</button>`;
    }
  );
  mostrarPantalla();
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

function pantallaActual() {
  return location.hash.slice(1) || "hoy";
}

function ir(pantalla) {
  if (pantallaActual() === pantalla) mostrarPantalla();
  else location.hash = pantalla;
}

function mostrarPantalla() {
  if (!usuario) return;
  if (desmontarFormulario) {
    desmontarFormulario();
    desmontarFormulario = null;
  }

  const p = pantallaActual();
  document.querySelectorAll("nav a").forEach((a) => {
    a.classList.toggle("activo", p.startsWith(a.getAttribute("href").slice(1)));
  });

  if (p === "registrar") return mostrarFormulario(null);
  if (p.startsWith("editar/")) {
    const s = sesiones.find((x) => x.id === p.slice(7));
    return s ? mostrarFormulario(s) : ir("historial");
  }
  if (p === "historial") return mostrarHistorial();
  mostrarHoy();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------------

function mostrarLogin() {
  vista.innerHTML = `
    <div class="login">
      <h1>🧗 Bitácora de escalada</h1>
      <p>Registra tus sesiones y sigue tu intensidad.</p>
      <button class="primario grande" data-app="entrar">Entrar con Google</button>
    </div>`;
}

function mostrarHoy() {
  const hoy = hoyISO();
  const estaSemana = lunesDe(hoy);
  const semanaPasada = (() => {
    const d = desdeISO(estaSemana);
    d.setDate(d.getDate() - 7);
    return aISO(d);
  })();

  const deSemana = (lunes) => sesiones.filter((s) => lunesDe(s.fecha) === lunes);
  const sumaIntensidad = (lista) => lista.reduce((t, s) => t + (intensidad(s) || 0), 0);
  const semana = deSemana(estaSemana);
  const diasEscalada = new Set(semana.filter((s) => TIPOS[s.tipo]?.escalada).map((s) => s.fecha)).size;

  // Avisos
  const avisos = [];
  const ultima = sesiones.find((s) => s.codo != null || s.codoDiaSiguiente != null);
  if (ultima && (ultima.codo > 3 || ultima.codoDiaSiguiente > 3)) {
    avisos.push(`El codo pasó de 3/10 en tu última sesión (${formatoFecha(ultima.fecha)}). Considera bajar un paso y sumar un día de descanso.`);
  }
  const pendientes = sesiones
    .filter((s) => s.fecha < hoy && s.codoDiaSiguiente == null && TIPOS[s.tipo]?.escalada)
    .slice(0, 3);

  vista.innerHTML = `
    <p class="fecha-hoy">${formatoFecha(hoy, { weekday: "long", day: "numeric", month: "long" })}</p>
    <div class="tarjeta plan">
      <small>Hoy toca</small>
      <b>${PLAN_SEMANA[new Date().getDay()]}</b>
    </div>

    <a class="boton primario grande" href="#registrar">+ Registrar sesión</a>

    ${avisos.map((a) => `<div class="tarjeta aviso">⚠️ ${a}</div>`).join("")}

    ${pendientes.length ? `
      <div class="tarjeta">
        <b>Anota el codo del día siguiente</b>
        ${pendientes.map((s) => `<a class="fila-link" href="#editar/${s.id}">
          ${TIPOS[s.tipo].icono} ${TIPOS[s.tipo].nombre} · ${formatoFecha(s.fecha)} →</a>`).join("")}
      </div>` : ""}

    <h3>Esta semana</h3>
    <div class="estadisticas">
      <div><small>Sesiones</small><b>${semana.length}</b></div>
      <div><small>Días de escalada</small><b>${diasEscalada}</b></div>
      <div><small>Intensidad</small><b>${sumaIntensidad(semana)}</b></div>
      <div><small>Semana pasada</small><b>${sumaIntensidad(deSemana(semanaPasada))}</b></div>
    </div>

    <h3>Últimas sesiones</h3>
    ${sesiones.length ? sesiones.slice(0, 3).map(tarjetaSesion).join("") : `<p class="vacio">Aún no registras sesiones.</p>`}
  `;
}

function mostrarHistorial() {
  const filtradas = filtroHistorial === "todos" ? sesiones : sesiones.filter((s) => s.tipo === filtroHistorial);

  // Agrupar por semana (lunes).
  const semanas = new Map();
  for (const s of filtradas) {
    const lunes = lunesDe(s.fecha);
    if (!semanas.has(lunes)) semanas.set(lunes, []);
    semanas.get(lunes).push(s);
  }

  const filtros = [["todos", "Todas"], ...Object.entries(TIPOS).map(([k, t]) => [k, t.nombre])];

  vista.innerHTML = `
    <h2>Historial</h2>
    <div class="chips filtros">
      ${filtros.map(([k, t]) => `<button class="chip ${filtroHistorial === k ? "activo" : ""}"
        data-app="filtro" data-valor="${k}">${t}</button>`).join("")}
    </div>
    ${semanas.size ? [...semanas].map(([lunes, lista]) => `
      <div class="semana">
        <div class="semana-cabecera">
          <span>Semana del ${formatoFecha(lunes, { day: "numeric", month: "short" })}</span>
          <span>${lista.length} ses. · intensidad ${lista.reduce((t, s) => t + (intensidad(s) || 0), 0)}</span>
        </div>
        ${lista.map(tarjetaSesion).join("")}
      </div>`).join("") : `<p class="vacio">No hay sesiones${filtroHistorial === "todos" ? "" : " de este tipo"}.</p>`}
  `;
}

function mostrarFormulario(sesion) {
  window.scrollTo(0, 0);
  desmontarFormulario = crearFormulario(vista, {
    sesion,
    sesiones,
    alGuardar(datos) {
      db.guardarSesion(datos);
      ir(sesion ? "historial" : "hoy");
    },
    alCancelar() {
      history.length > 1 ? history.back() : ir("hoy");
    },
    alBorrar(id) {
      db.borrarSesion(id);
      ir("historial");
    },
  });
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function tarjetaSesion(s) {
  const t = TIPOS[s.tipo] || { nombre: s.tipo, icono: "•" };
  const inten = intensidad(s);
  const max = gradoMaximo(s);
  const datos = [];
  if (inten != null) datos.push(`Intensidad <b>${inten}</b>`);
  if (max) datos.push(`Máx <b>${max}</b>`);
  if (s.tipo === "dedos" && s.detalle?.series?.length) {
    datos.push(`Máx <b>${Math.max(...s.detalle.series.map((x) => x.kg))} kg</b>`);
  }
  if (s.codo != null) datos.push(`Codo <b>${s.codo}</b>${s.codoDiaSiguiente != null ? `→<b>${s.codoDiaSiguiente}</b>` : ""}`);
  if (s.duracionMin) datos.push(`${s.duracionMin} min`);

  return `
    <a class="tarjeta sesion" href="#editar/${s.id}">
      <div class="sesion-cabecera">
        <span>${t.icono} <b>${t.nombre}</b>${s.tipo === "fisico" && s.detalle?.variante ? ` ${s.detalle.variante}` : ""}</span>
        <span class="fecha">${formatoFecha(s.fecha)}</span>
      </div>
      <div class="sesion-datos">${datos.join(" · ")}</div>
      ${s.resultado ? `<span class="insignia ${s.resultado}">${RESULTADOS[s.resultado]}</span>` : `<span class="insignia pendiente">Sin resultado</span>`}
      ${s.nota ? `<p class="nota">${esc(s.nota)}</p>` : ""}
    </a>`;
}
