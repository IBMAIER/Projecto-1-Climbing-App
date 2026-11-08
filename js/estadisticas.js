// estadisticas.js: pantalla "Estadísticas".
//
// 1. Gráfico de intensidad: diario (solo días con escalada) o mensual.
// 2. Benchmarks del entrenamiento: lo mejor que has hecho en tus sesiones.
// 3. Tests máximos: resultados de cada test y su cambio respecto al anterior.
//
// El gráfico se dibuja con SVG propio (sin librerías), así funciona sin señal.

import {
  intensidadPorDia, intensidadPromedio, benchmarkDedos, benchmarkGrado, benchmarkVias,
  benchmarkResistencia, tests, intensidadBloque, nombreVia, formatoFecha, desdeISO,
  VIAS, LARGOS_TABLA, METROS_POR_TRAMO, DESCUENTO_TRAMO, FACTOR_VIA, descomponerVia, textoV,
} from "./calculos.js";
import { esc } from "./ui.js";

let modo = "diario"; // "diario" | "mensual"

// ---------------------------------------------------------------------------
// Gráfico de barras
// ---------------------------------------------------------------------------

function grafico(datos) {
  if (!datos.length) return `<p class="vacio">Aún no hay sesiones con intensidad.</p>`;

  const anchoBarra = 30;
  const separacion = 8;
  const alto = 200;
  const arriba = 22;   // espacio para el valor sobre la barra
  const abajo = 34;    // espacio para las etiquetas
  const max = Math.max(...datos.map((d) => d.valor)) || 1;
  const ancho = datos.length * (anchoBarra + separacion) + separacion;
  const promedio = datos.reduce((t, d) => t + d.valor, 0) / datos.length;
  const yProm = arriba + (alto - (promedio / max) * alto);

  const barras = datos.map((d, i) => {
    const h = Math.max(2, (d.valor / max) * alto);
    const x = separacion + i * (anchoBarra + separacion);
    const y = arriba + alto - h;
    return `<g>
      <title>${esc(d.titulo)}: ${d.valor}</title>
      <rect x="${x}" y="${y}" width="${anchoBarra}" height="${h}" rx="4" class="barra"></rect>
      <text x="${x + anchoBarra / 2}" y="${y - 6}" class="valor">${Math.round(d.valor)}</text>
      <text x="${x + anchoBarra / 2}" y="${arriba + alto + 14}" class="eje">${esc(d.etiqueta)}</text>
      ${d.sub ? `<text x="${x + anchoBarra / 2}" y="${arriba + alto + 27}" class="eje sub">${esc(d.sub)}</text>` : ""}
    </g>`;
  }).join("");

  return `<div class="grafico-scroll">
    <svg width="${ancho}" height="${arriba + alto + abajo}" role="img" aria-label="Intensidad">
      <line x1="0" x2="${ancho}" y1="${arriba + alto}" y2="${arriba + alto}" class="linea-base"></line>
      <line x1="0" x2="${ancho}" y1="${yProm}" y2="${yProm}" class="linea-promedio"></line>
      ${barras}
    </svg>
  </div>
  <p class="ayuda">Línea punteada: promedio (${Math.round(promedio)}). Desliza para ver más atrás.</p>`;
}

function datosDiarios(sesiones) {
  const porDia = intensidadPorDia(sesiones);
  return Object.keys(porDia).sort().map((iso) => {
    const d = desdeISO(iso);
    return {
      etiqueta: `${d.getDate()}/${d.getMonth() + 1}`,
      sub: d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
      valor: porDia[iso],
      titulo: formatoFecha(iso),
    };
  });
}

function datosMensuales(sesiones) {
  const porDia = intensidadPorDia(sesiones);
  const porMes = {};
  const diasPorMes = {};
  for (const [iso, v] of Object.entries(porDia)) {
    const m = iso.slice(0, 7);
    porMes[m] = (porMes[m] || 0) + v;
    diasPorMes[m] = (diasPorMes[m] || 0) + 1;
  }
  return Object.keys(porMes).sort().map((m) => {
    const d = desdeISO(`${m}-01`);
    return {
      etiqueta: d.toLocaleDateString("es-CL", { month: "short" }).replace(".", ""),
      sub: String(d.getFullYear()).slice(2),
      valor: porMes[m],
      titulo: `${d.toLocaleDateString("es-CL", { month: "long", year: "numeric" })} (${diasPorMes[m]} días)`,
    };
  });
}

// ---------------------------------------------------------------------------
// Benchmarks y tests
// ---------------------------------------------------------------------------

