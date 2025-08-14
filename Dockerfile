# שלב 1: בניית הפרויקט
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# שלב 2: הרצה בפרודקשן
FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app ./
EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
