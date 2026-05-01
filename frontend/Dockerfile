FROM node:20-alpine AS builder

WORKDIR /app
# npm install instead of npm ci so the build works without a package-lock.json.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY public ./public
COPY src ./src
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
