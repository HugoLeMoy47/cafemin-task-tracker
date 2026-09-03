# CAFEMIN · Task Tracker

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

> Aplicación web de seguimiento de tareas para equipos pequeños, con roles, evidencia fotográfica y tablero Kanban.
> Web task-tracking application for small teams, with roles, photo evidence, and a Kanban board.

---

## 🇲🇽 Español

### ¿Qué es?

CAFEMIN Task Tracker es una SPA (Single Page Application) que permite a un equipo crear, asignar y dar seguimiento a tareas operativas. Está diseñada para tres tipos de usuario con diferentes niveles de acceso, y soporta evidencia fotográfica como requisito para completar tareas.

### ✨ Funcionalidades

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔐 **Autenticación** | Registro e inicio de sesión por correo/contraseña |
| 👤 **Gestión de usuarios** | El Admin crea usuarios con rol predefinido o los modifica después |
| 📋 **Tablero Kanban** | Vista drag-and-drop para todos los roles (Pendiente → En curso → Hecho) |
| 📅 **Fecha límite** | Campo opcional con alerta visual cuando la tarea está vencida |
| 📷 **Evidencia fotográfica** | Si se requiere foto, el usuario debe subirla antes de marcar la tarea como Hecha; se guarda en un bucket privado y se abre con URL firmada |
| 📊 **Reportes** | Resumen con el flujo de tareas y métricas, más tres listados (estado, asignado, fecha) con gráfica, orden por columna y exportación a CSV |
| 🔗 **Vistas compartibles** | Filtros, pestaña y orden viven en la URL: se copia el enlace y quien lo abre ve exactamente lo mismo |
| 🗂 **Catálogos** | CRUD de categorías y áreas de trabajo con edición inline |
| ⚡ **Tiempo real** | Los cambios de otros usuarios se reflejan automáticamente |
| 📱 **Diseño para teléfono de gama básica** | Por debajo de 640 px el tablero se convierte en una lista de una columna con avance por botón; medido en 320, 360 y 412 px |
| 🌙 **Modo oscuro** | Alterna entre tema claro y oscuro; persiste entre sesiones y respeta la preferencia del sistema |

### 🎭 Roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Administrador** | Acceso completo: tareas, usuarios, catálogos y reportes. En el Kanban: crea, edita, elimina y reabre tareas. Ve todas las tareas. |
| **Gestor** | Crea y edita tareas, ve reportes. En el Kanban: crea y edita tareas, puede reabrirlas. Ve todas las tareas. |
| **Asignado** | Ve sus propias tareas. Avanza el estado arrastrando (escritorio) o con un botón (teléfono); solo hacia adelante, reabrir requiere Admin o Gestor. |

> Los nuevos usuarios quedan con rol `Asignado` hasta que un Administrador lo cambie desde la vista de Usuarios.

---

### 🚀 Configuración inicial

**1. Instalar dependencias**

```bash
npm install
```

**2. Variables de entorno**

Copia `.env.example` a `.env` y completa los valores de tu proyecto en Supabase:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> Se admite `VITE_SUPABASE_ANON_KEY` (la clave heredada, un JWT `eyJ…`) para no romper entornos existentes. Si están las dos, gana `VITE_SUPABASE_PUBLISHABLE_KEY`.

**3. Configurar Supabase**

En el **SQL Editor** de tu dashboard de Supabase, ejecuta los siguientes archivos en orden:

```
1. supabase/schema.sql
2. supabase/migrations/add_fecha_limite.sql
3. supabase/migrations/storage_evidencias_policies.sql
4. supabase/migrations/security_rls_and_stability.sql
5. supabase/migrations/add_fecha_inicio.sql
6. supabase/migrations/hardening_rls_demo_publica.sql
7. supabase/migrations/storage_evidencias_privado.sql
8. supabase/migrations/reglas_cierre_asignado.sql
9. supabase/migrations/search_path_handle_new_user.sql
10. supabase/migrations/proteger_ultimo_administrador.sql
11. supabase/migrations/desactivacion_de_usuarios.sql
```

> `add_fecha_inicio.sql` reemplaza el trigger `trg_fecha_hecho` por `trg_marcas_de_tiempo`, que además sella cuándo una tarea entra a *En curso*. Sin esa marca solo se puede medir el tiempo total, que mezcla el tiempo que la tarea pasó esperando con el que costó hacerla.

> Este orden se ejecuta entero en cada corrida de `supabase/tests/`, así que se comprueba solo. Es lo que destapó que `security_rls_and_stability.sql` volvía a crear un trigger que `schema.sql` ya había creado: una instalación nueva abortaba en el paso 4.


Después de ejecutar el schema, regístrate en la app con tu correo de administrador y luego ejecuta este SQL para asignarte el rol:

```sql
UPDATE usuarios SET rol = 'Administrador' WHERE correo = 'TU_CORREO@AQUI.COM';
```

**4. Habilitar Realtime**

En el dashboard de Supabase: `Database → Replication → tareas` → activa la tabla para recibir actualizaciones en vivo.

**5. Iniciar en desarrollo**

```bash
npm run dev
```

---

### 🗂 Estructura del proyecto

