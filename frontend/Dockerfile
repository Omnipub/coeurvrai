# syntax=docker/dockerfile:1.7
# Image du site Cœur Vrai (Next.js 15, mode « standalone »). Multi-étapes,
# utilisateur non-root. L'API étant servie sur le même domaine (/api), l'image
# est identique pour tous les environnements ; seule l'URL canonique est figée au build.

ARG NODE_IMAGE=node:20.18.1-bookworm-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=https://coeurvrai.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# Site de test uniquement (Render) : adresse de l'API et interdiction d'indexation,
# figées au build. Inutiles en production (Caddy route /api ; site indexable).
ARG BACKEND_URL=http://localhost:3001
ENV BACKEND_URL=${BACKEND_URL}
ARG NEXT_PUBLIC_NOINDEX=false
ENV NEXT_PUBLIC_NOINDEX=${NEXT_PUBLIC_NOINDEX}
COPY package.json package-lock.json ./
# Certificat d'autorité supplémentaire FACULTATIF (réseau d'entreprise avec proxy TLS).
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# Serveur autonome produit par `output: 'standalone'` + fichiers statiques.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
