# syntax=docker/dockerfile:1.7
# Image de l'API Cœur Vrai (Express + Socket.io). Multi-étapes : la dernière
# étape ne contient que le code compilé et les dépendances de production.
# Aucune donnée ni aucun secret dans l'image : tout passe par l'environnement.

ARG NODE_IMAGE=node:20.18.1-bookworm-slim

# --- 1. Dépendances complètes + compilation TypeScript
FROM ${NODE_IMAGE} AS build
WORKDIR /app
# Aucun module à compiler (bcryptjs en JavaScript pur, sharp fourni précompilé) : pas d'outils de compilation.
COPY package.json package-lock.json ./
# Certificat d'autorité supplémentaire FACULTATIF (réseau d'entreprise avec proxy TLS) :
# --secret id=extra_ca,src=/chemin/ca.crt. Sans lui, rien ne change.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- 2. Dépendances de production uniquement
FROM build AS prod-deps
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# --- 3. Image finale, utilisateur non-root
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node migrations ./migrations
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
