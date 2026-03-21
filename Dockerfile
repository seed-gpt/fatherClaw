FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ dist/
COPY dist-server/ dist-server/
COPY docker/ docker/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist-server/index.js"]
