# Use Node.js 18 LTS as base image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies efficiently
RUN npm ci --only=production

# Install necessary system dependencies for LibreOffice & Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon-x11-0 \
    libgbm1 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libasound2 \
    libxshmfence1 \
    libnss3 \
    libx11-xcb1 \
    libxcursor1 \
    libxi6 \
    libxrandr2 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy rest of the app files
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 5152

# Start the application
CMD ["node", "index.js"]
