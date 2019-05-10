FROM node:11

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --unsafe-perm

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "tail -f /dev/null"]
