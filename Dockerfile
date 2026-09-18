FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

RUN npm install -g npm@10.9.2

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps --no-audit --no-fund

RUN npm run build

# کپی استاتیک‌ها داخل standalone در مرحله build (نه runtime)
RUN if [ -d /app/.next/standalone ]; then \
      cp -r /app/public /app/.next/standalone/public 2>/dev/null || true; \
      mkdir -p /app/.next/standalone/.next && \
      cp -r /app/.next/static /app/.next/standalone/.next/static 2>/dev/null || true; \
    fi

# کش را برای runtime آماده می‌کنیم (بعداً به /tmp وصل می‌شود)
RUN mkdir -p /app/.next/cache/images /app/.next/cache/fetch-cache \
  /app/.next/standalone/.next/cache/images /app/.next/standalone/.next/cache/fetch-cache \
  && chmod -R 777 /app/.next/cache /app/.next/standalone/.next/cache 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "\
  mkdir -p /tmp/next-cache/images /tmp/next-cache/fetch-cache && \
  mkdir -p /app/.next/standalone/.next/cache 2>/dev/null || true && \
  ln -sfn /tmp/next-cache/images /app/.next/standalone/.next/cache/images 2>/dev/null || true && \
  ln -sfn /tmp/next-cache/fetch-cache /app/.next/standalone/.next/cache/fetch-cache 2>/dev/null || true && \
  ln -sfn /tmp/next-cache /app/.next/cache 2>/dev/null || true && \
  if [ -f /app/.next/standalone/server.js ]; then \
    cd /app/.next/standalone && exec node server.js; \
  else \
    exec npm start; \
  fi"]
