# Verificación por código (OTP) al registrarse

⚠️ **El correo que te llegó ("Confirm your email address", sin código) es porque este paso AÚN
no está aplicado en tu proyecto.** No hay bug en el código del frontend — el registro y la
pantalla de 6 dígitos ya funcionan bien; lo que falta es pegar la plantilla en el Dashboard de
Supabase, y **eso NO lo puedo hacer yo**: no existe una herramienta (MCP) para editar plantillas
de correo de Supabase Auth de forma programática, solo se configuran a mano desde el Dashboard o
con un token de acceso personal de tu cuenta que, por seguridad, no debo pedirte ni manejar yo.
Son 2 minutos, uno por uno:

## 1. Pegar la plantilla bonita (paso a paso)

1. Abre directamente: **https://supabase.com/dashboard/project/swgqlrbztvqikkyitqtx/auth/templates**
2. Arriba, en la pestaña de plantillas, elige **"Confirm signup"** (es la que usa `signUp()`).
3. Campo **Subject**: borra lo que haya y pon `Tu código de verificación: {{ .Token }}`
4. Campo **Message body (Source)** — normalmente hay un botón o toggle "Source" / `</>` para ver
   el HTML crudo en vez del editor visual. Bórralo TODO y pega el contenido completo de
   [`confirm_signup.html`](./confirm_signup.html) (ábrelo primero con doble clic para verlo bonito
   en el navegador, fondo blanco con verde/azul).
5. **Save** (botón abajo del todo, a veces hay que bajar para verlo).

Esa plantilla muestra el código de 6 dígitos grande y legible (`{{ .Token }}`), más un enlace
alternativo por si alguien prefiere confirmar con un clic.

**Importante:** esto solo aplica a correos que se envíen DESPUÉS de guardar. El correo feo que ya
recibiste no se puede "arreglar" retroactivamente — solo tienes que volver a intentar el registro
(o pulsar "Reenviar código" en `/verify-email`, que ya te dejé en la pantalla) una vez guardada la
plantilla, y ese sí saldrá bonito.

## 2. Confirmar que la verificación por email está activada

En **Authentication → Sign In / Providers → Email**, confirma que **"Confirm email"** está
activado (lo está por defecto en proyectos nuevos). Con esto, cada `signUp()` dispara
automáticamente el correo de confirmación de arriba — no hace falta código adicional en el
backend para "enviar" el correo, Supabase ya lo hace.

Si quieres cambiar cuánto tarda en expirar el código, es el campo **"Email OTP Expiration"** en
esa misma pantalla (por defecto suele ser 3600s = 1 hora).

## 3. Flujo que implementará el Frontend (Fase 4)

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
