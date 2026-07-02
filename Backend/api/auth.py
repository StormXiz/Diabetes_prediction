"""Verificación del JWT de Supabase en cada request protegido.

Dos estrategias, en este orden:
1) Verificación LOCAL (rápida, sin red) con el JWT secret compartido de Supabase
   (HS256) si `SUPABASE_JWT_SECRET` está configurado.
2) Fallback REMOTO: si no hay secreto configurado (p. ej. en desarrollo antes de
   que Angel lo pegue en el .env), se valida llamando a `GET /auth/v1/user` de
   Supabase con el propio token. Más lento (1 round-trip) pero funciona sin
   exponer ningún secreto adicional.

En ambos casos, si el token no es válido o falta, se devuelve 401 y el request
nunca llega al modelo. [PLAN_MAESTRO sec 5 y 12]
"""
from __future__ import annotations

import httpx
import jwt
from fastapi import Header, HTTPException, status

from config import SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, SUPABASE_URL


class AuthenticatedUser:
    def __init__(self, user_id: str, email: str | None = None):
        self.user_id = user_id
        self.email = email


def _verify_local(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
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

    if SUPABASE_JWT_SECRET:
        payload = _verify_local(token)
    else:
        payload = _verify_remote(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin subject (sub).")

    return AuthenticatedUser(user_id=user_id, email=payload.get("email"))
