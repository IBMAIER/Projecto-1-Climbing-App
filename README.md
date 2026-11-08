# Bitácora de escalada

App web para registrar sesiones de escalada y entrenamiento, y seguir la
**intensidad** de cada sesión. Funciona en el celular y en el PC, se puede
instalar como app y funciona sin señal.

El plan de entrenamiento y el diseño completo están en el archivo [`context`](context).

## Intensidad

```
Intensidad = Σ (bloques encadenados × grado V) + Σ (vías encadenadas × equivalente V)
```

Ejemplo: 10 V4 + 10 V5 + 5 V6 → 10·4 + 10·5 + 5·6 = **120**.

### Equivalencia vías → boulders

Cada vía se descompone en boulders según su grado y su largo:

1. Se divide en **tramos de 5 m** (≈ 6 movimientos, el largo de un boulder).
2. **1 tramo es el crux:** vale un boulder del grado crux de la vía (columna Crux; medio grado V por letra, anclado en 5.12d → V5).
3. **Los demás tramos** son escalada continua: valen **2 grados V menos** que el crux (mínimo V0).

```
Intensidad de la vía = crux + (tramos − 1) × (crux − 2)
```

En cada bloque de vías, roca o resistencia se indica el **largo típico** de las vías (por defecto 20 m).
Los parámetros están en `js/calculos.js` (`VIAS`, `METROS_POR_TRAMO`, `DESCUENTO_TRAMO`).
La tabla también está en la app: **Estadísticas → Equivalencias**.

| Vía | Crux | 10 m | 15 m | 20 m | 25 m | 30 m | 35 m |
|---|---|---|---|---|---|---|---|
| 5.9 (5c) | V0 | **0** 1×V0 + 1×V0 | **0** 1×V0 + 2×V0 | **0** 1×V0 + 3×V0 | **0** 1×V0 + 4×V0 | **0** 1×V0 + 5×V0 | **0** 1×V0 + 6×V0 |
| 5.10a (6a) | V0 | **0** 1×V0 + 1×V0 | **0** 1×V0 + 2×V0 | **0** 1×V0 + 3×V0 | **0** 1×V0 + 4×V0 | **0** 1×V0 + 5×V0 | **0** 1×V0 + 6×V0 |
| 5.10b (6a+) | V0 | **0** 1×V0 + 1×V0 | **0** 1×V0 + 2×V0 | **0** 1×V0 + 3×V0 | **0** 1×V0 + 4×V0 | **0** 1×V0 + 5×V0 | **0** 1×V0 + 6×V0 |
| 5.10c (6b) | V0/1 | **0.5** 1×V0/1 + 1×V0 | **0.5** 1×V0/1 + 2×V0 | **0.5** 1×V0/1 + 3×V0 | **0.5** 1×V0/1 + 4×V0 | **0.5** 1×V0/1 + 5×V0 | **0.5** 1×V0/1 + 6×V0 |
| 5.10d (6b+) | V1 | **1** 1×V1 + 1×V0 | **1** 1×V1 + 2×V0 | **1** 1×V1 + 3×V0 | **1** 1×V1 + 4×V0 | **1** 1×V1 + 5×V0 | **1** 1×V1 + 6×V0 |
| 5.11a (6c) | V1/2 | **1.5** 1×V1/2 + 1×V0 | **1.5** 1×V1/2 + 2×V0 | **1.5** 1×V1/2 + 3×V0 | **1.5** 1×V1/2 + 4×V0 | **1.5** 1×V1/2 + 5×V0 | **1.5** 1×V1/2 + 6×V0 |
| 5.11b (6c) | V2 | **2** 1×V2 + 1×V0 | **2** 1×V2 + 2×V0 | **2** 1×V2 + 3×V0 | **2** 1×V2 + 4×V0 | **2** 1×V2 + 5×V0 | **2** 1×V2 + 6×V0 |
| 5.11c (6c+) | V2/3 | **3** 1×V2/3 + 1×V0/1 | **3.5** 1×V2/3 + 2×V0/1 | **4** 1×V2/3 + 3×V0/1 | **4.5** 1×V2/3 + 4×V0/1 | **5** 1×V2/3 + 5×V0/1 | **5.5** 1×V2/3 + 6×V0/1 |
| 5.11d (7a) | V3 | **4** 1×V3 + 1×V1 | **5** 1×V3 + 2×V1 | **6** 1×V3 + 3×V1 | **7** 1×V3 + 4×V1 | **8** 1×V3 + 5×V1 | **9** 1×V3 + 6×V1 |
| 5.12a (7a+) | V3/4 | **5** 1×V3/4 + 1×V1/2 | **6.5** 1×V3/4 + 2×V1/2 | **8** 1×V3/4 + 3×V1/2 | **9.5** 1×V3/4 + 4×V1/2 | **11** 1×V3/4 + 5×V1/2 | **12.5** 1×V3/4 + 6×V1/2 |
| 5.12b (7b) | V4 | **6** 1×V4 + 1×V2 | **8** 1×V4 + 2×V2 | **10** 1×V4 + 3×V2 | **12** 1×V4 + 4×V2 | **14** 1×V4 + 5×V2 | **16** 1×V4 + 6×V2 |
| 5.12c (7b+) | V4/5 | **7** 1×V4/5 + 1×V2/3 | **9.5** 1×V4/5 + 2×V2/3 | **12** 1×V4/5 + 3×V2/3 | **14.5** 1×V4/5 + 4×V2/3 | **17** 1×V4/5 + 5×V2/3 | **19.5** 1×V4/5 + 6×V2/3 |
| 5.12d (7c) | V5 | **8** 1×V5 + 1×V3 | **11** 1×V5 + 2×V3 | **14** 1×V5 + 3×V3 | **17** 1×V5 + 4×V3 | **20** 1×V5 + 5×V3 | **23** 1×V5 + 6×V3 |
| 5.13a (7c+) | V5/6 | **9** 1×V5/6 + 1×V3/4 | **12.5** 1×V5/6 + 2×V3/4 | **16** 1×V5/6 + 3×V3/4 | **19.5** 1×V5/6 + 4×V3/4 | **23** 1×V5/6 + 5×V3/4 | **26.5** 1×V5/6 + 6×V3/4 |
| 5.13b (8a) | V6/7 | **11** 1×V6/7 + 1×V4/5 | **15.5** 1×V6/7 + 2×V4/5 | **20** 1×V6/7 + 3×V4/5 | **24.5** 1×V6/7 + 4×V4/5 | **29** 1×V6/7 + 5×V4/5 | **33.5** 1×V6/7 + 6×V4/5 |
| 5.13c (8a+) | V7 | **12** 1×V7 + 1×V5 | **17** 1×V7 + 2×V5 | **22** 1×V7 + 3×V5 | **27** 1×V7 + 4×V5 | **32** 1×V7 + 5×V5 | **37** 1×V7 + 6×V5 |
| 5.13d (8b) | V8 | **14** 1×V8 + 1×V6 | **20** 1×V8 + 2×V6 | **26** 1×V8 + 3×V6 | **32** 1×V8 + 4×V6 | **38** 1×V8 + 5×V6 | **44** 1×V8 + 6×V6 |
| 5.14a (8b+) | V8/9 | **15** 1×V8/9 + 1×V6/7 | **21.5** 1×V8/9 + 2×V6/7 | **28** 1×V8/9 + 3×V6/7 | **34.5** 1×V8/9 + 4×V6/7 | **41** 1×V8/9 + 5×V6/7 | **47.5** 1×V8/9 + 6×V6/7 |

