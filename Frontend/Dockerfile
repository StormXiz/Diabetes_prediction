# Imagen del frontend (Next.js 16). Build context: Frontend/
# docker build -f Frontend/Dockerfile -t diabetes-risk-frontend Frontend
#
# Multi-stage: la imagen final NO lleva node_modules completo ni el código
# fuente, solo lo que "next build" con output:"standalone" empaqueta.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables NEXT_PUBLIC_* deben existir en build time (quedan horneadas en el
# bundle del cliente) — pásalas con --build-arg o en el "args" del compose.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# El proyecto no tiene carpeta public/ propia; se crea vacía para que el
# runner tenga la ruta (Next.js la sirve si existe, no falla si está vacía).
RUN mkdir -p ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
