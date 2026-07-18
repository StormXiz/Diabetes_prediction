"""Verificación del JWT de Supabase en cada request protegido.

Los proyectos nuevos de Supabase (este incluido) firman los access tokens con
una clave asimétrica (ES256) publicada en el JWKS del proyecto, no con el
secreto compartido HS256 legado — por eso la verificación local usa
`PyJWKClient` contra `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` y no
requiere ningún secreto. Si algún día el proyecto usara el HS256 legado
(`SUPABASE_JWT_SECRET` configurado y el token trae `alg: HS256`), se sigue
soportando por compatibilidad.

Si no se puede llegar al JWKS por un problema de red (no por un token
inválido), se cae a un fallback REMOTO: validar llamando a
`GET /auth/v1/user` de Supabase con el propio token. Más lento (1
round-trip) pero funciona sin depender del JWKS.

En todos los casos, si el token no es válido o falta, se devuelve 401 y el
request nunca llega al modelo. [PLAN_MAESTRO sec 5 y 12]
"""
from __future__ import annotations

import httpx
import jwt
from fastapi import Header, HTTPException, status

from config import SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, SUPABASE_URL

_jwks_client: jwt.PyJWKClient | None = None


def _jwks() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


class AuthenticatedUser:
    def __init__(self, user_id: str, email: str | None = None):
        self.user_id = user_id
        self.email = email


def _verify_local(token: str) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
        )

    try:
        if alg == "HS256" and SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            signing_key = _jwks().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        # Fallo de red al pedir el JWKS, no del token en sí — se puede
        # reintentar con el fallback remoto.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo verificar el token localmente: {exc}",
        )


def _verify_remote(token: str) -> dict:
    if not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API mal configurada: falta SUPABASE_JWT_SECRET o SUPABASE_ANON_KEY.",
        )
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
            timeout=5.0,
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo verificar la sesión con Supabase.",
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado.")
    data = resp.json()
    return {"sub": data.get("id"), "email": data.get("email")}


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    """Dependencia de FastAPI: exige `Authorization: Bearer <access_token>`.

    Se usa en /predict/* para que SOLO usuarios logueados en Supabase puedan
    predecir (el guard del frontend es la primera barrera; esta es la real,
    porque nunca hay que confiar solo en el cliente)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el header Authorization: Bearer <token>.",
        )
    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = _verify_local(token)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
            payload = _verify_remote(token)
        else:
            raise

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin subject (sub).")

    return AuthenticatedUser(user_id=user_id, email=payload.get("email"))
