# Built from the repository root (the deploy's build context is ".").
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3003 \
    UPLOADS_DIR=/data/uploads \
    PRISMA_HIDE_UPDATE_MESSAGE=1

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# The deploy reads prisma/migrations and runs node_modules/.bin/prisma from
# this folder, so both must stay where they are.
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY backend/src ./src
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3003
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
