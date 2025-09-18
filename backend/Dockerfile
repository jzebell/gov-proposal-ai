# Use official Node.js 18 image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose API port
EXPOSE 3001

# Install development tools for hot reload
RUN npm install --save-dev nodemon

# Set environment variable for development
ENV NODE_ENV=development

# Start the server with hot reload in development
CMD ["npx", "nodemon", "--watch", ".", "index.js"]