```
src/
├── App.jsx                    # Shell principal, rutas por estado y guards de rol
├── supabaseClient.js          # Único dueño de las variables de entorno; exporta
│                              #   `supabase` y `createTransientClient()`
├── config.js                  # Banderas de ambiente (VITE_DEMO_MODE)
├── main.jsx                   # Bootstrap de React
├── index.css                  # Estilos base (Tailwind)
├── components/
│   ├── Login.jsx              # Login y solicitud de restablecimiento
│   ├── UpdatePassword.jsx     # Pantalla de contraseña nueva tras el enlace de recuperación
│   ├── Navbar.jsx             # Barra de navegación con menú filtrado por rol
│   ├── DemoBanner.jsx         # Aviso de ambiente de demostración
│   ├── KanbanBoard.jsx        # Tablero drag-and-drop para todos los roles (usa @dnd-kit)
│   ├── TaskCard.jsx           # Tarjeta de tarea con acciones, foto y alerta de vencimiento
│   ├── TaskForm.jsx           # Formulario de creación/edición de tareas
│   ├── EvidenceLink.jsx       # Abre una evidencia pidiendo su URL firmada
│   ├── UserManagement.jsx     # Alta y gestión de usuarios (solo Admin)
│   ├── CatalogManagement.jsx  # CRUD de catálogos con edición inline (solo Admin)
│   ├── TemplateManagement.jsx # Gestión de perfiles y rutinas de tareas (Admin y Gestor)
│   ├── ModalAsignarPlantilla.jsx # Modal para asignar perfiles rutinarios a voluntarios
│   ├── ModalIniciarTurno.jsx  # Modal de auto-inicio de turno de voluntariado (Asignado)
│   ├── PoolTareasAbiertas.jsx # Cajón desplegable para tomar tareas abiertas del albergue
│   ├── BitacoraTurno.jsx      # Bitácora y notas de entrega de turno (todos los roles)
│   ├── ProgresoVoluntario.jsx # Barra de progreso y sentido de logro diario (Asignado)
│   ├── CelebracionVictoria.jsx# Modal de celebración con mensaje de impacto social
│   ├── ListaMovil.jsx         # El tablero por debajo de 640 px: una columna, avance por botón
│   ├── Reports.jsx            # Contenedor de reportes: pestañas, filtros y estado en la URL
│   └── reports/
│       ├── Dashboard.jsx           # Resumen: KPIs, flujo, espera vs. trabajo, recurrentes, carga
│       ├── graficas.jsx            # Gráficas por pestaña (solo componentes)
│       ├── base.jsx                # Primitivas de dibujo compartidas por las gráficas
│       ├── FlujoVertical.jsx       # El flujo en HTML para teléfono: el SVG cae a 4 px reales
│       ├── BarraFiltros.jsx        # Barra de filtros global; se pliega por debajo de 640 px
│       ├── EncabezadoOrdenable.jsx # <th> con aria-sort e indicador de dirección
│       └── CollapsibleGroup.jsx    # Grupo colapsable de filas
├── lib/                       # Lógica pura, sin React y sin Supabase: se prueba sola
│   ├── reportes.js            # Agregaciones, métricas, filtrado y ordenamiento
│   ├── enlaceReporte.js       # Estado del reporte ⇄ cadena de consulta de la URL
│   ├── errores.js             # Traductor de errores de Supabase (lista blanca)
│   ├── flujoTareas.js         # Flujo de estados: qué avance se ofrece y a quién
│   ├── csv.js                 # Construcción y descarga del CSV
│   ├── evidencias.js          # Rutas de evidencia y URLs firmadas
│   ├── plantillas.js          # Preparación y validación de tareas de rutinas/perfiles
│   ├── gamificacion.js        # Progreso de jornada y mensajes cálidos de impacto
│   └── confeti.js             # Ráfaga sutil de confeti nativo (accesible)
├── hooks/
│   ├── usePantallaChica.js    # matchMedia al corte `sm:`, leído en el primer render
│   └── useAnchoDeCaja.js      # Ancho real vía ResizeObserver: sin él el SVG escala su texto
└── utils/
    └── validation.js          # Helpers: validación de email, contraseña, tarea e imagen

pruebas/
└── movil.mjs                  # Regresión de pantalla chica (npm run test:movil)

supabase/
├── schema.sql                 # Tablas, triggers, RLS y datos iniciales
├── migrations/                # Correr en el orden de la sección «Configurar Supabase»
│   ├── add_fecha_limite.sql               # Columna fecha_limite en tareas
│   ├── storage_evidencias_policies.sql    # Políticas iniciales del bucket de evidencias
│   ├── security_rls_and_stability.sql     # WITH CHECK Asignado + trigger de columnas
│   ├── add_fecha_inicio.sql               # Marca de entrada a «En curso» (trg_marcas_de_tiempo)
│   ├── hardening_rls_demo_publica.sql     # Cierre de políticas para exposición pública
│   ├── storage_evidencias_privado.sql     # Bucket privado + acceso por propiedad de la tarea
│   ├── reglas_cierre_asignado.sql         # Reglas de cierre en base de datos (PT002-PT005)
│   ├── search_path_handle_new_user.sql    # search_path fijo en handle_new_user
│   ├── proteger_ultimo_administrador.sql  # Protección del último administrador activo
│   ├── desactivacion_de_usuarios.sql      # Desactivación segura de usuarios
│   ├── plantillas_perfil.sql              # Tablas y RLS de perfiles y rutinas para Gestor/Admin
│   └── autonomia_y_bitacora_turno.sql     # Check-in voluntario, pool de tareas abiertas y bitácora
└── seeds/
    ├── 01_cuentas_demo.sql    # Roles de las seis cuentas ficticias
    ├── 02_datos_demo.sql      # 90 tareas con fechas relativas a now()
    └── 03_plantillas_demo.sql # Perfiles y rutinas de tareas típicas de CAFEMIN
```

Cada archivo de `src/lib/` tiene su `.test.js` al lado. Ahí vive la lógica que se puede
equivocar en silencio —promedios, ventanas de tiempo, orden— justamente para poder fijarla
con pruebas sin montar un navegador.

### ⚙️ Comandos

```bash
npm run dev           # Servidor de desarrollo en localhost:5173
npm run build         # Build de producción en /dist
npm run preview       # Vista previa del build de producción

npm test              # Pruebas unitarias (Vitest)
npm run test:watch    # Pruebas en modo observador
npm run lint          # ESLint
npm run lint:fix      # ESLint con correcciones automáticas
npm run format        # Formatea con Prettier
npm run format:check  # Verifica formato sin escribir
npm run build:movil   # Arnés para la prueba de pantalla chica
npm run test:movil    # Regresión en 320/360/412 px y con letra al 130% (necesita Playwright)
```

### 🔒 Seguridad

- **RLS en todas las tablas**: los permisos se aplican en la base de datos (Supabase RLS), no solo en el cliente.
- **WITH CHECK en políticas UPDATE**: la política de Asignado tiene cláusula `WITH CHECK` para impedir auto-reasignación de tareas.
- **Trigger de columnas**: el trigger `trg_restrict_asignado_update` restringe al Asignado a solo modificar `estado` y `evidencia_url`, bloqueando cambios a cualquier otro campo a nivel DB.
- **Guards de rol en cliente**: `App.jsx` y `KanbanBoard.jsx` verifican el rol antes de permitir acciones, como capa adicional de defensa.
- **Bucket de evidencias privado**: `evidencias` no es público. La columna `tareas.evidencia_url` guarda la **ruta** del archivo (`{id_de_tarea}/{timestamp}.{ext}`), no una URL, y el cliente pide una URL firmada de 60 segundos con `createSignedUrl()` en el momento de abrirla. Las políticas de SELECT y DELETE comparan el primer segmento de la ruta contra el asignado de la tarea, así que un Asignado solo alcanza las evidencias de sus propias tareas.

  > El motivo no es formal. En un refugio para personas migrantes, una foto de evidencia puede identificar a alguien en situación de vulnerabilidad; una URL pública permanente la deja legible para cualquiera que la reenvíe.

  > ⚠️ `storage_evidencias_privado.sql` **va junto con el código que firma las URLs**. Correr la migración sobre un despliegue viejo deja las fotos inaccesibles. `toStoragePath()` tolera el formato heredado (URL pública completa) para que las filas anteriores a la migración sigan abriendo.
- **Las reglas de cierre viven en la base, no en el navegador**: un Asignado no puede cerrar una tarea que exige foto sin subirla, no puede reabrir una tarea ya cerrada, y no puede apuntar la evidencia a otra tarea ni quitarla después de cerrar. Antes de `reglas_cierre_asignado.sql` las tres eran convenciones de `KanbanBoard.jsx`, y una llamada directa a la API se las saltaba. Administrador y Gestor conservan la reapertura y el cierre sin foto: es una decisión de producto, no un olvido.

  > Los códigos `PT001`–`PT005` identifican cada regla. `supabase/tests/` ejecuta los cuatro ataques y los cinco controles previos contra un PostgreSQL real en cada corrida.
