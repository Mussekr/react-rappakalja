FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/server ./server
COPY --from=builder /usr/src/app/migrations ./migrations
COPY --from=builder /usr/src/app/database.json ./database.json

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
