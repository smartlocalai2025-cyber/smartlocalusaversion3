# Use Node.js LTS (20.x required for undici dependency)
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./
COPY morrow.js ./
COPY embeddings.js ./
# Copy all required directories
COPY knowledge/ ./knowledge/
COPY providers/ ./providers/
COPY routes/ ./routes/
COPY services/ ./services/
COPY tools/ ./tools/
EXPOSE 8080
CMD ["node", "server.js"]
