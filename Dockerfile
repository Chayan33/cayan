FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3001
ENV SONDOZ_DATA_DIR=/app/.data
EXPOSE 3001
CMD ["npm", "start"]
