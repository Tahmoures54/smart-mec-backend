FROM registry2.iran.liara.ir/platforms/next-platform:release-2025-08-26T11-49-builder.22

RUN npm install -g npm@10.9.2

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps --no-audit --no-fund

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
