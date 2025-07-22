FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install -DskipTest=true

FROM node:20-alpine
WORKDIR /app


COPY --from=build /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
