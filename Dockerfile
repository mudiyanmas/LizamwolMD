FROM node:lts-buster
RUN git clone https://github.com/mudiyanmas/LizamwolMD/root/imudiyanmas
WORKDIR /root/imudiyanmas
RUN npm install && npm install -g pm2 || yarn install --network-concurrency 1
COPY . .
EXPOSE 9090
CMD ["npm", "start"]