function fila(nombre, mejor, ultima, ultimos30) {
  return `<tr>
    <th>${nombre}</th>
    <td>${mejor ?? "—"}</td>
    <td>${ultimos30 ?? "—"}</td>
    <td>${ultima ?? "—"}</td>
  </tr>`;
}

const conFecha = (texto, fecha) =>
  texto == null ? null : `<b>${texto}</b><small>${formatoFecha(fecha, { day: "numeric", month: "short" })}</small>`;

function benchmarks(sesiones) {
  const hc = benchmarkDedos(sesiones, "half_crimp");
  const pz = benchmarkDedos(sesiones, "pinza");
  const board = benchmarkGrado(sesiones, ["board"]);
  const boulder = benchmarkGrado(sesiones, ["boulder", "roca"]);
  const vias = benchmarkVias(sesiones);
  const res = benchmarkResistencia(sesiones);

  const kg = (x) => x && conFecha(`${x.kg} kg${x.mm ? ` · ${x.mm} mm` : ""}`, x.fecha);
  const gr = (x) => x && conFecha(x.grado, x.fecha);
  const via = (x) => x && conFecha(nombreVia(x.grado), x.fecha);
  const resist = (x) => x && conFecha(
    `${x.b.formato === "vias" ? "vías" : x.b.formato} · int. ${intensidadBloque(x.b) ?? 0} · ${x.b.caidas ?? 0} caídas`, x.fecha);

  const filas = [
    hc && fila("Half crimp", kg(hc.mejor), kg(hc.ultima), kg(hc.ultimos30)),
    pz && fila("Pinza", kg(pz.mejor), kg(pz.ultima), kg(pz.ultimos30)),
    board && fila("Board", gr(board.mejor), gr(board.ultima), gr(board.ultimos30)),
    boulder && fila("Boulder", gr(boulder.mejor), gr(boulder.ultima), gr(boulder.ultimos30)),
    vias && fila("Vías", via(vias.mejor), via(vias.ultima), via(vias.ultimos30)),
    res && fila("Resistencia", resist(res.mejor), resist(res.ultima), null),
  ].filter(Boolean);

  const prom = intensidadPromedio(sesiones, 30);
  const promAnterior = intensidadPromedio(sesiones, 60, 30);
  const codos = sesiones.filter((s) => s.codo != null).slice(0, 5).map((s) => s.codo);
  const codo = codos.length ? (codos.reduce((a, b) => a + b, 0) / codos.length).toFixed(1) : "—";

  return `
    <div class="estadisticas">
      <div><small>Intensidad media / día (30 d)</small><b>${prom ?? "—"}</b></div>
      <div><small>30 días anteriores</small><b>${promAnterior ?? "—"}</b></div>
      <div><small>Codo (últimas 5)</small><b>${codo}</b></div>
    </div>
    ${filas.length ? `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th></th><th>Mejor</th><th>Últimos 30 d</th><th>Última</th></tr></thead>
      <tbody>${filas.join("")}</tbody>
    </table></div>` : `<p class="vacio">Registra sesiones de dedos, board, boulder o vías para ver tus benchmarks.</p>`}`;
}

function delta(actual, anterior, sufijo = "") {
  if (actual == null || anterior == null) return "";
  const d = Math.round((actual - anterior) * 10) / 10;
  if (!d) return `<small class="delta">=</small>`;
  return `<small class="delta ${d > 0 ? "sube" : "baja"}">${d > 0 ? "+" : ""}${d}${sufijo}</small>`;
}

