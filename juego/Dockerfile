# Servidor de Mi Línea: compila el juego y lo sirve junto a la API en tiempo real.
FROM node:22-slim AS compilar
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATOS=/datos/mi-linea.db
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=compilar /app/dist ./dist
COPY servidor ./servidor
COPY src/compartido ./src/compartido
COPY src/datos/linea.json ./src/datos/linea.json
VOLUME /datos
EXPOSE 8787
CMD ["node", "--experimental-strip-types", "--no-warnings", "servidor/index.ts"]
