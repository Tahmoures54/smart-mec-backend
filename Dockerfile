FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

RUN npm install -g npm@10.9.2

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps --no-audit --no-fund

RUN npm run build

# کپی استاتیک‌ها داخل standalone
RUN if [ -d /app/.next/standalone ]; then \
      cp -r /app/public /app/.next/standalone/public 2>/dev/null || true; \
      mkdir -p /app/.next/standalone/.next && \
      cp -r /app/.next/static /app/.next/standalone/.next/static 2>/dev/null || true; \
    fi

# ★ مهم: سیملینک را در زمان build بسازید، نه runtime
# کل دایرکتوری cache را به /tmp/next-cache لینک می‌کنیم.
RUN mkdir -p /app/.next/standalone/.next \
 && rm -rf /app/.next/standalone/.next/cache /app/.next/cache \
 && ln -sfn /tmp/next-cache /app/.next/standalone/.next/cache \
 && ln -sfn /tmp/next-cache /app/.next/cache

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# ★ در CMD فقط پوشه‌های /tmp را بساز. به /app دست نزن.
CMD ["sh", "-c", "\
  mkdir -p /tmp/next-cache/images /tmp/next-cache/fetch-cache && \
  if [ -f /app/.next/standalone/server.js ]; then \
    cd /app/.next/standalone && exec node server.js; \
  else \
    exec npm start; \
  fi"]
