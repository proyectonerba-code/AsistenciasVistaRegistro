# Asistencias · Vista de Registro

Pantalla pública de checada por **NFC / QR** del Control de Asistencia NerWork.

El Terminal tiene una etiqueta (NFC o QR) con la URL `/c/<token>`. Al escanearla
se abre esta página, se **pide la ubicación**, y solo si el navegador la entrega
se registra la entrada o la salida.

> **Sin ubicación no hay registro.** Es una regla del sistema, no una restricción
> de la interfaz: el backend rechaza la marca y la deja auditada.

---

## Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Pantalla de reposo del terminal: "Acerque su tarjeta o sticker NFC". |
| `/c` | **Terminal compartida**: la etiqueta apunta aquí. Pide correo (o nombre) y valida contra la base. |
| `/c/[token]` | **Credencial personal**: la etiqueta de cada persona. Checada directa, sin preguntar nada. |

### Los dos modos

**`/c` — terminal compartida (la misma etiqueta para todos).**
1. Se genera una huella del dispositivo y se guarda en el navegador.
2. Se consulta al backend si ese dispositivo ya está asignado a alguien.
   - **Sí** → se checa directo, sin preguntar nada.
   - **No** → se pide el correo (o el nombre, como respaldo) y se valida
     contra la tabla `usuarios`. El backend devuelve una **sesión de 5 minutos**
     que autoriza una sola checada. El dispositivo queda vinculado a esa
     persona y la próxima vez se reconoce solo.
3. Se pide la ubicación y se registra.

**`/c/[token]` — credencial personal.**
1. Se consulta el token (solo lectura) para saber el nombre.
2. Se pide la ubicación y se registra.
3. El dispositivo también queda vinculado (para poder analizarlo).

### Flujo de `/c/[token]`

1. `GET /api/checar/info?token=…` — **solo lectura**: nombre, área y última marca.
2. Se solicita la geolocalización (`enableHighAccuracy`, 20 s de tiempo máximo).
3. `POST /api/checar` con `{ token, lat, lng, accuracy, dispositivo }`.
4. Resultado:
   - **Éxito** → tarjeta de confirmación: *«Hola, {nombre}»*, área, hora y botón **Aceptar**.
   - **Sin ubicación** → se explica cómo habilitarla y se ofrece **Reintentar**.
   - **Rechazo** → motivo concreto (fuera de zona, fuera de horario, doble registro…).

> El botón **Aceptar** devuelve la terminal a la pantalla de reposo, lista para
> la siguiente credencial.

---

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (ej. `https://asistencias-backend.vercel.app`). |

### 3. Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint     # tsc --noEmit
```

Para probarlo con el backend local:

```bash
# en ../AsistenciasBackend
SUPABASE_DEMO=1 npm run dev      # http://localhost:4000

# en esta carpeta
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

Y abrir `http://localhost:3000/c/BRZADF6P5V95` (token de demostración).

---

## Notas

- **Geolocalización requiere contexto seguro.** En producción la página debe
  servirse por HTTPS (Vercel lo hace por defecto); sobre `http://localhost` el
  navegador la permite.
- Si el navegador pide permiso y el usuario lo deniega, la página **no** hace
  ninguna llamada de escritura: solo explica cómo habilitarlo.
- Los permisos de ubicación se piden en el momento de la checada, no al cargar.
- El diseño sigue el sistema **Chronos Precision**: carmesí `#DC2626`, carbón
  `#111827`, tipografías Plus Jakarta Sans / Inter / JetBrains Mono.

---

## Despliegue (Vercel o Netlify)

```bash
vercel --prod
# o
npx netlify deploy --prod
```

Define `NEXT_PUBLIC_API_URL` apuntando al backend desplegado y en el backend
define `ALLOWED_ORIGIN` con el dominio de esta app (CORS).

> 🔴 `NEXT_PUBLIC_*` se incrusta en el **build**: defínela antes de desplegar
> y vuelve a desplegar si la cambias.

La guía completa (los 3 repos, orden de despliegue y lista de verificación)
está en `GUIA-DESPLIEGUE.md`.
