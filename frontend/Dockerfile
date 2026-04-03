FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build
RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "3000"]
