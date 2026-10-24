FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS dev

COPY . .
EXPOSE 8081
CMD ["./node_modules/.bin/expo", "start", "--go", "--tunnel", "ngrok", "--port", "8081"]

FROM dependencies AS export

COPY . .
RUN npm run build

FROM nginx:alpine AS web

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=export /app/dist /usr/share/nginx/html
EXPOSE 80
