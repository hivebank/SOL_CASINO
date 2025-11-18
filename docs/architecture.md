# Architecture Overview

Complete technical architecture of the Solana-ETH Casino Suite.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Lobby (p5.js) │ Games (p5.js) │ Dashboard │ Admin Panel   │
│  - Wallet Connect │ - Slots      │ - User    │ - Stats      │
│  - Mode Toggle    │ - Roulette   │ - History │ - Bets       │
│  - Balance        │ - Blackjack  │ - Nuggets │ - Seeds      │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
         ┌───▼────────────────────────────────────▼──────┐
         │           API Gateway (Apache/PHP)            │
         │  - CORS │ Rate Limiting │ Auth │ Routing     │
         └───┬──────────────────────────────────┬────────┘
             │                                  │
    ┌────────▼────────┐              ┌─────────▼─────────┐
    │  Authentication │              │   Game Engine     │
    │  - JWT          │              │   - RNG           │
    │  - Wallet Sigs  │              │   - Bet Resolver  │
    └────────┬────────┘              │   - Payout Calc   │
             │                       └─────────┬─────────┘
             │                                 │
    ┌────────▼─────────────────────────────────▼─────────┐
    │              Core Services Layer                    │
    ├─────────────────────────────────────────────────────┤
    │ PaymentService │ PayrollService │ GameEngine │ RNG │
    └────────┬────────────────────────────────────┬───────┘
             │                                    │
    ┌────────▼────────────────────────────────────▼───────┐
    │               Data Layer (MongoDB)                  │
    ├─────────────────────────────────────────────────────┤
    │ Users │ Bets │ Nuggets │ Payroll │ ProvablyFair    │
    └────────┬────────────────────────────────────────────┘
             │
    ┌────────▼────────────────────────┐
    │    External Integrations        │
    ├─────────────────────────────────┤
    │ Solana RPC │ Ethereum RPC       │
    │ Devnet     │ Goerli/Sepolia     │
    └─────────────────────────────────┘
```

## Technology Stack

### Backend

- **Language**: PHP 8.3
- **Web Server**: Apache 2.4 with mod_rewrite
- **Database**: MongoDB 6.0+
- **Authentication**: JWT (firebase/php-jwt)
- **HTTP Client**: Guzzle
- **Dependencies**: Composer

### Frontend

- **Build Tool**: esbuild
- **Graphics**: p5.js
- **Blockchain**:
  - @solana/web3.js (Solana)
  - ethers.js (Ethereum)
- **Package Manager**: npm

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Apache (built-in) or nginx (optional)
- **CI/CD**: GitHub Actions

## Component Details

### Backend Components

#### 1. API Layer (`src/Api/`)

**Router.php**
- Request routing
- Middleware application
- Parameter extraction
- Response handling

**Controllers/**
- `AuthController`: Wallet authentication
- `UserController`: User operations
- `GameController`: Game logic
- `AdminController`: Administrative functions

**Middleware/**
- `AuthMiddleware`: JWT validation, role checking
- `RateLimitMiddleware`: Request throttling

#### 2. Models (`src/Models/`)

**User**
- Wallet addresses (multiple chains)
- Balances (demo, nugget, testnet)
- Role and permissions
- KYC status

**Bet**
- Game type and parameters
- Stake and payout
- Provably fair seeds
- Resolution status

**Nugget**
- Transaction ledger
- Credit/debit operations
- Immutable history

**ProvablyFair**
- Server seed management
- Commit-reveal tracking
- Bet count per seed

**Payroll**
- Payroll run records
- Eligible users
- Amounts and status

#### 3. Services (`src/Services/`)

**RNG**
- HMAC-SHA256 based randomness
- Provably fair implementation
- Seed management
- Verification functions

**GameEngine**
- Game resolution logic
- Multiplier calculation
- Payout processing
- Game-specific rules

**PaymentService**
- Blockchain RPC interaction
- Transaction verification
- Balance queries
- Airdrop requests

**PayrollService**
- Eligibility calculation
- Automated payouts
- Nugget distribution
- Activity tracking

#### 4. Utilities (`src/Utils/`)

**Response**
- JSON formatting
- HTTP status codes
- Error handling

**Logger**
- File-based logging
- Level filtering
- Context inclusion

### Frontend Components

#### 1. Common Libraries (`common/`)

**api.js**
- API client wrapper
- Request/response handling
- Authentication token management
- Endpoint methods

**solana.js**
- Phantom wallet integration
- Transaction signing
- Balance queries
- Devnet support

**ethereum.js**
- MetaMask integration
- Transaction sending
- Network switching
- Testnet support

**ui.js**
- UI utilities
- Notifications
- Modals
- Formatters

#### 2. Lobby (`lobby/`)

- p5.js particle animations
- Wallet connection flow
- Mode selection (demo/testnet/production)
- Balance display
- Game navigation

#### 3. Games (`games/`)

**Slots**
- Multi-reel mechanics
- Symbol animations
- Payline calculation
- Win particle effects

**Roulette**
- Wheel animation
- Ball physics
- Bet table UI
- Result display

**Blackjack**
- Card dealing animation
- Hand calculation
- Multi-action buttons
- Dealer AI

#### 4. Dashboards

**User Dashboard**
- Balance overview
- Bet history
- Nugget transactions
- Statistics

**Admin Panel**
- Real-time statistics
- Bet monitoring
- User management
- Seed management
- Payroll controls

## Data Flow

### Bet Placement Flow

```
1. User clicks "Bet" in game
   ↓
