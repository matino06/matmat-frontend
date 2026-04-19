FROM node:22.12-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

ENV PORT=3000
ENV HOST=0.0.0.0

RUN npm run build

EXPOSE 3000
CMD ["node", "build/compute/default/index.js"]
