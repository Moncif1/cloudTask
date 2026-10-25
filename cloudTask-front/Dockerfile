# Etape de construction : Node installe les dependances et construit React.
FROM node:22-bookworm-slim AS build
WORKDIR /build
# Copie d'abord les manifestes pour reutiliser le cache des dependances.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && npm run build

# Image finale : Nginx sert les fichiers statiques, sans Node ni serveur Vite.
FROM nginx:1.28-alpine
# Cette configuration transmet aussi les requetes /api au backend.
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /build/dist /usr/share/nginx/html
# La configuration utilise le port 8080 et /tmp pour fonctionner sans root.
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx"]
# Garde Nginx au premier plan pour que le conteneur reste actif.
CMD ["-g", "daemon off;"]
