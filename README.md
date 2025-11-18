# Solana-ETH Casino Suite

**⚠️ DEMO MODE ONLY - NOT FOR REAL-MONEY GAMBLING ⚠️**

This repository is a comprehensive developer demonstration of a blockchain-based casino platform. **This software must NOT be used for unlicensed real-money gambling.** Operating a gambling platform requires legal licenses, regulatory compliance, and proper jurisdictional authorization.

## Overview

A complete, production-style monorepo demonstrating a full-featured casino platform with:

- **Dual Blockchain Support**: Solana (Phantom wallet) and Ethereum (MetaMask)
- **Three Interactive Games**: Slots, Roulette, and Blackjack with p5.js animations
- **Provably Fair RNG**: Commit-reveal scheme with HMAC-based random number generation
- **Internal Nugget Token**: Off-chain payroll token with optional on-chain ERC-20/SPL wrappers
- **Three Operating Modes**: Demo (instant credits), Testnet (faucet helpers), Production (placeholders)
- **Complete Admin Dashboard**: Bet monitoring, house edge configuration, manual payouts, audit logs
- **Modern Tech Stack**: PHP 8.3 backend, MongoDB, vanilla JS + p5.js games, React-lite dashboards

## Quick Start

### Prerequisites

- Docker & Docker Compose **OR** Apache 2.4+ with PHP 8.3, MongoDB 6.0+
- Node.js 18+ and npm
- Git

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url> solana-eth-casino-suite
cd solana-eth-casino-suite

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start all services
docker-compose -f infra/docker-compose.yml up -d

# Visit the application
open http://localhost:8080
```

### Option 2: Manual Setup (Apache VPS)

```bash
# Clone and navigate
git clone <your-repo-url> solana-eth-casino-suite
cd solana-eth-casino-suite

# Copy and configure environment
cp backend-php/.env.example backend-php/.env
# Edit backend-php/.env with your settings:
# - MONGO_URI (default: mongodb://localhost:27017/casino)
# - JWT_SECRET (generate a secure random string)
# - SOLANA_RPC_URL (default: https://api.devnet.solana.com)
# - ETH_RPC_URL (default: https://goerli.infura.io/v3/YOUR_KEY)

# Install backend dependencies
cd backend-php
composer install
cd ..

# Install frontend dependencies and build
cd frontend
npm install
npm run build
cd ..

# Run database migrations and seed data
php backend-php/scripts/seed_demo_data.php

# Configure Apache
# See docs/quickstart.md for Apache VHost configuration

# Start Apache and MongoDB
sudo systemctl start apache2
sudo systemctl start mongod
```

### Default Admin Credentials

- **Email**: admin@casino.local
- **Password**: Admin123!@#

**⚠️ CHANGE THESE IMMEDIATELY IN PRODUCTION ⚠️**

## Features

### Games

1. **Slots** - Multi-reel configurable slot machine with:
   - 3-5 reels with dynamic paylines
   - Interactive spin mechanics with physics
   - Free spins and bonus rounds
   - Particle effects and animations
   - Configurable paytables

2. **Roulette** - European roulette with:
   - Animated wheel with physics-based ball
   - Full bet table (straight, split, column, dozens, colors)
   - Visual chip placement
   - Realistic win animations

3. **Blackjack** - Classic 21 with:
   - Multi-action (Hit, Stand, Double, Split)
   - Dealer AI
   - Card animations
   - Side bets support

### Payment Systems

- **Solana**: Phantom wallet integration with devnet support
- **Ethereum**: MetaMask integration with testnet support (Goerli/Sepolia)
- **Nugget Tokens**: Internal off-chain payroll system with optional on-chain wrappers

### Admin Features

- Real-time bet monitoring
- House edge configuration per game
- Manual payout issuance
- User management
- Audit log export (CSV)
- Provably fair seed management
- ML-powered suspicious activity detection

### Security Features

- JWT-based authentication with wallet signatures
- Role-based access control (user/admin)
- Rate limiting middleware
- CORS and security headers
- Provably fair RNG with public verification
- Server seed commit-reveal system

## Repository Structure

```
solana-eth-casino-suite/
├── backend-php/          # PHP 8.3 API backend
├── frontend/             # JavaScript frontends
├── contracts/            # Optional ERC-20/SPL token contracts
├── infra/                # Docker and deployment configs
├── docs/                 # Comprehensive documentation
├── ci/                   # GitHub Actions workflows
└── scripts/              # Setup and utility scripts
```

## Documentation

- [Quick Start Guide](docs/quickstart.md)
- [Architecture Overview](docs/architecture.md)
- [Security Best Practices](docs/security.md)
- [Provably Fair System](docs/provably_fair.md)

## Development

### Running Tests

```bash
# PHP unit tests
cd backend-php
./vendor/bin/phpunit

# JavaScript tests
cd frontend
npm test
```

### Running Demo Script

```bash
# Complete end-to-end demo
./scripts/demo.sh
```

### Local Blockchain Testing

```bash
# Start Solana test validator
solana-test-validator

# Start Hardhat local Ethereum node
cd contracts/erc20
npx hardhat node
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/nonce` - Request nonce for wallet login
- `POST /api/v1/auth/login` - Verify signed nonce and get JWT

### User
- `GET /api/v1/user/me` - Get current user data
- `POST /api/v1/topup/demo` - Credit demo balance (dev only)
- `POST /api/v1/topup/testnet-request` - Get testnet faucet instructions

### Game
- `POST /api/v1/game/bet` - Place a bet
- `POST /api/v1/game/resolve` - Resolve bet (worker/admin)
- `GET /api/v1/game/history` - User bet history

### Admin
- `GET /api/v1/admin/bets` - List all bets with filters
- `POST /api/v1/admin/payout` - Issue manual payout
- `POST /api/v1/admin/seed/commit` - Commit server seed
- `POST /api/v1/admin/seed/reveal` - Reveal server seed

## Operating Modes

### Demo Mode (Default)
- Instant demo credit top-ups
- No blockchain interaction
- Fast, local-only gameplay
- Perfect for development and testing

### Testnet Mode
- Uses Solana Devnet and Ethereum Goerli/Sepolia
- Real wallet signatures required
- Faucet helpers for testnet tokens
- Demonstrates full blockchain flow

### Production Mode
- **⚠️ REQUIRES GAMBLING LICENSE ⚠️**
- Gated with compliance warnings
- Multi-sig wallet recommendations
- KYC/AML integration points
- See `docs/security.md` for requirements

## Legal & Compliance

**WARNING**: This software is provided as a developer demonstration only. Operating a real-money gambling platform requires:

1. Valid gambling license in your jurisdiction
2. KYC/AML compliance systems
3. Responsible gambling tools
4. Legal terms of service and privacy policy
5. Age verification
6. Payment processor compliance
7. Tax reporting systems
8. Regulatory audits

**The developers of this software are not responsible for any illegal use. Use at your own risk.**

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open a GitHub issue. **Do not use this for real-money gambling without proper licensing.**

---

**Built with ❤️ for the developer community. Gamble responsibly. Know your local laws.**
