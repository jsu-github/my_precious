FROM node:20-alpine
WORKDIR /app

# Install dependencies into the container image layer
# (source files are volume-mounted from host at runtime)
COPY package*.json ./
RUN npm ci

# Expose API port
EXPOSE 3001

# Hot-reload dev server — source mounted via docker-compose volumes
CMD ["npm", "run", "dev"]
