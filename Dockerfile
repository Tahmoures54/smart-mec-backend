FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

RUN npm install -g npm@10.9.2

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps --no-audit --no-fund

RUN npm run build

# پوشه‌های کش که Next در runtime می‌سازد (images / fetch-cache)
# در برخی استقرارها لایهٔ build فقط-خواندنی است؛ در CMD دوباره ساخته می‌شوند.
RUN mkdir -p /app/.next/cache/images /app/.next/cache/fetch-cache \
  && chmod -R 777 /app/.next/cache

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# تصویر پایهٔ لیارا اغلب output: standalone را فعال می‌کند.
# next start با standalone کار نمی‌کند → server.js استندالون.
CMD ["sh", "-c", "mkdir -p /app/.next/cache/images /app/.next/cache/fetch-cache && if [ -f /app/.next/standalone/server.js ]; then cp -r /app/public /app/.next/standalone/public 2>/dev/null || true; cp -r /app/.next/static /app/.next/standalone/.next/static 2>/dev/null || true; cd /app/.next/standalone && exec node server.js; else exec npm start; fi"]
