FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json server.mjs ./

RUN mkdir -p /data && chown -R node:node /app /data

USER node
ENV NODE_ENV=production
ENV PORT=8080

VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "server.mjs"]
