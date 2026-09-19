FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json server.mjs poc.mjs ./

RUN mkdir -p /data && chown -R node:node /app /data /tmp

USER node
ENV NODE_ENV=production
ENV PORT=8080

VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "poc.mjs"]