2. Frontend calls api.placeBet()
   ↓
3. API validates auth & balance
   ↓
4. Deducts stake from user balance
   ↓
5. Creates bet record (status: pending)
   ↓
6. Returns bet_id to frontend
   ↓
7. Frontend displays "pending" state
   ↓
8. Frontend calls api.resolveBet(bet_id)
   ↓
9. GameEngine resolves using RNG
   ↓
10. Updates bet (status: resolved)
    ↓
11. Credits payout if won
    ↓
12. Returns outcome to frontend
    ↓
13. Frontend displays result animation
```

### Authentication Flow

```
1. User clicks "Connect Wallet"
   ↓
2. Wallet extension prompts connection
   ↓
3. Frontend gets wallet address
   ↓
4. Frontend calls api.requestNonce(address)
   ↓
5. Backend generates nonce, stores with user
   ↓
6. Frontend prompts wallet to sign nonce
   ↓
7. User signs in wallet extension
   ↓
8. Frontend calls api.login(address, signature)
   ↓
9. Backend verifies signature
   ↓
10. Backend generates JWT token
    ↓
11. Frontend stores token (localStorage)
    ↓
12. All subsequent requests include token
```

### Payroll Flow

```
1. Cron triggers payroll script
   ↓
2. PayrollService.runDailyPayroll()
   ↓
3. Query active users with minimum activity
   ↓
4. For each eligible user:
   ├─ Nugget.credit(user, amount, "payroll")
   └─ Update user nugget_balance
   ↓
5. Create Payroll run record
   ↓
6. Log completion
```

## Database Schema

### Collections

**users**
```javascript
{
  _id: ObjectId,
  wallets: [{
    address: String,
    chain: String (solana|ethereum),
    added_at: DateTime
  }],
  role: String (user|admin),
  demo_balance: Number,
  nugget_balance: Number,
  testnet_balances: {
    solana: Number,
    ethereum: Number
  },
  email: String (optional),
  password_hash: String (optional),
  nonce: String,
  kyc_status: String,
  is_active: Boolean,
  created_at: DateTime,
  updated_at: DateTime,
  last_login_at: DateTime
}
```

**bets**
```javascript
{
  _id: ObjectId,
  user_id: String,
  game: String (slots|roulette|blackjack),
  mode: String (demo|testnet|production),
  stake: Number,
  currency: String,
  game_data: Object,
  client_seed: String,
  server_seed_hash: String,
  status: String (pending|resolved|cancelled),
  outcome: Object,
  payout: Number,
  multiplier: Number,
  house_edge: Number,
  tx_hash: String,
  chain: String,
  created_at: DateTime,
  resolved_at: DateTime
}
```

**nugget_transactions**
```javascript
{
  _id: ObjectId,
  user_id: String,
  amount: Number,
  type: String (credit|debit),
  reason: String,
  metadata: Object,
  created_at: DateTime
}
```

**provably_fair_seeds**
```javascript
{
  _id: ObjectId,
  server_seed: String,
  server_seed_hash: String,
  is_active: Boolean,
  is_revealed: Boolean,
  committed_at: DateTime,
  revealed_at: DateTime,
  bets_count: Number
}
```

## Security Layers

### Layer 1: Network
- HTTPS/TLS encryption
- DDoS protection
- Rate limiting

### Layer 2: Application
- Input validation
- Output encoding
- CSRF protection
- Security headers

### Layer 3: Authentication
- JWT tokens
- Wallet signatures
- Role-based access

### Layer 4: Data
- MongoDB authentication
- Encrypted at rest
- Backup encryption

### Layer 5: Blockchain
- Signature verification
- Transaction validation
- Multi-sig escrow (production)

## Scalability Considerations

### Horizontal Scaling

- **Backend**: Multiple Apache/PHP containers behind load balancer
- **Database**: MongoDB replica set or sharding
- **Cache**: Redis for session and rate limit data

### Vertical Scaling

- **CPU**: Game resolution and RNG computation
- **Memory**: In-memory bet processing
- **Storage**: MongoDB indexes, SSD storage

### Performance Optimization

- **Database Indexes**: On user_id, created_at, status
- **Query Optimization**: Limit, pagination, projection
- **Caching**: Game config, user sessions
- **CDN**: Static frontend assets

## Monitoring & Observability

### Metrics

- Request rate and latency
- Error rates
- Active users
- Bet volume
- Balance changes
- RNG performance

### Logging

- Application logs (file-based)
- Access logs (Apache)
- Error logs (PHP, Apache)
- Audit logs (all admin actions)

### Alerts

- High error rate
- Unusual bet patterns
- Balance discrepancies
- Failed authentication attempts
- System resource usage

## Deployment Architecture

### Development
```
Laptop → Docker Compose (all services local)
```

### Staging
```
Git Push → GitHub Actions → Build → Deploy to Staging VPS
```

### Production
```
Git Tag → GitHub Actions → Build → Deploy to Production
          ↓
    - Load Balancer
    - Multiple App Servers
    - MongoDB Replica Set
    - Redis Cluster
    - CDN
```

## Future Enhancements

- WebSocket for real-time updates
- GraphQL API option
- Advanced analytics dashboard
- Mobile app (React Native)
- More games (Poker, Dice, Crash)
- Progressive jackpots
- Tournament system
- Affiliate program
- Multi-language support
- Advanced KYC integration