- **`search_path` fijo en todas las funciones `SECURITY DEFINER`**: es el hallazgo que el Security Advisor de Supabase marca como *Function Search Path Mutable*. La suite lo verifica sola, así que no depende de acordarse de mirar el panel.
- **Ningún error crudo llega a pantalla**: `src/lib/errores.js` traduce los fallos de Supabase y Postgres con **lista blanca, no lista negra** — solo sale un texto que escribimos nosotros; lo que no se reconoce se sustituye por un respaldo. Una lista negra falla el día que aparece un mensaje que nadie anticipó, y ese día es justo cuando importa: un fallo de RLS o de índice único trae el nombre de la tabla, de la columna o de la política.

  > El login usa `mensajeDeLogin`, que colapsa **cualquier** distinción entre estados de cuenta —incluido un error inesperado—. Es el único punto donde el servidor responde a alguien que todavía no se identificó, y una diferencia de texto entre «no existe» y «contraseña incorrecta» convierte la pantalla en un detector de correos registrados.
- **El CSV no ejecuta fórmulas**: un valor que empiece por `=`, `+`, `-` o `@` se antepone con apóstrofo. El entrecomillado de CSV es correcto para el formato pero no impide que Excel evalúe la celda, y este reporte está hecho justamente para abrirse en la computadora de un tercero.
- **Content-Security-Policy generada al construir**: `build/cabeceras.js` produce `dist/_headers`. No se puede escribir a mano porque necesita dos cosas que solo existen al construir: el origen de Supabase (una variable de entorno; escribirlo fijo ataría el archivo a un proyecto) y el **hash del script en línea de `index.html`**.

  > Ese hash es la parte delicada. El script en línea marca si la página se abrió desde un enlace de recuperación de contraseña, y tiene que correr **antes** que el bundle. Una `script-src 'self'` a secas lo bloquea, y entonces quien sigue un enlace de recuperación entra a la aplicación normal sin cambiar nada: un agujero de seguridad silencioso introducido por una medida de seguridad. Por eso el plugin tira el build si no encuentra el script.

  > `script-src` **no** lleva `unsafe-inline` — es la directiva que da todo el valor. `style-src` sí, porque las gráficas usan `style={{…}}` de React en once sitios; la alternativa (`style-src-attr`) deja los tooltips fuera de sitio en navegadores que no la entienden, y el riesgo no compensa cuando la revisión no encontró ningún vector de XSS.
- **HTTPS obligatorio por un año**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Faltaba, y no se descubrió leyendo el repositorio sino **las cabeceras que Cloudflare sirve de verdad** — que es la única comprobación que vale, porque generar el archivo `_headers` no prueba que llegue al navegador. Sin HSTS, la primera visita que alguien escribe a mano (`cafemintt…` sin `https://`) sale por HTTP y admite que se la intercepten antes del redirect. **No lleva `preload` a propósito**: entrar a la lista de precarga de los navegadores es fácil y salir tarda meses.
- **No se puede dejar el sistema sin Administrador**: `proteger_ultimo_administrador.sql` rechaza degradar o borrar al último (`PT006`). La salida, si no, sería el SQL Editor de Supabase — justo el conocimiento que esta aplicación existe para no exigirle a un refugio.
- **El acceso se desactiva, no se borra**: el botón de la vista de Usuarios llama a `desactivar_usuario()`, que marca `activo = false` —lo que hace que `get_my_role()` devuelva nulo y **todas** las políticas denieguen, incluso a una sesión ya abierta— y además banea la cuenta en Auth, así que la credencial deja de servir. Dos capas, porque cada una tapa el hueco de la otra: la marca no impide autenticarse, el baneo no toca una sesión abierta.

  > **Por qué desapareció el botón de eliminar.** Borraba la fila de `usuarios` y nada más: la cuenta de autenticación seguía viva, y —lo que nadie había visto— `tareas.asignado_id` tiene `on delete set null`, así que **desasignaba en silencio todas sus tareas, incluidas las ya cerradas**. En un sistema cuyo argumento es la trazabilidad, borrar quién cerró una tarea es peor que el problema de acceso. Si de verdad hay que eliminar a alguien, se hace desde el panel de Supabase, donde quien lo haga ve lo que está borrando.
- **Credenciales en `.env`**: nunca se commitean al repositorio.
- **Creación de usuarios sin reemplazar sesión**: la función de alta de usuarios usa un cliente Supabase con `persistSession: false` para que el Admin no pierda su sesión activa.

---

### 📊 Reportes

Cuatro pestañas. **Resumen** llega primero porque quien entra a reportes quiere saber cómo va todo antes de escarbar en un listado; las otras tres —**Por Estado**, **Por Asignado**, **Por Fecha**— listan tareas agrupadas.

**El resumen** responde a las preguntas que un listado no contesta: cuántas tareas hay y qué proporción está cerrada, cuántas están vencidas, cuánto tarda una tarea de alta a cierre, cómo se reparte el trabajo por persona, categoría y área, qué tareas se repiten, y —el punto del tablero de flujo— dónde se atoran. Las cajas son inventario y las flechas son movimiento, con grosor proporcional.

> **Espera y trabajo se miden sobre la misma población.** `metricasPorPersona` compara solo tareas cerradas *que además tienen marca de inicio*: mezclar la espera de todas las empezadas con el trabajo de las cerradas produce dos barras que no se pueden sumar. Por eso `add_fecha_inicio.sql` es obligatoria para que el resumen diga algo.

**Una sola barra de filtros, arriba de las pestañas.** Búsqueda por nombre (ignora acentos y mayúsculas), periodo, persona —incluida la opción sintética *Sin asignar*—, estado, área y categoría. Se combinan con Y. Filtras una vez y responden el resumen, las tres pestañas **y la exportación**: el CSV entrega exactamente lo que estás viendo.

**Orden por columna.** Clic en el encabezado. Las fechas arrancan de más nueva a más vieja y el texto de la A a la Z, porque es lo que se busca en cada caso. Los nulos quedan al final en ambas direcciones: una tarea sin cerrar no es «la más antigua». El estado ordena por el flujo (Pendiente → En curso → Hecho), no alfabéticamente. El criterio **no se comparte entre pestañas**: cada una muestra columnas distintas y arrastrarlo dejaría las filas ordenadas por algo que ahí no se ve.

**La vista se comparte por su URL.** Periodo, persona, estado, área, categoría, pestaña y orden viven en la cadena de consulta, así que copiar la dirección basta para que otra persona abra exactamente lo mismo. Hay un botón *Copiar enlace de esta vista* porque, sin él, nadie descubre que la URL cambió.

> **La búsqueda por nombre NO viaja en la URL, a propósito.** Todos los demás filtros solo pueden tomar valores que ya existen en los catálogos; la búsqueda es texto libre, y en un refugio para personas migrantes lo que alguien teclee ahí puede ser el nombre de una persona atendida. Una URL se pega en correos, queda en el historial del navegador y sobrevive al motivo por el que se compartió. Cuando hay una búsqueda activa, la barra lo avisa junto al botón de copiar.

- Solo se escribe lo que se aparta del valor por defecto: entrar y no tocar nada deja la URL limpia, y un enlace con parámetros dice de verdad qué se filtró.
- Se usa `replaceState`, no `pushState`: el buscador dispara un cambio por tecla y con historial el botón «atrás» exigiría una pulsación por letra tecleada.
- Los valores de conjunto cerrado —pestaña, periodo, estado, campo y dirección de orden— se validan; un enlace mal editado abre el reporte normal en vez de romperse.
- Una persona o un área que ya no existe en los datos se descarta al cargar. Dejarla puesta mostraría el selector en blanco y la tabla en cero, sin nada que explique por qué.

