FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

FROM node:22-alpine AS runtime

WORKDIR /app

RUN npm install -g serve@14.2.5
COPY --from=build /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT}"]
