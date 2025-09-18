# Use official Node.js 18 image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variable for development
ENV NODE_ENV=development

# Start the React development server with hot reload and file watching
CMD ["npm", "start"]