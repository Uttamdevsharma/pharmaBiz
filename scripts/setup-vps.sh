#!/usr/bin/env bash
# ==============================================================================
# BizPharma - Initial Ubuntu VPS Setup Script
# Run this once on a fresh Ubuntu 22.04 / 24.04 VPS as root:
# curl -fsSL <link> | bash OR bash scripts/setup-vps.sh
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}       🚀 Ubuntu VPS Provisioning for BizPharma       ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Update and Upgrade System Packages
echo -e "${GREEN}🔄 Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# 2. Install Essential Tools
echo -e "${GREEN}📦 Installing essential packages (curl, git, ufw, build-essential)...${NC}"
apt-get install -y curl wget git ufw certbot python3-certbot-nginx build-essential

# 3. Install Node.js 20 LTS via NodeSource
if ! command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}📦 Installing Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo -e "${YELLOW}ℹ️  Node.js $(node -v) is already installed.${NC}"
fi

# 4. Install PM2 Globally
if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}📦 Installing PM2 process manager...${NC}"
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
else
    echo -e "${YELLOW}ℹ️  PM2 is already installed.${NC}"
fi

# 5. Install and Enable Nginx
if ! command -v nginx >/dev/null 2>&1; then
    echo -e "${GREEN}📦 Installing Nginx...${NC}"
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    echo -e "${YELLOW}ℹ️  Nginx is already installed.${NC}"
fi

# 6. Configure UFW Firewall
echo -e "${GREEN}🛡️  Configuring firewall (SSH, HTTP, HTTPS)...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 7. Prepare /var/www/bizpharma directory
echo -e "${GREEN}📁 Setting up directories...${NC}"
mkdir -p /var/www/bizpharma/logs
mkdir -p /var/www/bizpharma/server/public/uploads
mkdir -p /var/www/certbot

# 8. Configure Nginx Site
if [ -f "/var/www/bizpharma/nginx/bizpharma.conf" ]; then
    echo -e "${GREEN}🌐 Linking Nginx configuration...${NC}"
    cp /var/www/bizpharma/nginx/bizpharma.conf /etc/nginx/sites-available/bizpharma.conf
    ln -sf /etc/nginx/sites-available/bizpharma.conf /etc/nginx/sites-enabled/bizpharma.conf
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
fi

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   ✅ VPS Setup Completed Successfully!              ${NC}"
echo -e "${GREEN}======================================================${NC}"