function seccionTests(sesiones) {
  const lista = tests(sesiones);
  if (!lista.length) {
    return `<p class="vacio">Aún no hay tests. Registra un día "Test máximo" en cada descarga
      (cada 3 semanas): half crimp 10 s, pinza y grado máximo en board.</p>
      <a class="boton secundario ancho" href="#registrar/test">+ Registrar test máximo</a>`;
  }
  const ultimo = lista[0];
  const anterior = lista[1];
  const relativo = (t) => (t.pesoCorporal ? Math.round(((t.pesoCorporal + t.halfCrimpKg) / t.pesoCorporal) * 100) : null);
  const num = (g) => (g ? parseInt(g.slice(1), 10) : null);

  return `
    <div class="estadisticas">
      <div><small>Half crimp 10 s</small><b>${ultimo.halfCrimpKg ?? "—"} kg</b>${delta(ultimo.halfCrimpKg, anterior?.halfCrimpKg, " kg")}</div>
      <div><small>Pinza</small><b>${ultimo.pinzaKg ?? "—"} kg</b>${delta(ultimo.pinzaKg, anterior?.pinzaKg, " kg")}</div>
      <div><small>Board máx</small><b>${ultimo.boardMax ?? "—"}</b>${delta(num(ultimo.boardMax), num(anterior?.boardMax))}</div>
      <div><small>Half crimp / peso</small><b>${relativo(ultimo) ? `${relativo(ultimo)}%` : "—"}</b></div>
    </div>
    <p class="ayuda">Último test: ${formatoFecha(ultimo.fecha, { day: "numeric", month: "long", year: "numeric" })}${anterior ? `; cambio respecto al ${formatoFecha(anterior.fecha, { day: "numeric", month: "short" })}` : ""}.</p>
    <div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Fecha</th><th>Half crimp</th><th>Pinza</th><th>Board</th><th>Peso</th></tr></thead>
      <tbody>${lista.map((t) => `<tr>
        <th>${formatoFecha(t.fecha, { day: "numeric", month: "short", year: "2-digit" })}</th>
        <td>${t.halfCrimpKg ?? "—"} kg${t.regletaMm ? ` <small>${t.regletaMm} mm</small>` : ""}</td>
        <td>${t.pinzaKg ?? "—"} kg</td>
        <td>${t.boardMax ?? "—"}${t.boardAngulo ? ` <small>${t.boardAngulo}°</small>` : ""}</td>
        <td>${t.pesoCorporal || "—"}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
}

// ---------------------------------------------------------------------------
// Tabla de equivalencias vías -> boulders
// ---------------------------------------------------------------------------

function tablaEquivalencias() {
  return `<details class="equivalencias">
    <summary>Tabla de equivalencias vías → boulders</summary>
    <p class="ayuda">Cada vía se divide en tramos de ${METROS_POR_TRAMO} m (≈ 6 movimientos, un boulder).
      Un tramo es el crux y vale un boulder de su grado; los demás son escalada continua y valen
      ${DESCUENTO_TRAMO} grados V menos. Todo se multiplica por ${FACTOR_VIA}.
      Cada celda: boulders equivalentes e intensidad.</p>
    <div class="tabla-scroll"><table class="tabla tabla-equiv">
      <thead><tr><th>Vía</th><th>Crux</th>${LARGOS_TABLA.map((m) => `<th>${m} m</th>`).join("")}</tr></thead>
      <tbody>${VIAS.map((v) => `<tr>
        <th>${v.yds}<small>${v.fr}</small></th>
        <td>${textoV(v.crux)}</td>
        ${LARGOS_TABLA.map((m) => {
          const d = descomponerVia(v.yds, m);
          return `<td><b>${d.intensidad}</b><small>${d.texto}</small></td>`;
        }).join("")}
      </tr>`).join("")}</tbody>
    </table></div>
  </details>`;
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export function mostrarEstadisticas(contenedor, sesiones) {
  function dibujar() {
    const datos = modo === "diario" ? datosDiarios(sesiones) : datosMensuales(sesiones);
    contenedor.innerHTML = `
      <h2>Estadísticas</h2>

      <section class="seccion">
        <div class="seccion-cabecera">
          <h3>Intensidad</h3>
          <div class="chips">
            <button type="button" class="chip ${modo === "diario" ? "activo" : ""}" data-est="diario">Diaria</button>
            <button type="button" class="chip ${modo === "mensual" ? "activo" : ""}" data-est="mensual">Mensual</button>
          </div>
        </div>
        <p class="ayuda">${modo === "diario"
          ? "Un punto por cada día que escalaste (suma de todas las sesiones del día)."
          : "Suma de la intensidad de todos los días de escalada del mes."}</p>
        ${grafico(datos)}
      </section>

      <section class="seccion">
        <h3>Benchmarks del entrenamiento</h3>
        <p class="ayuda">Lo mejor registrado en tus sesiones normales.</p>
        ${benchmarks(sesiones)}
      </section>

      <section class="seccion">
        <h3>Tests máximos</h3>
        ${seccionTests(sesiones)}
      </section>

      <section class="seccion">
        <h3>Equivalencias</h3>
        ${tablaEquivalencias()}
      </section>`;

    // Mostrar lo más reciente: desplazar el gráfico al final.
    const scroll = contenedor.querySelector(".grafico-scroll");
    if (scroll) scroll.scrollLeft = scroll.scrollWidth;
  }

  function alHacerClick(ev) {
    const b = ev.target.closest("[data-est]");
    if (!b) return;
    modo = b.dataset.est;
    dibujar();
  }

  contenedor.addEventListener("click", alHacerClick);
  dibujar();
  return () => contenedor.removeEventListener("click", alHacerClick);
}