El módulo `src/lib/enlaceReporte.js` es puro —cadena entra, estado sale— para poder fijar el ida y vuelta con pruebas sin navegador. `Reports.jsx` es el único que toca `window.history`.

---

### 📱 El tablero en un teléfono

Por debajo de **640 px** (el corte `sm:` de Tailwind) el Kanban no se estrecha: **cambia de forma**. Una columna a la vez con un selector de estado arriba, y el avance por **botón** —«Marcar en curso», «Marcar hecha»— en lugar de arrastrar.

> **Por qué, con los números.** El tablero de tres columnas ocupa **692 px**. En un Android de 360 —el más común de gama de entrada— se ven **328**: la columna «Hecho» empieza en el píxel 500 y ni siquiera el centro de la zona para soltar «En curso» cabe, queda en el 362. En ese aparato **no hay una sola zona de destino visible**, así que el gesto que el producto le pide a quien hace el trabajo no tiene a dónde llegar.

> **No se arregla estrechando columnas.** Tres de 220 px no entran en 360, y a 160 el texto de las tarjetas deja de caber. Lo que no sobrevive a la pantalla chica no es el diseño: es el modelo de interacción, porque arrastrar presupone ver origen y destino a la vez.

> **Y no es un modo degradado.** Incluso donde el arrastre funciona, en un teléfono es un gesto caro, y con una sola mano —que es como se usa esto mientras se carga algo— es peor. Un toque con el destino escrito en el botón es más rápido que el tablero.

El botón **anuncia la foto antes de pulsarse** (`Marcar hecha 📷`): un diálogo que aparece sin aviso, en un teléfono, se lee como un error.

Las dos formas de mover una tarea —arrastre y botón— pasan por **una sola función**, `moverTarea` en `KanbanBoard.jsx`, que consulta `src/lib/flujoTareas.js`. Dos caminos decidiendo por su cuenta qué movimiento es válido acaban divergiendo, y el que se queda atrás es siempre el que menos se prueba. Esas reglas son un espejo de `PT002` y `PT003`; la que manda sigue siendo la base de datos.

**Medido antes y después**, con los componentes reales y datos con nombres largos:

| | Antes | Después |
|---|---|---|
| Ancho del tablero en 360 px | 692 px (se ven 328) | cabe entero |
| Zonas de destino visibles | 0 | 3, una a la vez |
| Objetivos táctiles < 44 px | — | 0 de 17 |
| Alto de tarjeta | ~380 px | 165 px |
| Tareas por pantalla | 1½ | 3 |

---

### 📱 Los reportes en un teléfono

El tablero se rehízo para la pantalla chica; los reportes se corrigieron sobre lo que ya había. Cuatro hallazgos, todos de **medir el render real** a 320, 360 y 412 px, no de leer el código:

**1. El diagrama de flujo no se podía leer.** El SVG usa un `viewBox` de 700 px y en un Android de 360 se pinta a 294 — escala 0.42. Sus etiquetas de 10 px aterrizaban a **4.0 px reales**. Los números grandes sobrevivían; las palabras que los explican, no. Por debajo de 640 px se dibuja `reports/FlujoVertical.jsx`: el mismo dato en HTML, hacia abajo en vez de a lo ancho, con texto que además respeta el tamaño de letra que la persona configuró en su teléfono. En un refugio, con gente de todas las edades, eso no es un detalle.

**2. Una de las cuatro pestañas era invisible.** Estaban en un `overflow-x-auto`: en 360 px, «Por Fecha» empezaba en x=355 sin ninguna señal de que existiera. Ahora las cuatro se acomodan en dos filas.

**3. Once objetivos táctiles por debajo de 44 px.** El buscador y los cinco selectores medían 34 px de alto; los dos botones con forma de enlace, 16 px. Con un dedo, y no con un ratón, son blancos que se fallan.

**4. Y arreglar el punto 3 rompió otra cosa.** Con los seis campos a 44 px, la barra de filtros ocupaba los 640 px completos de la pantalla: se abría «Reportes» y no se veía **ni un solo número**, solo controles para filtrar datos que aún no se habían visto. Por debajo de 640 px la barra ahora se pliega a un botón `Filtros ▾`. Se abre sola cuando el enlace ya traía filtros aplicados — si alguien comparte una vista filtrada, esconder el motivo por el que se ven 12 tareas y no 42 sería cambiar un problema por otro.

| Reportes a 360 px | Antes | Después |
|---|---|---|
| Texto más chico del diagrama de flujo | 4.0 px reales | 12 px (HTML) |
| Pestañas alcanzables sin descubrir un scroll | 3 de 4 | 4 de 4 |
| Objetivos táctiles < 44 px | 11 de 11 | 0 de 12 |
| Nodos de texto < 12 px | 14 | 0 |
| Alto de la barra de filtros | 640 px (la pantalla) | 154 px plegada |
| Desborde horizontal del documento | 0 px | 0 px |

### 📱 La pantalla de login

Se midió aparte, y tarde, porque **el arnés móvil no la ve**: simula Supabase y arranca ya con sesión, así que `Login.jsx` y `UpdatePassword.jsx` —las dos pantallas sin sesión, y las únicas que toca el 100% de la gente— nunca entraron en ninguna medición. Salieron a la luz leyendo el sitio ya desplegado: los campos de correo y contraseña medían **42 px** y el enlace de «¿Olvidaste tu contraseña?», **20 px**.

Y hay un detalle que solo aparece midiendo la build local: con `VITE_DEMO_MODE=true`, producción **oculta** los enlaces de registro, así que revisar el sitio publicado no puede encontrarlos. Medidos sin esa bandera, eran otros dos enlaces de 20 px.

| Login a 320 / 360 / 412 px | Antes | Después |
|---|---|---|
| Objetivos táctiles < 44 px | 3 de 5 (y 2 más ocultos por la bandera de demo) | **0 de 5** |
| Desborde horizontal | 0 px | 0 px |

### 📱 Las gráficas, y la prueba que las cazó

El error de fondo era uno solo, y estaba en las cinco gráficas: **`viewBox` fijo con `w-full`**. Un `<svg viewBox="0 0 600 160" class="w-full">` no dibuja a 600 px, dibuja a lo ancho que le toque y escala todo lo que hay dentro, el texto incluido. En un Android de 360 se pintaba a 294 px —escala 0.49— y una etiqueta declarada de 13 px aterrizaba a **6.4 px reales**.

Lo importante de ese error es que **es invisible leyendo el código**. El número está ahí, dice 13, y es correcto; lo que no está en el código es el factor por el que se multiplica. Por eso sobrevivió a tres rondas de trabajo en móvil.

El arreglo es `src/hooks/useAnchoDeCaja.js`: se mide el hueco real y el `viewBox` se construye con ese número, así que la escala es 1 y 13 px son 13 px. Y eso abre la mitad que de verdad importa — con el ancho real a la mano, cada gráfica **reparte** el espacio distinto cuando hay poco: por debajo de 420 px el nombre se va encima de su barra en vez de pelear con ella por los mismos píxeles. Encoger no hace legible nada.

