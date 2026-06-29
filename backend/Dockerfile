# 1. Start with an official Node.js environment
FROM node:22-alpine

# 2. Create and go into a folder inside the container
WORKDIR /usr/src/app

# 3. Copy the dependency list files first
COPY package*.json ./

# 4. Install the dependencies inside the container
RUN npm install

# 5. Copy all other files from your computer into the container
COPY . .

# 6. Generate the Prisma database client
RUN npx prisma generate

# 7. Open port 3000 so we can access the backend
EXPOSE 3000

# 8. The command to run the backend when the container starts
CMD ["npm", "run", "dev"]