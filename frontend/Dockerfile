# 1. Start with Node.js environment
FROM node:22-alpine

# 2. Set the folder inside the container
WORKDIR /usr/src/app

# 3. Copy package lists and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the frontend code
COPY . .

# 5. Open port 5173 (default for Vite)
EXPOSE 5173

# 6. Start Vite and tell it to listen to external requests (using --host)
CMD ["npm", "run", "dev", "--", "--host"]