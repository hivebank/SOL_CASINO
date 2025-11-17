# Casino Frontend

JavaScript frontend for the Solana-ETH Casino Suite.

## Structure

```
frontend/
├── common/           # Shared utilities
│   ├── api.js       # API client
│   ├── solana.js    # Solana wallet integration
│   ├── ethereum.js  # Ethereum wallet integration
│   └── ui.js        # UI utilities
├── lobby/           # Main lobby page
├── games/           # Game implementations
│   ├── slots/       # Slots game
│   ├── roulette/    # Roulette game
│   └── blackjack/   # Blackjack game
├── dashboard/       # User dashboard
├── admin/           # Admin panel
└── public/          # Build output
```

## Building

```bash
# Install dependencies
npm install

# Build all
npm run build

# Build individual components
npm run build:lobby
npm run build:games
npm run build:dashboard
npm run build:admin

# Development mode (watch)
npm run dev
```

## Games

### Slots
- Multi-reel mechanics with configurable paylines
- Animated spinning with physics
- Particle effects for wins
- Provably fair results

### Roulette
- Animated European wheel
- Physics-based ball simulation
- Multiple bet types (straight, split, red/black, etc.)
- Visual bet placement

### Blackjack
- Card dealing animations
- Dealer AI
- Multi-action gameplay (hit, stand, double, split)
- Side bet support

## Wallet Integration

### Phantom (Solana)
1. Install Phantom browser extension
2. Switch to Devnet in settings
3. Connect via lobby

### MetaMask (Ethereum)
1. Install MetaMask browser extension
2. Switch to Goerli or Sepolia testnet
3. Connect via lobby

## API Integration

All API calls go through the `api.js` client:

```javascript
import { api } from './common/api.js';

// Example: Place a bet
const result = await api.placeBet('slots', 10, 'demo', gameData);
```

## Development

### Adding a New Game

1. Create directory: `games/your-game/`
2. Create `index.html` and `index.js`
3. Implement p5.js sketch
4. Add build script to `package.json`
5. Update lobby to include game card

### Testing

```bash
npm test
```

## Deployment

The built files in `public/` should be served by a web server. The backend API must be accessible at the configured `API_BASE` URL.

For production:
1. Update API_BASE in api.js
2. Build with `npm run build`
3. Deploy `public/` contents to CDN or web server
4. Ensure CORS is properly configured on backend
