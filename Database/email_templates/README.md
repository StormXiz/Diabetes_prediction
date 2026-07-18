# Verificación por código (OTP) al registrarse

## Por qué "no llega nada" (diagnóstico real, no es un bug de código)

Revisé los logs de Auth del proyecto (`get_logs` service `auth`): el signup sí dispara el envío
(`"event":"mail.send"`, sin error) y el registro/pantalla de 6 dígitos ya funcionan bien en el
frontend. El problema es que **el proyecto todavía usa el mailer por defecto de Supabase**
(`noreply@mail.app.supabase.io`), que la propia documentación de Supabase describe así:

> "The service has a rate limit of ~2 emails per hour, and availability is on a best-effort basis
> (...) **for demonstration purposes only**. For production use, you should consider configuring
> a custom SMTP server."

Eso explica todo: el primer correo puede salir, pero en cuanto pruebas de nuevo (o registras un
par de cuentas seguidas) se queda sin cupo y no manda nada más — y ni siquiera hace falta llegar
al límite para que Gmail lo trate como spam/lo bloquee, porque sale de un dominio compartido con
miles de proyectos de Supabase, no del tuyo.

**La solución de verdad no es un cambio de código: es configurar un SMTP propio en el Dashboard.**
Con SMTP propio el límite sube a 30 registros/hora y el correo sale de tu propia cuenta (o de un
proveedor serio), no de un dominio compartido. Son ~5 minutos, un único ajuste que se hace una vez.

⚠️ Igual que la plantilla, **esto no lo puedo hacer yo por API**: no existe herramienta (MCP) para
tocar la configuración de Auth (SMTP, templates) de forma programática — solo se hace a mano desde
el Dashboard, o con un token personal de tu cuenta que, por seguridad, no debo pedirte ni manejar.

## Paso 1 — Configurar SMTP con tu propio Gmail (recomendado, gratis, 5 min)

1. En tu cuenta de Gmail: activa la verificación en 2 pasos si no la tienes
   (myaccount.google.com/security), y luego ve a **myaccount.google.com/apppasswords** y genera una
   "Contraseña de aplicación" (elige app "Correo" / "Otra", nómbrala "Supabase"). Te da un código
   de 16 caracteres — cópialo, es la única vez que se muestra.
2. Abre **https://supabase.com/dashboard/project/swgqlrbztvqikkyitqtx/settings/auth** → sección
   **SMTP Settings** → activa "Enable Custom SMTP".
3. Rellena:
   - **Sender email**: tu dirección de Gmail (ej. `stormxizz@gmail.com`)
   - **Sender name**: `DiabetesRisk`
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: tu dirección de Gmail completa
   - **Password**: la contraseña de aplicación de 16 caracteres del paso 1 (NO tu contraseña normal)
4. **Save**. Gmail permite ~500 correos/día por esta vía — de sobra para este proyecto.

Alternativa si prefieres no usar tu Gmail personal como remitente: **Resend** (resend.com) tiene
un plan gratis de 3000 correos/mes pensado justo para esto, y su guía de conexión con Supabase es
de copiar/pegar (Host `smtp.resend.com`, Port `465` o `587`, Username `resend`, Password = tu API
key de Resend). Dímelo si prefieres esta ruta y te dejo los pasos exactos.

## Paso 2 — Pegar la plantilla bonita (2 min)

1. Abre **https://supabase.com/dashboard/project/swgqlrbztvqikkyitqtx/auth/templates**
2. Elige la pestaña **"Confirm signup"** (es la que usa `signUp()`).
3. Campo **Subject**: `Tu código de verificación: {{ .Token }}`
4. Campo **Message body** → botón "Source" / `</>` para pegar HTML crudo. Borra todo y pega el
   contenido completo de [`confirm_signup.html`](./confirm_signup.html) (fondo blanco, barra
   degradada verde→azul, código grande en monoespaciada, y ahora un botón real de "Confirmar mi
   cuenta" además del código, para que se vea como un correo de producto de verdad).
5. **Save**.

## Paso 3 — Confirmar que la verificación por email sigue activada

En **Authentication → Sign In / Providers → Email**, confirma que **"Confirm email"** sigue
activado (por defecto lo está). Con SMTP propio configurado, cada `signUp()` seguirá disparando
este correo automáticamente — no hace falta tocar nada del backend.

**Importante:** el correo que ya recibiste (o no recibiste) antes de este cambio no se puede
"arreglar" retroactivamente. Después de guardar el SMTP y la plantilla, vuelve a intentar el
registro (o pulsa "Reenviar código" en `/verify-email`) y ese correo ya saldrá bien y llegará de
verdad.

## Flujo que ya implementa el Frontend (Fase 4, sin cambios)

```ts
// 1) Registro
const { error } = await supabase.auth.signUp({ email, password })
// -> Supabase envía el correo con el código automáticamente. Redirigir a /verify-email?email=...

// 2) Pantalla "Introduce tu código"
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token,          // los 6 dígitos que el usuario escribió
  type: 'signup',
})
// -> si es válido, data.session ya viene autenticada; redirigir a /predict o donde corresponda.
```

Sin este paso el usuario queda registrado pero sin sesión confirmada (no puede predecir hasta
verificar el código) — así queda listo el "más seguridad" que pediste.