La tabla «Tareas que se repiten» no se encogió: por debajo de 640 px se vuelve una lista de fichas donde cada número lleva su etiqueta, porque cuatro columnas con nombres de tarea largos no caben en 254 px a un tamaño que se lea.

**`npm run test:movil`** es lo que hace que nada de esto se pierda. Levanta el arnés, monta los componentes reales con datos simulados y mide seis cosas en cada vista y cada escenario:

| # | Comprobación | El defecto real que la motivó |
|---|---|---|
| 1 | La página no se sale de la pantalla | El tablero pedía 692 px en 360 |
| 2 | Nada interactivo por debajo de 44 px | Once objetivos, y los del login a 42 px |
| 3 | Texto HTML de 12 px para arriba | Cabeceras de tabla a 10 px |
| 4 | **Texto de SVG en píxeles REALES** (tamaño × escala) | Las cinco gráficas, a 4.1–7.5 px |
| 5 | Nada escondido tras scroll lateral interno | «Por Fecha» invisible; la tabla ocultando 166 px |
| 6 | Las etiquetas no se pegan a su barra | «Acompañamiento» montado sobre la suya |

Cubre login *sin sesión*, el tablero y las cuatro pestañas de reportes, en 320, 360, 412 px y a 360 px con la letra del sistema al 130%. **24 comprobaciones.**

Vale la pena decir cómo se comportó: en su primera corrida encontró **dos defectos que no estaban en la lista** —las cabeceras colapsables a 32 px y texto de tabla a 10 px— y su comprobación 6 nació de un fallo que la propia prueba no vio y sí se vio en una captura. Cuando se calibró contra ese caso real, resultó que el solape era de **1.6 px**: cualquier chequeo de «¿se enciman?» lo habría dejado pasar. Por eso exige un hueco mínimo en vez de castigar la intersección.

> Correr `npm run test:movil` necesita Playwright, que **no** es dependencia de la aplicación. Si falta, la prueba lo dice y explica cómo instalarlo; nunca revienta con un error de módulo. Primero `npm run build:movil`.

**Lo que sigue abierto, medido y sin arreglar:** con la letra del sistema al **200%** —el máximo de accesibilidad de Android— la aplicación no aguanta: los reportes desbordan, «CAFEMIN» se sale de su caja en el login y las etiquetas de las gráficas se montan. La causa es que las gráficas colocan sus etiquetas con desplazamientos fijos en píxeles (18, 20, 42) mientras el texto crece con el ajuste del sistema. Arreglarlo es pasar la maquetación de las gráficas a unidades relativas — un trabajo aparte, no un ajuste. La prueba fija **130%**, que es el «texto grande» de uso corriente y que sí pasa entero; ese número es una decisión sobre qué se garantiza, no un arreglo del 200%.

---

### 🎭 Datos de demostración

`supabase/seeds/` contiene la semilla para dejar el sistema listo para una presentación.

> ⚠️ **Orden importante:** corre antes la migración `add_fecha_inicio.sql`. La semilla escribe esa columna, así que sin la migración falla.

1. **Crear las seis cuentas** en Authentication → Users → Add user, con *Auto Confirm* activado. No se pueden crear con SQL: `usuarios.id` referencia `auth.users(id)`. Los correos y nombres están listados en `01_cuentas_demo.sql`.
2. Correr **`01_cuentas_demo.sql`** — corrige el nombre visible y asigna los roles (1 Administrador, 2 Gestores, 3 Asignados).
3. Correr **`02_datos_demo.sql`** — amplía los catálogos y siembra 90 tareas: 55 hechas repartidas en diez semanas, 20 en curso y 15 pendientes, con dos sin asignar para que el reporte *Por Asignado* muestre el hueco.

**Es re-ejecutable.** Córrelo antes de cada sesión y el dataset vuelve a quedar fresco. Todas las fechas son relativas a `now()`: escritas como fechas fijas, a mitad de una ronda de presentaciones el tablero mostraría solo tareas vencidas y ninguna próxima.

**El borrado es quirúrgico.** Las tareas sembradas llevan un id con prefijo `cafede00-`, así que reiniciar no toca las tareas que alguien haya creado en vivo durante una demostración anterior.

Si faltan cuentas, el script se detiene con un mensaje que las nombra en vez de sembrar datos a medias.

> Las seis personas son **ficticias** a propósito: la demo vive en una URL pública. No uses nombres ni correos de personal real.

---

### 🌐 Despliegue (Cloudflare Workers · static assets)

La demostración pública vive en `https://cafemintt.freejolitos.consulting` como proyecto independiente de Cloudflare Workers con dominio personalizado. No hay código de Worker: solo se sirven los archivos estáticos que Vite construye en `dist/`. Al servirse desde la raíz del subdominio **no se requiere `base` en `vite.config.js`**.

**`wrangler.jsonc` es obligatorio.** Sin él, `wrangler deploy` intenta autodetectar el framework y falla con:

```
✘ [ERROR] The version of Vite used in the project ("5.4.21") cannot be
  automatically configured. Please update the Vite version to at least "6.0.0"
```

Ese camino automático usa el plugin de Cloudflare para Vite, que exige Vite ≥ 6. La presencia de `wrangler.jsonc` desactiva la autodetección y deja el despliegue como una simple subida de archivos, compatible con Vite 5.

**Configuración del proyecto en Cloudflare**

| Ajuste | Valor |
|--------|-------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 o superior |

El directorio de salida lo define `assets.directory` en `wrangler.jsonc`, no la interfaz de Cloudflare.

**Variables de entorno del build**

| Variable | Valor en la demo |
|----------|------------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`sb_publishable_…`) |
| `VITE_DEMO_MODE` | `true` |

La clave pública admite dos nombres: `VITE_SUPABASE_PUBLISHABLE_KEY` (clave nueva) o `VITE_SUPABASE_ANON_KEY` (clave heredada, JWT `eyJ…`). Si están las dos, gana la primera. Ambas tienen privilegios bajos y quedan sujetas a RLS.

> ⚠️ **Nunca** uses aquí `service_role`, `sb_secret_…` ni una cadena de conexión a Postgres. Vite hornea estas variables en el bundle público: quien abra las herramientas de desarrollo las leería, y esas credenciales saltan RLS por completo.

`VITE_DEMO_MODE=true` muestra el aviso de ambiente de demostración y oculta el formulario de registro. Se resuelve **al construir**: cambiarla exige un nuevo despliegue.

**En Supabase, antes de publicar**

1. Authentication → Providers → apagar *Allow new users to sign up*.
2. Authentication → URL Configuration → *Site URL* y *Redirect URLs* apuntando a `https://cafemintt.freejolitos.consulting`.
3. Crear las cuentas de demostración, una por rol, y sembrar datos ficticios.

### 🔑 Restablecimiento de contraseña

Con el registro público apagado, el alta la hace el Administrador — pero quien olvida su contraseña necesita recuperarla por su cuenta. El flujo está implementado:

