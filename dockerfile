FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Don't run the server as root
USER node

EXPOSE 5000
CMD ["node", "index.js"]
