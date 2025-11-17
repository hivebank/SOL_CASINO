# Casino Backend - PHP API

RESTful API backend for the Solana-ETH Casino Suite.

## Requirements

- PHP 8.3+
- Composer
- MongoDB 6.0+
- Apache 2.4+ with mod_rewrite

## Installation

```bash
# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations and seed data
php scripts/seed_demo_data.php
```

## Configuration

Edit `.env` file with your settings:

- **MONGO_URI**: MongoDB connection string
- **JWT_SECRET**: Secret key for JWT tokens (minimum 32 characters)
- **SOLANA_RPC_URL**: Solana RPC endpoint (default: devnet)
- **ETH_RPC_URL**: Ethereum RPC endpoint (default: Goerli testnet)
- **OPERATING_MODE**: Operating mode (demo, testnet, production)

## Running the Server

### With Docker

```bash
cd ..
docker-compose -f infra/docker-compose.yml up -d
```

### With Apache (VPS)

Configure Apache VirtualHost:

```apache
<VirtualHost *:80>
    ServerName casino.local
    DocumentRoot /path/to/backend-php/public

    <Directory /path/to/backend-php/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/casino_error.log
    CustomLog ${APACHE_LOG_DIR}/casino_access.log combined
</VirtualHost>
```

### With PHP Built-in Server (Development Only)

```bash
cd public
php -S localhost:8000
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/nonce` - Request nonce for wallet signature
- `POST /api/v1/auth/login` - Login with signed message

### User

- `GET /api/v1/user/me` - Get current user data (requires auth)
- `POST /api/v1/topup/demo` - Top up demo balance (requires auth)
- `POST /api/v1/topup/testnet-request` - Request testnet tokens (requires auth)

### Game

- `POST /api/v1/game/bet` - Place a bet (requires auth)
- `POST /api/v1/game/resolve` - Resolve a bet (requires auth)
- `GET /api/v1/game/history` - Get bet history (requires auth)
- `GET /api/v1/game/config` - Get game configuration

### Admin (Requires admin role)

- `GET /api/v1/admin/bets` - List all bets with filters
- `POST /api/v1/admin/payout` - Issue manual payout
- `POST /api/v1/admin/seed/commit` - Commit new server seed
- `POST /api/v1/admin/seed/reveal` - Reveal server seed
- `GET /api/v1/admin/seeds` - List all seeds
- `GET /api/v1/admin/users` - List all users
- `PUT /api/v1/admin/house-edge` - Update house edge
- `GET /api/v1/admin/stats` - Get statistics
- `POST /api/v1/admin/payroll/run` - Run payroll job

## Running Tests

```bash
composer test
```

## Scheduled Jobs

### Daily Payroll

Add to crontab:

```cron
0 0 * * * /usr/bin/php /path/to/backend-php/scripts/run_payroll.php
```

## Security

- All passwords are hashed with bcrypt
- JWT tokens expire after 24 hours (configurable)
- Rate limiting on sensitive endpoints
- CORS headers configured
- Input validation on all endpoints
- MongoDB injection protection

## Logging

Logs are written to `logs/casino.log`. Configure log level in `.env`:

```
LOG_LEVEL=debug  # debug, info, warning, error, critical
```

## Architecture

```
src/
├── Api/
│   ├── Controllers/    # Request handlers
│   ├── Middleware/     # Auth, rate limiting, etc.
│   └── Router.php      # Route definitions
├── Models/             # MongoDB models
├── Services/           # Business logic
│   ├── GameEngine.php  # Game resolution logic
│   ├── RNG.php         # Provably fair RNG
│   ├── PaymentService.php
│   └── PayrollService.php
└── Utils/              # Helpers, logging, response
```

## Provably Fair System

The RNG uses HMAC-SHA256 with:
- Server seed (committed before bets)
- Client seed (provided by user)
- Bet ID (unique per bet)

Verification:
1. Admin commits server seed hash
2. Users see the hash before betting
3. After reveal, users can verify results using server seed + client seed

See `/docs/provably_fair.md` for details.