1. En el login, *¿Olvidaste tu contraseña?* pide el correo y llama a `resetPasswordForEmail` con `redirectTo` al origen del sitio.
2. Supabase envía un enlace. Al seguirlo, la persona llega con una sesión temporal.
3. `index.html` marca la llegada (`window.__cafeminRecuperacion`) **antes** de que cargue el bundle, porque el cliente de Supabase consume y limpia el fragmento de la URL al inicializarse. `App.jsx` intercepta y muestra `UpdatePassword.jsx` en vez de la aplicación: sin esa guarda, quien sigue el enlace entraría sin haber cambiado nada.
4. Al guardar, se cierra la sesión para forzar un inicio con la contraseña nueva.

El mensaje de confirmación es el mismo exista o no la cuenta, para no convertir la pantalla en un detector de correos registrados.

**Longitud mínima de contraseña: 8 caracteres.** El valor vive en una sola constante, `MIN_PASSWORD_LENGTH` en `src/utils/validation.js`, de donde salen la validación, los `minLength` y los textos de ayuda.

> ⚠️ **La validación del cliente no es un control de seguridad.** Corre en el navegador y se puede saltar llamando a la API directamente. El límite que de verdad manda se configura en **Supabase → Authentication → Providers → Email → Minimum password length**, y hay que dejarlo en 8 para que coincida. La documentación de Supabase advierte que menos de 8 no es recomendable.
>
> Ahí mismo se pueden exigir clases de caracteres (dígitos, mayúsculas, símbolos). No se activaron: si se activan en Supabase sin reflejarlo en el cliente, el usuario recibe un rechazo del servidor que la interfaz no supo anticipar.
>
> En plan Pro, Supabase además puede rechazar contraseñas filtradas consultando HaveIBeenPwned. Vale la pena si el proyecto sube de plan.

> ⚠️ **Requiere SMTP propio.** El servicio de correo por defecto de Supabase solo entrega a direcciones del equipo del proyecto y permite ~2 mensajes por hora; el resto recibe *Email address not authorized*. La documentación de Supabase indica que no es para producción. **Sin SMTP configurado en Authentication → Emails → SMTP Settings, esta pantalla existe pero los correos no llegan al personal.**

> El `redirectTo` usa `window.location.origin`, así que la URL del despliegue debe estar en *Redirect URLs*.

`public/_headers` aplica `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y cacheo permanente para los assets con hash en el nombre.

> El plan gratuito de Supabase pausa proyectos con baja actividad durante 7 días. Si la demo estará dormida entre presentaciones, verifica que el proyecto siga arriba antes de compartir la URL.

---

## 🇺🇸 English

### What is it?

CAFEMIN Task Tracker is a Single Page Application for managing operational tasks within a small team. It supports three user roles with different permission levels, photo evidence requirements, and a real-time Kanban board.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email/password sign-up and login via Supabase Auth |
| 👤 **User management** | Admin creates users with a preset role or modifies them later |
| 📋 **Kanban board** | Drag-and-drop view for all roles (Pending → In progress → Done) |
| 📅 **Due date** | Optional field with visual overdue alert |
| 📷 **Photo evidence** | If required, the user must upload a photo before marking a task as Done; stored in a private bucket, opened via signed URL |
| 📊 **Reports** | A summary tab with task flow and metrics, plus three listings (status, assignee, date) with a chart, column sorting and CSV export |
| 🔗 **Shareable views** | Filters, tab and sort live in the URL: copy the link and the recipient sees exactly the same view |
| 🗂 **Catalogs** | CRUD for categories and work areas with inline editing |
| ⚡ **Real-time** | Changes from other users appear automatically |
| 📱 **Built for entry-level phones** | Below 640 px the board becomes a single-column list with tap-to-advance; measured at 320, 360 and 412 px |
| 🌙 **Dark mode** | Toggle between light and dark themes; persists across sessions and respects system preference |

### 🎭 Roles

| Role | What they can do |
|------|-----------------|
| **Administrador** | Full access: tasks, users, catalogs, and reports. On the Kanban: create, edit, delete, and reopen tasks. Sees all tasks. |
| **Gestor** | Creates and edits tasks, views reports. On the Kanban: create, edit, and reopen tasks. Sees all tasks. |
| **Asignado** | Views their own tasks. Advances state by dragging (desktop) or tapping a button (phone); forward only, reopening requires Admin or Gestor. |

> New users start with the `Asignado` role until an Administrator changes it from the Users view.

---

### 🚀 Initial setup

**1. Install dependencies**

```bash
npm install
```

**2. Environment variables**

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> The legacy `VITE_SUPABASE_ANON_KEY` (a `eyJ…` JWT) is still accepted so existing environments keep working. When both are set, `VITE_SUPABASE_PUBLISHABLE_KEY` wins.

**3. Configure Supabase**

In the **SQL Editor** of your Supabase dashboard, run the following files in order:

```
1. supabase/schema.sql
2. supabase/migrations/add_fecha_limite.sql
3. supabase/migrations/storage_evidencias_policies.sql
4. supabase/migrations/security_rls_and_stability.sql
5. supabase/migrations/add_fecha_inicio.sql
6. supabase/migrations/hardening_rls_demo_publica.sql
7. supabase/migrations/storage_evidencias_privado.sql
8. supabase/migrations/reglas_cierre_asignado.sql
9. supabase/migrations/search_path_handle_new_user.sql
10. supabase/migrations/proteger_ultimo_administrador.sql
11. supabase/migrations/desactivacion_de_usuarios.sql
```

> `add_fecha_inicio.sql` replaces the `trg_fecha_hecho` trigger with `trg_marcas_de_tiempo`, which also stamps when a task enters *En curso*. Without that stamp only total time is measurable, which conflates waiting with working.


After running the schema, sign up in the app with your admin email, then run this SQL to grant yourself the Admin role:

```sql
UPDATE usuarios SET rol = 'Administrador' WHERE correo = 'YOUR_EMAIL@HERE.COM';
```

**4. Enable Realtime**

In the Supabase dashboard: `Database → Replication → tareas` → enable the table to receive live updates.

**5. Start development**

```bash
npm run dev
```

---

### 🗂 Project structure

```
src/
├── App.jsx                    # Main shell, state-based routing and role guards
├── supabaseClient.js          # Sole owner of the env vars; exports `supabase`
│                              #   and `createTransientClient()`
├── config.js                  # Environment flags (VITE_DEMO_MODE)
├── main.jsx                   # React bootstrap
├── index.css                  # Base styles (Tailwind)
├── components/
│   ├── Login.jsx              # Login and password-reset request
│   ├── UpdatePassword.jsx     # New-password screen after the recovery link
│   ├── Navbar.jsx             # Navigation bar with role-filtered menu
│   ├── DemoBanner.jsx         # Demo-environment notice
│   ├── KanbanBoard.jsx        # Drag-and-drop board for all roles (uses @dnd-kit)
│   ├── TaskCard.jsx           # Task card with actions, photo upload and overdue alert
│   ├── TaskForm.jsx           # Task create/edit form
│   ├── EvidenceLink.jsx       # Opens an evidence photo via a freshly signed URL
│   ├── UserManagement.jsx     # User creation and management (Admin only)
│   ├── CatalogManagement.jsx  # Catalog CRUD with inline editing (Admin only)
│   ├── TemplateManagement.jsx # Routine task profiles and templates CRUD (Admin & Gestor)
│   ├── ModalAsignarPlantilla.jsx # Modal to batch-assign routine profiles to volunteers
│   ├── ModalIniciarTurno.jsx  # Volunteer self-check-in modal for daily routine profile (Asignado)
│   ├── PoolTareasAbiertas.jsx # Collapsible drawer for volunteers to claim open shelter tasks
│   ├── BitacoraTurno.jsx      # Shift handover notes and operational observations (All roles)
│   ├── ProgresoVoluntario.jsx # Volunteer daily shift progress bar and milestones (Asignado)
│   ├── CelebracionVictoria.jsx# Victory celebration modal with social impact messages
│   ├── ListaMovil.jsx         # The board below 640 px: one column, tap to advance
│   ├── Reports.jsx            # Reports container: tabs, filters and URL state
│   └── reports/
│       ├── Dashboard.jsx           # Summary: KPIs, flow, wait vs. work, recurring, load
│       ├── graficas.jsx            # Per-tab charts (components only)
│       ├── base.jsx                # Drawing primitives shared by the charts
│       ├── FlujoVertical.jsx       # The flow in HTML for phones: the SVG lands at 4 real px
│       ├── BarraFiltros.jsx        # Global filter bar; collapses below 640 px
│       ├── EncabezadoOrdenable.jsx # <th> with aria-sort and a direction indicator
│       └── CollapsibleGroup.jsx    # Collapsible row group
├── lib/                       # Pure logic — no React, no Supabase — tested on its own
│   ├── reportes.js            # Aggregations, metrics, filtering and sorting
│   ├── enlaceReporte.js       # Report state ⇄ URL query string
│   ├── errores.js             # Supabase error translator (allowlist)
│   ├── flujoTareas.js         # State flow: which move is offered, and to whom
│   ├── csv.js                 # CSV construction and download
│   ├── evidencias.js          # Evidence paths and signed URLs
│   ├── plantillas.js          # Routine templates preparation, ordering and validation
│   ├── gamificacion.js        # Volunteer shift progress & positive impact messages
│   └── confeti.js             # Accessible, lightweight native canvas confetti burst
├── hooks/
│   └── usePantallaChica.js    # matchMedia at the `sm:` breakpoint, read on first render
└── utils/
    └── validation.js          # Helpers: email, password, task and image validation

