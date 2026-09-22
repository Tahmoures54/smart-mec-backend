FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

WORKDIR /app

# Copy package manifests first for better layer cache when source changes
COPY package.json package-lock.json* ./

# Prefer offline/cache; legacy-peer-deps for Next 16 peer ranges
RUN npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Liara builders are memory-tight; without this Next webpack can thrash and hit the ~20m timeout
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm run build

RUN cp -r /app/public /app/.next/standalone/public 2>/dev/null || true; \
    mkdir -p /app/.next/standalone/.next; \
    cp -r /app/.next/static /app/.next/standalone/.next/static 2>/dev/null || true

RUN mkdir -p /app/.next/standalone/.next \
 && rm -rf /app/.next/standalone/.next/cache /app/.next/cache \
 && ln -sfn /tmp/next-cache /app/.next/standalone/.next/cache \
 && ln -sfn /tmp/next-cache /app/.next/cache

EXPOSE 3000
CMD ["sh", "-c", "mkdir -p /tmp/next-cache/images /tmp/next-cache/fetch-cache && cd /app/.next/standalone && exec node server.js"]
