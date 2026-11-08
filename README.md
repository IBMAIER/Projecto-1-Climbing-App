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
4. **Todo se multiplica por 3** (`FACTOR_VIA`).

```
Intensidad de la vía = 3 × [crux + (tramos − 1) × (crux − 2)]
```

En cada bloque de vías, roca o resistencia se indica el **largo típico** de las vías (por defecto 20 m).
Los parámetros están en `js/calculos.js` (`VIAS`, `FACTOR_VIA`, `METROS_POR_TRAMO`, `DESCUENTO_TRAMO`).
La tabla también está en la app: **Estadísticas → Equivalencias**.

| Vía | Crux | 10 m | 15 m | 20 m | 25 m | 30 m | 35 m |
|---|---|---|---|---|---|---|---|
| 5.9 (5c) | V0 | **0** 3×V0 + 3×V0 | **0** 3×V0 + 6×V0 | **0** 3×V0 + 9×V0 | **0** 3×V0 + 12×V0 | **0** 3×V0 + 15×V0 | **0** 3×V0 + 18×V0 |
| 5.10a (6a) | V0 | **0** 3×V0 + 3×V0 | **0** 3×V0 + 6×V0 | **0** 3×V0 + 9×V0 | **0** 3×V0 + 12×V0 | **0** 3×V0 + 15×V0 | **0** 3×V0 + 18×V0 |
| 5.10b (6a+) | V0 | **0** 3×V0 + 3×V0 | **0** 3×V0 + 6×V0 | **0** 3×V0 + 9×V0 | **0** 3×V0 + 12×V0 | **0** 3×V0 + 15×V0 | **0** 3×V0 + 18×V0 |
| 5.10c (6b) | V0/1 | **1.5** 3×V0/1 + 3×V0 | **1.5** 3×V0/1 + 6×V0 | **1.5** 3×V0/1 + 9×V0 | **1.5** 3×V0/1 + 12×V0 | **1.5** 3×V0/1 + 15×V0 | **1.5** 3×V0/1 + 18×V0 |
| 5.10d (6b+) | V1 | **3** 3×V1 + 3×V0 | **3** 3×V1 + 6×V0 | **3** 3×V1 + 9×V0 | **3** 3×V1 + 12×V0 | **3** 3×V1 + 15×V0 | **3** 3×V1 + 18×V0 |
| 5.11a (6c) | V1/2 | **4.5** 3×V1/2 + 3×V0 | **4.5** 3×V1/2 + 6×V0 | **4.5** 3×V1/2 + 9×V0 | **4.5** 3×V1/2 + 12×V0 | **4.5** 3×V1/2 + 15×V0 | **4.5** 3×V1/2 + 18×V0 |
| 5.11b (6c) | V2 | **6** 3×V2 + 3×V0 | **6** 3×V2 + 6×V0 | **6** 3×V2 + 9×V0 | **6** 3×V2 + 12×V0 | **6** 3×V2 + 15×V0 | **6** 3×V2 + 18×V0 |
| 5.11c (6c+) | V2/3 | **9** 3×V2/3 + 3×V0/1 | **10.5** 3×V2/3 + 6×V0/1 | **12** 3×V2/3 + 9×V0/1 | **13.5** 3×V2/3 + 12×V0/1 | **15** 3×V2/3 + 15×V0/1 | **16.5** 3×V2/3 + 18×V0/1 |
| 5.11d (7a) | V3 | **12** 3×V3 + 3×V1 | **15** 3×V3 + 6×V1 | **18** 3×V3 + 9×V1 | **21** 3×V3 + 12×V1 | **24** 3×V3 + 15×V1 | **27** 3×V3 + 18×V1 |
| 5.12a (7a+) | V3/4 | **15** 3×V3/4 + 3×V1/2 | **19.5** 3×V3/4 + 6×V1/2 | **24** 3×V3/4 + 9×V1/2 | **28.5** 3×V3/4 + 12×V1/2 | **33** 3×V3/4 + 15×V1/2 | **37.5** 3×V3/4 + 18×V1/2 |
| 5.12b (7b) | V4 | **18** 3×V4 + 3×V2 | **24** 3×V4 + 6×V2 | **30** 3×V4 + 9×V2 | **36** 3×V4 + 12×V2 | **42** 3×V4 + 15×V2 | **48** 3×V4 + 18×V2 |
| 5.12c (7b+) | V4/5 | **21** 3×V4/5 + 3×V2/3 | **28.5** 3×V4/5 + 6×V2/3 | **36** 3×V4/5 + 9×V2/3 | **43.5** 3×V4/5 + 12×V2/3 | **51** 3×V4/5 + 15×V2/3 | **58.5** 3×V4/5 + 18×V2/3 |
| 5.12d (7c) | V5 | **24** 3×V5 + 3×V3 | **33** 3×V5 + 6×V3 | **42** 3×V5 + 9×V3 | **51** 3×V5 + 12×V3 | **60** 3×V5 + 15×V3 | **69** 3×V5 + 18×V3 |
| 5.13a (7c+) | V5/6 | **27** 3×V5/6 + 3×V3/4 | **37.5** 3×V5/6 + 6×V3/4 | **48** 3×V5/6 + 9×V3/4 | **58.5** 3×V5/6 + 12×V3/4 | **69** 3×V5/6 + 15×V3/4 | **79.5** 3×V5/6 + 18×V3/4 |
| 5.13b (8a) | V6/7 | **33** 3×V6/7 + 3×V4/5 | **46.5** 3×V6/7 + 6×V4/5 | **60** 3×V6/7 + 9×V4/5 | **73.5** 3×V6/7 + 12×V4/5 | **87** 3×V6/7 + 15×V4/5 | **100.5** 3×V6/7 + 18×V4/5 |
| 5.13c (8a+) | V7 | **36** 3×V7 + 3×V5 | **51** 3×V7 + 6×V5 | **66** 3×V7 + 9×V5 | **81** 3×V7 + 12×V5 | **96** 3×V7 + 15×V5 | **111** 3×V7 + 18×V5 |
| 5.13d (8b) | V8 | **42** 3×V8 + 3×V6 | **60** 3×V8 + 6×V6 | **78** 3×V8 + 9×V6 | **96** 3×V8 + 12×V6 | **114** 3×V8 + 15×V6 | **132** 3×V8 + 18×V6 |
| 5.14a (8b+) | V8/9 | **45** 3×V8/9 + 3×V6/7 | **64.5** 3×V8/9 + 6×V6/7 | **84** 3×V8/9 + 9×V6/7 | **103.5** 3×V8/9 + 12×V6/7 | **123** 3×V8/9 + 15×V6/7 | **142.5** 3×V8/9 + 18×V6/7 |

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