pruebas/
└── movil.mjs                  # Small-screen regression test (npm run test:movil)

supabase/
├── schema.sql                 # Tables, triggers, RLS policies and seed data
├── migrations/                # Run in the order listed under "Configure Supabase"
│   ├── add_fecha_limite.sql               # fecha_limite column in tareas
│   ├── storage_evidencias_policies.sql    # Initial evidence-bucket policies
│   ├── security_rls_and_stability.sql     # WITH CHECK for Asignado + column-lock trigger
│   ├── add_fecha_inicio.sql               # "En curso" stamp (trg_marcas_de_tiempo)
│   ├── hardening_rls_demo_publica.sql     # Policy hardening for public exposure
│   ├── storage_evidencias_privado.sql     # Private bucket + ownership-scoped access
│   ├── reglas_cierre_asignado.sql         # DB-level task-closing rules (PT002-PT005)
│   ├── search_path_handle_new_user.sql    # Pinned search_path on handle_new_user
│   ├── proteger_ultimo_administrador.sql  # Protect last active administrator
│   ├── desactivacion_de_usuarios.sql      # Safe account deactivation
│   ├── plantillas_perfil.sql              # Routine task profiles and templates with RLS
│   └── autonomia_y_bitacora_turno.sql     # Volunteer self-check-in, open task pool, and handover log
└── seeds/
    ├── 01_cuentas_demo.sql    # Roles for the six fictitious accounts
    ├── 02_datos_demo.sql      # 90 tasks with dates relative to now()
    └── 03_plantillas_demo.sql # Typical CAFEMIN volunteer profiles and routine tasks
```

Every file in `src/lib/` has its `.test.js` beside it. That is where the logic that can be
quietly wrong lives — averages, time windows, ordering — precisely so it can be pinned by
tests without booting a browser.

### ⚙️ Commands

```bash
npm run dev           # Development server at localhost:5173
npm run build         # Production build in /dist
npm run preview       # Preview the production build