V0/1 = entre V0 y V1. Como en la fórmula un V0 vale 0, las vías de 5.11b o menos casi no suman intensidad.

## Pantallas

- **Hoy:** qué toca, botón para registrar el día planificado, avisos de codo y resumen semanal.
- **Calendario:** días pasados con lo realizado; hoy y días futuros con lo planificado.
  Tocar un día muestra el detalle completo (bloques, tiempos, ejercicios, objetivo y resultado)
  o la planificación con botón para registrarla.
- **Registrar:** eliges un día prediseñado (Board, Resistencia, Max boulder, Roca, Físico A/B,
  Test máximo o Sesión libre) y agregas, quitas o reordenas bloques: calentamiento, fuerza de
  dedos, board, boulder, resistencia, vías, roca, físico, test máximo u otro.
- **Estadísticas:** intensidad diaria (solo días de escalada) o mensual, benchmarks del
  entrenamiento (half crimp, pinza, board, boulder, vías, resistencia) y resumen de tests máximos.
- **Historial:** sesiones por semana con filtro por tipo.

### Plan semanal

Lunes board · martes físico A · miércoles descanso · jueves resistencia · viernes físico B ·
sábado roca o max boulder · domingo descanso. Se edita en `js/calculos.js` (`PLAN_SEMANA`).

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada: estructura y navegación |
| `css/estilos.css` | Diseño (celular primero) |
| `js/app.js` | Arranque, login, navegación y pantallas Hoy / Historial |
| `js/formularios.js` | Pantalla Registrar: sesión armada por bloques |
| `js/calendario.js` | Pantalla Calendario y detalle de cada día |
| `js/estadisticas.js` | Gráfico de intensidad, benchmarks y tests |
| `js/ui.js` | Piezas compartidas: tarjetas y detalle de sesión |
| `js/calculos.js` | Plan, plantillas, grados, equivalencias, intensidad y fechas |
| `js/db.js` | Único archivo que habla con la base de datos |
| `js/config.js` | Claves de Firebase (vacías = modo local) |
| `sw.js` | Service worker: uso sin señal |
| `manifest.json` | Nombre e ícono para instalar en el celular |
| `firestore.rules` | Reglas de seguridad de Firestore |

## Probarla en el PC

Desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

Sin Firebase configurado funciona en **modo local**: los datos quedan solo en
ese navegador.

## Publicarla (GitHub Pages)

1. En GitHub: **Settings → Pages**.
2. En *Source* elegir **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Guardar. En 1-2 minutos queda en
   `https://ibmaier.github.io/Projecto-1-Climbing-App/`.

En el celular: abrir esa dirección en Chrome → menú → **Agregar a pantalla de inicio**.

## Conectar Firebase (para sincronizar celular y PC)

1. Entrar a <https://console.firebase.google.com> y crear un proyecto (gratis).
2. **Build → Authentication → Comenzar → Google** → habilitar.
3. **Authentication → Settings → Authorized domains** → agregar `ibmaier.github.io`.
4. **Build → Firestore Database → Crear base de datos** (modo producción).
5. En **Firestore → Rules**, pegar el contenido de `firestore.rules` y publicar.
6. **Configuración del proyecto → Tus apps → Web (`</>`)** → registrar la app y
   copiar los valores de `firebaseConfig` en `js/config.js`.

Los valores de `config.js` no son secretos; la protección está en las reglas.
