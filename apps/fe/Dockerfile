FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/fe/package.json apps/fe/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/fe/ apps/fe/
RUN cd apps/fe && bun run build

FROM nginx:alpine
COPY --from=build /app/apps/fe/dist /usr/share/nginx/html
COPY apps/fe/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
