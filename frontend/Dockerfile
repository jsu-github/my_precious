FROM node:20-alpine
WORKDIR /app

# Install dependencies into the container image layer
# (source files are volume-mounted from host at runtime)
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
RUN npm install

# Expose Vite dev server port
EXPOSE 3000

# Run Vite dev server with hot-reload (source mounted via docker-compose volumes)
CMD ["npm", "run", "dev"]
