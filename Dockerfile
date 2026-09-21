FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

RUN npm install -g npm@10.9.2
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN npm run build

RUN cp -r /app/public /app/.next/standalone/public 2>/dev/null || true;     mkdir -p /app/.next/standalone/.next;     cp -r /app/.next/static /app/.next/standalone/.next/static 2>/dev/null || true

RUN mkdir -p /app/.next/standalone/.next  && rm -rf /app/.next/standalone/.next/cache /app/.next/cache  && ln -sfn /tmp/next-cache /app/.next/standalone/.next/cache  && ln -sfn /tmp/next-cache /app/.next/cache

EXPOSE 3000
CMD ["sh", "-c", "mkdir -p /tmp/next-cache/images /tmp/next-cache/fetch-cache && cd /app/.next/standalone && exec node server.js"]
