FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
# Migrations vao junto para permitir `docker compose run --rm backend npm run migrate`.
# O container NAO migra sozinho no start: aplicar schema e uma decisao do deploy,
# nao um efeito colateral de subir/reiniciar uma replica.
COPY scripts/migrate.js ./scripts/
COPY supabase/ ./supabase/
EXPOSE 3001
CMD ["node", "src/server.js"]
