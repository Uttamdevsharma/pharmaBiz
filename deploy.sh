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
echo -e "${BLUE}        Starting BizPharma Deployment Pipeline        ${NC}"
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

# Set maximum memory allocation for Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. Check and configure Linux SWAP if missing
if command -v swapon >/dev/null 2>&1 && [ "$(id -u)" -eq 0 ]; then
    TOTAL_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "${TOTAL_SWAP:-0}" -lt 512 ]; then
        echo -e "${YELLOW}[!] Low/no swap detected (${TOTAL_SWAP:-0}MB). Setting up 2GB swapfile for build safety...${NC}"
        if [ ! -f /swapfile ]; then
            fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
            chmod 600 /swapfile
            mkswap /swapfile
        fi
        swapon /swapfile 2>/dev/null || true
    fi
fi

# 3. Target Directory
PROJECT_DIR="${1:-/var/www/bizpharma}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}[*] Creating project directory at ${PROJECT_DIR}...${NC}"
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo -e "${GREEN}[*] Current working directory: $(pwd)${NC}"

# 4. Create required runtime directories
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/server/public/uploads"
mkdir -p /var/www/certbot

# 5. Check and configure environment files
NEON_DATABASE_URL="postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Ensure firewall allows outbound ports 5432 and 443 (supports AlmaLinux/CentOS, Ubuntu, Debian)
if [ "$(id -u)" -eq 0 ]; then
    command -v ufw >/dev/null 2>&1 && ufw allow out 5432/tcp 2>/dev/null || true
    command -v ufw >/dev/null 2>&1 && ufw allow out 443/tcp 2>/dev/null || true
    command -v iptables >/dev/null 2>&1 && iptables -I OUTPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null || true
    command -v iptables >/dev/null 2>&1 && iptables -I OUTPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --permanent --add-port=5432/tcp 2>/dev/null || true
    command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
    command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --reload 2>/dev/null || true
    command -v setenforce >/dev/null 2>&1 && setenforce 0 2>/dev/null || true
fi

# Ensure server/.env exists and has valid DATABASE_URL and JWT_SECRET
if [ -f "$PROJECT_DIR/server/.env" ]; then
    if ! grep -q "ep-tiny-star-aywpbgfb-pooler" "$PROJECT_DIR/server/.env" 2>/dev/null; then
        echo -e "${YELLOW}[!] Updating server/.env with production Neon DATABASE_URL...${NC}"
        sed -i '/DATABASE_URL=/d' "$PROJECT_DIR/server/.env" 2>/dev/null || true
        echo "DATABASE_URL=\"$NEON_DATABASE_URL\"" >> "$PROJECT_DIR/server/.env"
    fi
    if ! grep -q "JWT_SECRET=" "$PROJECT_DIR/server/.env" 2>/dev/null; then
        echo "JWT_SECRET=\"super_secret_jwt_key_pharmacy_2026\"" >> "$PROJECT_DIR/server/.env"
    fi
else
    echo "DATABASE_URL=\"$NEON_DATABASE_URL\"" > "$PROJECT_DIR/server/.env"
    echo "JWT_SECRET=\"super_secret_jwt_key_pharmacy_2026\"" >> "$PROJECT_DIR/server/.env"
fi

# Keep root .env and server/.env in sync
if [ -f "$PROJECT_DIR/server/.env" ]; then
    cp -f "$PROJECT_DIR/server/.env" "$PROJECT_DIR/.env" 2>/dev/null || true
fi

# Always enforce production API URL on client/.env before building
echo "NEXT_PUBLIC_API_URL=https://bizpharma-api.okobiz.com/api" > "$PROJECT_DIR/client/.env"
echo "SERVER_URL=https://bizpharma-api.okobiz.com" >> "$PROJECT_DIR/client/.env"
echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=c0d8f58b87df6e982c7a52f4e0c451db432a9e871e98d9e2646b3f54cb29107a" >> "$PROJECT_DIR/client/.env"
echo -e "${GREEN}[*] client/.env configured with NEXT_PUBLIC_API_URL=https://bizpharma-api.okobiz.com/api${NC}"

