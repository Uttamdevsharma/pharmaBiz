#!/usr/bin/env bash
# ==============================================================================
# BizPharma SaaS - Automated Deployment Script
# Target: Ubuntu VPS (/var/www/bizpharma)
# ==============================================================================

set -euo pipefail

# Visual colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       🚀 Starting BizPharma Deployment Pipeline      ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Load Node environment (supports NVM, NodeSource, standard apt installations)
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:~/.npm-global/bin"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
elif [ -s "/root/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "/root/.nvm/nvm.sh"
fi

# 2. Target Directory
PROJECT_DIR="${1:-/var/www/bizpharma}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📁 Creating project directory at ${PROJECT_DIR}...${NC}"
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo -e "${GREEN}📂 Current working directory: $(pwd)${NC}"

# 3. Create required runtime directories
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/server/public/uploads"
mkdir -p /var/www/certbot

# 4. Check for environment files
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    echo -e "${RED}⚠️  WARNING: $PROJECT_DIR/server/.env not found!${NC}"
    if [ -f "$PROJECT_DIR/server/.env.example" ]; then
        echo -e "${YELLOW}ℹ️  Copying server/.env.example to server/.env. Please update with production credentials!${NC}"
        cp "$PROJECT_DIR/server/.env.example" "$PROJECT_DIR/server/.env"
    fi
fi

if [ ! -f "$PROJECT_DIR/client/.env" ]; then
    echo -e "${YELLOW}ℹ️  $PROJECT_DIR/client/.env not found. Creating default production client/.env...${NC}"
    if [ -f "$PROJECT_DIR/client/.env.example" ]; then
        cp "$PROJECT_DIR/client/.env.example" "$PROJECT_DIR/client/.env"
    else
        echo "NEXT_PUBLIC_API_URL=/api" > "$PROJECT_DIR/client/.env"
    fi
fi

# 5. Build and Configure Server (Express + Prisma)
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [1/3] Setting up Backend Server (Express + Prisma)   ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR/server"

echo -e "${GREEN}📦 Installing server dependencies...${NC}"
npm install

echo -e "${GREEN}🗄️  Generating Prisma client...${NC}"
npx prisma generate

echo -e "${GREEN}🔄 Applying database migrations...${NC}"
npx prisma migrate deploy || echo -e "${YELLOW}⚠️ Prisma migration deploy skipped or failed, continuing...${NC}"

echo -e "${GREEN}🏗️  Compiling TypeScript backend...${NC}"
npm run build

# 6. Build and Configure Client (Next.js)
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [2/3] Setting up Frontend Client (Next.js)           ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR/client"

echo -e "${GREEN}📦 Installing client dependencies...${NC}"
npm install

echo -e "${GREEN}🏗️  Building Next.js production bundle...${NC}"
npm run build

# 7. Start / Reload PM2 Processes
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [3/3] Reloading PM2 Services                         ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR"

if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}🔄 Reloading ecosystem with zero downtime...${NC}"
    pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
    pm2 save
else
    echo -e "${RED}❌ PM2 is not installed globally! Installing PM2...${NC}"
    npm install -g pm2
    pm2 start ecosystem.config.cjs
    pm2 save
fi

# 8. Post-deployment Health Check
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} 🩺 Running Post-Deployment Health Checks             ${NC}"
echo -e "${BLUE}======================================================${NC}"

sleep 4

echo -e "${GREEN}PM2 Process Status:${NC}"
pm2 status

# Verify Server Port 3000
if curl -sf http://127.0.0.1:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is healthy on http://127.0.0.1:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API did not respond to root ping. Check logs with: pm2 logs bizpharma-server${NC}"
fi

# Verify Client Port 3001
if curl -sf http://127.0.0.1:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend Client is healthy on http://127.0.0.1:3001${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend did not respond immediately. Check logs with: pm2 logs bizpharma-client${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}       🎉 BizPharma Deployment Completed!             ${NC}"
echo -e "${GREEN}======================================================${NC}"

