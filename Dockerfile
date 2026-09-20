FROM node:22-bookworm-slim

WORKDIR /opt/astonish-runtime

RUN npm init -y >/dev/null 2>&1 \
 && npm install --no-audit --no-fund --omit=dev \
      @whiskeysockets/baileys@7.0.0-rc13 \
      dotenv@17.2.2 \
      luxon@3.7.2 \
      pino@9.6.0 \
      playwright-core@1.62.0 \
      qrcode@1.5.4 \
      yaml@2.8.1 \
      zod@4.1.5 \
 && npm install --no-audit --no-fund --save-dev tsx@4.20.5 \
 && chown -R 1000:1000 /opt/astonish-runtime

WORKDIR /app
COPY server.mjs poc.mjs ./

RUN mkdir -p /data /tmp/astonish-poc \
 && chown -R 1000:1000 /app /data /tmp/astonish-poc

USER 1000:1000
ENV NODE_ENV=production

VOLUME ["/data"]

CMD ["node", "server.mjs"]
