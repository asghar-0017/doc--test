FROM node:18

RUN apt-get update && \
    apt-get install -y libreoffice poppler-utils && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 5152

CMD ["node", "index.js"]