npm test              # Unit tests (Vitest)
npm run test:watch    # Tests in watch mode
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix
npm run format        # Format with Prettier
npm run format:check  # Check formatting without writing
```

### 🔒 Security

- **RLS on all tables**: permissions are enforced at the database level (Supabase RLS), not just the client.
- **WITH CHECK on UPDATE policies**: the Asignado policy includes a `WITH CHECK` clause to prevent self-reassignment of tasks.
- **Column-lock trigger**: `trg_restrict_asignado_update` ensures Asignado can only modify `estado` and `evidencia_url` at the DB level, blocking all other field changes.
- **Client-side role guards**: `App.jsx` and `KanbanBoard.jsx` verify the role before allowing actions, as an additional defense-in-depth layer.
- **Private evidence bucket**: `evidencias` is not public. `tareas.evidencia_url` stores the file **path** (`{task_id}/{timestamp}.{ext}`), not a URL, and the client mints a 60-second signed URL with `createSignedUrl()` at open time. SELECT and DELETE policies match the path's first segment against the task's assignee, so an Asignado can only reach evidence for their own tasks. In a shelter for migrants, an evidence photo can identify a vulnerable person — a permanent public URL leaves that readable to anyone it is forwarded to.

  > ⚠️ `storage_evidencias_privado.sql` must ship **with** the code that signs URLs; running it against an older deployment makes photos unreachable. `toStoragePath()` tolerates the legacy full public URL so pre-migration rows keep opening.
- **Closing rules live in the database, not the browser**: an Asignado cannot close a task that requires a photo without uploading one, cannot reopen a closed task, and cannot point the evidence at another task or strip it after closing. Before `reglas_cierre_asignado.sql` all three were conventions in `KanbanBoard.jsx` that a direct API call walked past. Admin and Gestor keep both bypasses — a product decision, not an oversight. Codes `PT001`–`PT005` identify each rule; `supabase/tests/` replays the four attacks and the five pre-existing controls against a real PostgreSQL on every run.
- **`search_path` pinned on every `SECURITY DEFINER` function** — the finding Supabase's Security Advisor reports as *Function Search Path Mutable*. The suite checks it, so it does not depend on remembering to open the dashboard.
- **No raw error ever reaches the screen**: `src/lib/errores.js` translates Supabase and Postgres failures using an **allowlist, not a denylist** — only text we wrote is shown, anything unrecognized becomes a caller-supplied fallback. A denylist fails on the first message nobody anticipated, which is exactly when it matters. The login screen uses `mensajeDeLogin`, which collapses **every** account-state distinction, unexpected errors included: it is the only place the server answers someone not yet identified.
- **The CSV cannot execute formulas**: values starting with `=`, `+`, `-` or `@` are prefixed with an apostrophe. CSV quoting is correct for the format but does not stop Excel from evaluating the cell, and this report is built to be opened on someone else's machine.
- **Access is deactivated, not deleted**: the Users view calls `desactivar_usuario()`, which sets `activo = false` — making `get_my_role()` return null so every policy denies, even for an already-open session — and bans the account in Auth so the credential stops working. Two layers, because each covers the other's gap. The delete button is gone: it left the auth account alive and, worse, `tareas.asignado_id` has `on delete set null`, so it silently unassigned every task the person had closed.
- **Credentials in `.env`**: never committed to the repository.
- **User creation without session replacement**: the user creation feature uses a Supabase client with `persistSession: false` so the Admin's active session is not overwritten.

---

### 📊 Reports

Four tabs. **Resumen** (summary) comes first — a report reader wants the shape of things before digging into a listing — followed by three listings: **Por Estado**, **Por Asignado**, **Por Fecha**.

The summary answers what a listing cannot: how much is closed, how much is overdue, how long a task takes from creation to close, how the load splits by person, category and area, which tasks recur, and — the point of the flow board — where work piles up. Boxes are stock, arrows are flow with proportional thickness.

> **Wait and work are measured over the same population.** `metricasPorPersona` uses only closed tasks *that also carry a start stamp*: mixing the wait of every started task with the work of closed ones yields two bars that cannot be added. This is why `add_fecha_inicio.sql` is required for the summary to mean anything.

**One global filter bar, above the tabs**: name search (accent- and case-insensitive), period, person — including the synthetic *Sin asignar* option — status, area and category, combined with AND. Filter once and the summary, all three tabs **and the export** follow: the CSV carries exactly what is on screen.

**Column sorting.** Dates start newest-first and text A–Z, because that is what each is wanted for. Nulls stay last in both directions — an unfinished task is not "the oldest". Status sorts by flow order (Pendiente → En curso → Hecho), not alphabetically. The criterion is **not shared across tabs**: each shows different columns, and carrying it over would sort rows by something invisible there.

**The view is shared by its URL.** Period, person, status, area, category, tab and sort live in the query string, so copying the address is enough for someone else to open the same thing; a *Copiar enlace de esta vista* button makes that discoverable.

> **The name search deliberately does NOT travel in the URL.** Every other filter can only hold a value that already exists in a catalog; free text can hold the name of a person the shelter is sheltering, and a URL outlives the reason it was shared. The bar says so next to the copy button whenever a search is active.

- Only non-default values are written, so an untouched report keeps a clean URL and a link with parameters really says what was filtered.
- `replaceState`, not `pushState`: the search box fires per keystroke, and history entries would make Back require one press per letter typed.
- Closed-set values — tab, period, status, sort field and direction — are validated; a mangled link opens the normal report instead of breaking.
- A person or area no longer present in the data is dropped on load, rather than leaving a blank dropdown over an empty table with nothing to explain it.

`src/lib/enlaceReporte.js` is pure — string in, state out — so the round trip is pinned by tests without a browser. `Reports.jsx` is the only place that touches `window.history`.

---

### 📱 On a phone

**The target device is an entry-level Android at 360 px, not a designer's phone.** Every number below was measured by rendering the real components at 320, 360 and 412 px — not inferred from the code.

**The board.** Three 220 px columns do not fit in 360 px, and the failure is not the layout: dragging assumes you can see the source and the destination at once. Below 640 px, `ListaMovil.jsx` shows one state at a time and moves tasks by button, with the destination written on it. Both paths — drag and button — go through a single function, `moverTarea`, which reads `src/lib/flujoTareas.js`; two paths deciding independently which move is legal will diverge, and the one that lags is always the one tested least. Those rules mirror `PT002` and `PT003`; the database remains the authority.

**The reports.** Four defects, all found by measuring: the flow diagram's SVG labels landed at **4.0 real px** at 360 (replaced below 640 px by `FlujoVertical.jsx`, HTML that also honors the reader's system font size); one of the four tabs began at x=355 inside an `overflow-x-auto` with no cue it existed; eleven touch targets sat below 44 px; and fixing that third one made the filter bar fill the entire 640 px viewport, so the report opened on controls and zero data — hence the collapsible bar, which opens itself when the link already carried filters.

| At 360 px | Before | After |
|---|---|---|
| Board width | 692 px (328 visible) | fits |
| Visible drop targets | 0 | 3, one at a time |
| Smallest flow-diagram text | 4.0 real px | 12 px (HTML) |
| Tabs reachable without discovering a scroll | 3 of 4 | 4 of 4 |
| Touch targets < 44 px | 11 of 11 | 0 of 12 |
| Text nodes < 12 px | 14 | 0 |
| Horizontal document overflow | — | 0 px |

**Still open, measured and unfixed:** the three per-tab charts (`GraficaEstado`, `GraficaAsignado`, `GraficaSemanal`) are still 600 px-`viewBox` SVGs whose text falls to **5.1 px at 320, 5.9 px at 360 and 6.9 px at 412**. The "Tareas que se repiten" table carries `min-w-[420px]` and hides 166 px at 320 px — including the "Promedio" column — with no cue there is more. Neither was touched in this round.

---

### 🌐 Deployment (Cloudflare Workers · static assets)

The public demo lives at `https://cafemintt.freejolitos.consulting` as a standalone Cloudflare Workers project with a custom domain. There is no Worker code — it only serves the static files Vite builds into `dist/`. Because it is served from the subdomain root, **no `base` is needed in `vite.config.js`**.

**`wrangler.jsonc` is required.** Without it, `wrangler deploy` attempts framework auto-detection, which uses the Cloudflare Vite plugin and fails on Vite 5 (`Please update the Vite version to at least "6.0.0"`). The config file disables auto-detection and reduces the deploy to a plain asset upload.

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 or higher |

The output directory is set by `assets.directory` in `wrangler.jsonc`, not in the Cloudflare UI.

Build environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`) and `VITE_DEMO_MODE=true`. **Never** use `service_role`, `sb_secret_…` or a Postgres connection string — these variables are baked into the public bundle and those credentials bypass RLS entirely. The demo flag shows the demo-environment notice and hides the sign-up form; it is resolved **at build time**, so changing it requires a new deployment.

Before publishing, in Supabase: turn off *Allow new users to sign up*, set *Site URL* and *Redirect URLs* to the deployment URL, and create the demo accounts.

### 🔑 Password reset

Public sign-up is off, so accounts are created by an Administrator — but users still need to recover forgotten passwords. The flow is implemented: *Forgot your password?* on the login screen calls `resetPasswordForEmail`; `index.html` flags the recovery arrival before the bundle loads (the Supabase client consumes and clears the URL fragment on init), and `App.jsx` intercepts to render `UpdatePassword.jsx` instead of the app. The confirmation message is identical whether or not the account exists, to avoid user enumeration.

**Minimum password length: 8 characters**, defined once as `MIN_PASSWORD_LENGTH` in `src/utils/validation.js`. Client-side validation is a convenience, not a security control — set the same minimum under Supabase → Authentication → Providers → Email → Minimum password length, which is where it is actually enforced.

> ⚠️ **Requires custom SMTP.** Supabase's built-in email service only delivers to project team addresses and allows about 2 messages per hour; everyone else gets *Email address not authorized*. Without SMTP configured under Authentication → Emails, the screen exists but no mail reaches staff.

> Supabase pauses free-plan projects after 7 days of low activity. Check the project is awake before sharing the URL.

