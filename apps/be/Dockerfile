FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/be/package.json apps/be/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/be/ apps/be/

EXPOSE 3000
CMD ["bun", "run", "apps/be/src/main.ts"]