# 6. Build and Configure Server (Express + Prisma)
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [1/3] Setting up Backend Server (Express + Prisma)   ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR/server"

# Ensure execute permissions on binary wrappers from git checkout
if [ -d "$PROJECT_DIR/server/node_modules/.bin" ]; then
    chmod -R +x "$PROJECT_DIR/server/node_modules/.bin" 2>/dev/null || true
fi

echo -e "${GREEN}[*] Installing server dependencies...${NC}"
npm install --ignore-scripts || npm install

# Ensure execute permissions after install
if [ -d "$PROJECT_DIR/server/node_modules/.bin" ]; then
    chmod -R +x "$PROJECT_DIR/server/node_modules/.bin" 2>/dev/null || true
fi

echo -e "${GREEN}[*] Generating Prisma client...${NC}"
node node_modules/prisma/build/index.js generate || npx prisma generate

echo -e "${GREEN}[*] Applying database migrations...${NC}"
node node_modules/prisma/build/index.js migrate deploy || npx prisma migrate deploy || echo -e "${YELLOW}[!] Prisma migration deploy skipped or failed, continuing...${NC}"

echo -e "${GREEN}[*] Compiling TypeScript backend...${NC}"
npm run build

echo -e "${GREEN}[*] Executing database seed directly...${NC}"
node -e "require('./dist/app/lib/seedAdmin').seedSuperAdmin().then(() => console.log('Seed completed successfully')).catch((err) => console.error('Seed execution note:', err.message || err))" || true

# 7. Build and Configure Client (Next.js)
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [2/3] Setting up Frontend Client (Next.js)           ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR/client"

# Ensure execute permissions on client binaries
if [ -d "$PROJECT_DIR/client/node_modules/.bin" ]; then
    chmod -R +x "$PROJECT_DIR/client/node_modules/.bin" 2>/dev/null || true
fi

echo -e "${GREEN}[*] Installing client dependencies...${NC}"
npm install

if [ -d "$PROJECT_DIR/client/node_modules/.bin" ]; then
    chmod -R +x "$PROJECT_DIR/client/node_modules/.bin" 2>/dev/null || true
fi

# Ensure no legacy or deprecated next.config files exist on the VPS
rm -f "$PROJECT_DIR/client/next.config.mjs" "$PROJECT_DIR/client/next.config.js" 2>/dev/null || true

echo -e "${GREEN}[*] Building Next.js production bundle with fresh cache...${NC}"
rm -rf .next .next_dev 2>/dev/null || true
npm run build

# 8. Start / Reload PM2 Processes
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE} [3/3] Reloading PM2 Services                         ${NC}"
echo -e "${BLUE}======================================================${NC}"
cd "$PROJECT_DIR"

if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}[*] Reloading ecosystem processes with updated environment...${NC}"
    pm2 restart ecosystem.config.cjs --update-env || pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
    pm2 save
else
    echo -e "${RED}[!] PM2 is not installed globally! Installing PM2...${NC}"
    npm install -g pm2
    pm2 start ecosystem.config.cjs
    pm2 save
fi

# 9. Post-deployment Health Check
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE}       Running Post-Deployment Health Checks          ${NC}"
echo -e "${BLUE}======================================================${NC}"

sleep 4

echo -e "${GREEN}PM2 Process Status:${NC}"
pm2 status

# Verify Server Port 4001
if curl -sf http://127.0.0.1:4001/ > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Backend API is healthy on http://127.0.0.1:4001${NC}"
    echo -e "${GREEN}[*] Checking Database Health Probe...${NC}"
    curl -s http://127.0.0.1:4001/api/health/db || true
    echo ""
else
    echo -e "${YELLOW}[!] Backend API did not respond to root ping. Check logs with: pm2 logs bizpharma-server${NC}"
fi

# Verify Client Port 4000
if curl -sf http://127.0.0.1:4000/ > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Frontend Client is healthy on http://127.0.0.1:4000${NC}"
else
    echo -e "${YELLOW}[!] Frontend did not respond immediately. Check logs with: pm2 logs bizpharma-client${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}       BizPharma Deployment Completed!                ${NC}"
echo -e "${GREEN}======================================================${NC}"
