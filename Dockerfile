FROM node:22-bookworm-slim

RUN npm install -g tsx@4.20.5

WORKDIR /app
COPY package.json server.mjs poc.mjs ./

RUN mkdir -p /data && chown -R node:node /app /data /tmp

USER node
ENV NODE_ENV=production
ENV PORT=8080

VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "poc.mjs"]
