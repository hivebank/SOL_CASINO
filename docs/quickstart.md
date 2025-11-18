# Quick Start Guide

Get the Solana-ETH Casino Suite running in minutes!

## Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Apache 2.4+, PHP 8.3+, MongoDB 6.0+, Node.js 18+**

## Quick Start with Docker (Recommended)

### 1. Clone the Repository

```bash
git clone <repository-url> solana-eth-casino-suite
cd solana-eth-casino-suite
```

### 2. Configure Environment

```bash
# Copy environment file
cp backend-php/.env.example backend-php/.env

# Edit if needed (defaults work for Docker)
nano backend-php/.env
```

### 3. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Start Services

```bash
docker-compose -f infra/docker-compose.yml up -d
```

### 5. Seed Database

```bash
docker exec -it casino-backend php scripts/seed_demo_data.php
```

### 6. Access the Application

Open your browser and navigate to:

```
http://localhost:8080
```

**Default Admin Credentials:**
- Email: `admin@casino.local`
- Password: `Admin123!@#`

## Manual Setup (Apache VPS)

### 1. Install Dependencies

```bash
# Install PHP 8.3 and extensions
sudo apt install php8.3 php8.3-mongodb php8.3-zip php8.3-mbstring

# Install MongoDB
# Follow: https://docs.mongodb.com/manual/installation/

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs
```

### 2. Clone and Configure

```bash
git clone <repository-url> solana-eth-casino-suite
cd solana-eth-casino-suite

# Backend setup
cd backend-php
cp .env.example .env
nano .env  # Edit with your MongoDB URI and settings
composer install
cd ..

# Frontend setup
cd frontend
npm install
npm run build
cd ..
```

### 3. Configure Apache

Create `/etc/apache2/sites-available/casino.conf`:

```apache
<VirtualHost *:80>
    ServerName casino.local
    DocumentRoot /path/to/solana-eth-casino-suite/backend-php/public

    <Directory /path/to/solana-eth-casino-suite/backend-php/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/casino_error.log
    CustomLog ${APACHE_LOG_DIR}/casino_access.log combined
</VirtualHost>
```

Enable site and modules:

```bash
sudo a2ensite casino
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

### 4. Seed Database

```bash
cd backend-php
php scripts/seed_demo_data.php
```

### 5. Access the Application

Add to `/etc/hosts`:

```
127.0.0.1 casino.local
```

Navigate to: `http://casino.local`

## First Steps

### 1. Connect Your Wallet

**For Phantom (Solana):**
1. Install Phantom wallet extension
2. Switch to Devnet in Phantom settings
3. Click "Connect Phantom" in the lobby

**For MetaMask (Ethereum):**
1. Install MetaMask extension
2. Switch to Goerli or Sepolia testnet
3. Click "Connect MetaMask" in the lobby

### 2. Select Operating Mode

- **Demo Mode**: Instant play with demo credits (no blockchain)
- **Testnet Mode**: Real blockchain transactions on testnets
- **Production Mode**: Disabled (requires licensing)

### 3. Get Credits

**Demo Mode:**
- Click "Top Up Demo" to add 1000 demo credits
- Unlimited free credits for testing

**Testnet Mode:**
- Request testnet tokens from faucets:
  - Solana: https://faucet.solana.com
  - Goerli: https://goerlifaucet.com
  - Sepolia: https://sepoliafaucet.com

### 4. Play Games

- **Slots**: Multi-reel slot machine with paylines
- **Roulette**: European wheel with various bet types
- **Blackjack**: Classic 21 with dealer AI

### 5. View Dashboard

- Click "User Dashboard" to see:
  - Balances
  - Bet history
  - Nugget transaction history

### 6. Admin Panel (Admin Users Only)

- Click "Admin Panel" to access:
  - Statistics and analytics
  - Bet monitoring
  - User management
  - Payroll management
  - Provably fair seed management

## Running Scheduled Jobs

### Daily Payroll (Cron)

Add to crontab:

```cron
0 0 * * * /usr/bin/php /path/to/backend-php/scripts/run_payroll.php
```

Or run manually:

```bash
php backend-php/scripts/run_payroll.php
```

## Troubleshooting

### MongoDB Connection Failed

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Start if stopped
sudo systemctl start mongod
```

### Apache Permission Errors

```bash
# Set correct permissions
sudo chown -R www-data:www-data /path/to/solana-eth-casino-suite/backend-php
sudo chmod -R 755 /path/to/solana-eth-casino-suite/backend-php
```

### Wallet Connection Fails

- Ensure wallet extension is installed
- Check you're on the correct network (Devnet for Solana, Goerli/Sepolia for Ethereum)
- Clear browser cache and try again

### Frontend Build Fails

```bash
cd frontend
rm -rf node_modules
npm install
npm run build
```

## Next Steps

- Read [Architecture Overview](architecture.md)
- Review [Security Best Practices](security.md)
- Understand [Provably Fair System](provably_fair.md)

## Getting Help

- Check logs: `backend-php/logs/casino.log`
- Review API responses in browser DevTools
- Ensure all environment variables are set correctly

---

**Remember: This is for development and demonstration only. Do not use for real-money gambling without proper licensing!**
