FROM node:18-alpine

WORKDIR /app

# Install dependencies (preferred over COPY . first to leverage cache)
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose API port
EXPOSE 3000

# Start command as non-root user
USER node
CMD ["npm", "start"]
