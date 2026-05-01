FROM node:20-alpine

WORKDIR /app

# Use npm install (not npm ci) so a missing package-lock.json doesn't break the build.
# --omit=dev replaces the deprecated --only=production flag.
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
