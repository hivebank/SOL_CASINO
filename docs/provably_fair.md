# Provably Fair System

This casino implements a provably fair random number generation system that allows players to verify the fairness of every bet.

## How It Works

### Commit-Reveal Scheme

1. **Server Seed Commitment**: The casino generates a random server seed and publishes only its SHA-256 hash before any bets are placed
2. **Client Seed**: Each player provides their own client seed (or one is generated for them)
3. **Bet Placement**: Bets are placed using the committed server seed hash (not the actual seed)
4. **Result Generation**: Results are generated using HMAC-SHA256(server_seed, client_seed || bet_id)
5. **Seed Revelation**: After a period or number of bets, the server seed is revealed for public verification

### RNG Algorithm

```
random_bytes = HMAC_SHA256(server_seed, client_seed || bet_id)
random_int = first_8_bytes_as_integer(random_bytes)
result = min + (random_int % (max - min + 1))
```

## Verification Process

### For Players

1. **Before Betting**: Note the server seed hash displayed in the game
2. **During Betting**: Provide your own client seed or use the generated one
3. **After Seed Revelation**: Verify your bet results using the revealed server seed

### Verification Steps

#### Step 1: Get the Data

You need three pieces of information:
- Server seed (revealed after rotation)
- Client seed (your seed or auto-generated)
- Bet ID (unique identifier for your bet)

#### Step 2: Calculate HMAC

```javascript
const crypto = require('crypto');

const serverSeed = 'revealed_server_seed';
const clientSeed = 'your_client_seed';
const betId = 'bet_12345';

const message = clientSeed + '||' + betId;
const hmac = crypto.createHmac('sha256', serverSeed)
                   .update(message)
                   .digest();
```

#### Step 3: Convert to Number

```javascript
let randomInt = 0;
for (let i = 0; i < 8; i++) {
    randomInt = (randomInt << 8) | hmac[i];
}
```

#### Step 4: Map to Range

For a result between `min` and `max`:

```javascript
const range = max - min + 1;
const result = min + (randomInt % range);
```

### Example Verification (JavaScript)

```javascript
function verifyBet(serverSeed, clientSeed, betId, min, max, claimedResult) {
    const crypto = require('crypto');

    // Generate HMAC
    const message = clientSeed + '||' + betId;
    const hmac = crypto.createHmac('sha256', serverSeed)
                       .update(message)
                       .digest();

    // Convert to integer
    let randomInt = 0;
    for (let i = 0; i < 8; i++) {
        randomInt = (randomInt << 8) | hmac[i];
    }

    // Map to range
    const range = max - min + 1;
    const result = min + (randomInt % range);

    // Verify
    if (result === claimedResult) {
        console.log('✅ Bet is provably fair!');
        return true;
    } else {
        console.log('❌ Bet verification failed!');
        console.log('Expected:', claimedResult);
        console.log('Calculated:', result);
        return false;
    }
}

// Example usage
verifyBet(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '6a4f2e9d8c3b1a0f',
    'bet_12345',
    0,
    36,
    17
);
```

### Example Verification (Python)

```python
import hmac
import hashlib

def verify_bet(server_seed, client_seed, bet_id, min_val, max_val, claimed_result):
    # Generate HMAC
    message = f"{client_seed}||{bet_id}"
    hmac_bytes = hmac.new(
        server_seed.encode(),
        message.encode(),
        hashlib.sha256
    ).digest()

    # Convert to integer
    random_int = 0
    for i in range(8):
        random_int = (random_int << 8) | hmac_bytes[i]

    # Map to range
    range_size = max_val - min_val + 1
    result = min_val + (random_int % range_size)

    # Verify
    if result == claimed_result:
        print('✅ Bet is provably fair!')
        return True
    else:
        print('❌ Bet verification failed!')
        print(f'Expected: {claimed_result}')
        print(f'Calculated: {result}')
        return False
```

## Server Seed Management

### Seed Lifecycle

1. **Generation**: Admin generates a cryptographically random 32-byte seed
2. **Commitment**: Hash (SHA-256) is published and marked as active
3. **Usage**: Used for all bets until rotation
4. **Rotation**: After N bets or T days, seed is revealed and new one is committed
5. **Verification**: Players can verify all historical bets

### Recommended Rotation

- **By Bets**: Rotate after 10,000 bets
- **By Time**: Rotate every 7 days
- **By Request**: If compromise is suspected

### Seed Storage

- Active seed stored securely (encrypted at rest)
- Revealed seeds published publicly for verification
- Hash of next seed committed before current seed is revealed

## Transparency

### Public Information

The following information is publicly available:

1. **Active Seed Hash**: Current server seed hash
2. **Revealed Seeds**: All previously used server seeds with their hashes
3. **Bet Records**: Complete bet history with:
   - Bet ID
   - Server seed hash used
   - Client seed
   - Result
   - Timestamp

### Audit Trail

Every bet creates an immutable audit record containing:

```json
{
  "bet_id": "unique_bet_identifier",
  "user_id": "user_identifier",
  "game": "slots|roulette|blackjack",
  "server_seed_hash": "sha256_hash_of_server_seed",
  "client_seed": "user_provided_or_generated",
  "stake": 10.0,
  "outcome": {...},
  "payout": 20.0,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Game-Specific Implementation

### Slots

Multiple random numbers are generated for each reel:

```
reel_0 = RNG(server_seed, client_seed || bet_id || '_0', 0, num_symbols)
reel_1 = RNG(server_seed, client_seed || bet_id || '_1', 0, num_symbols)
...
```

### Roulette

Single random number for winning number:

```
winning_number = RNG(server_seed, client_seed || bet_id, 0, 36)
```

### Blackjack

Sequential card generation:

```
player_card_1 = RNG(server_seed, client_seed || bet_id || '_player_0', 1, 13)
dealer_card_1 = RNG(server_seed, client_seed || bet_id || '_dealer_0', 1, 13)
player_card_2 = RNG(server_seed, client_seed || bet_id || '_player_1', 1, 13)
...
```

## Security Considerations

### Secure Seed Generation

```javascript
// Good: Cryptographically secure
const crypto = require('crypto');
const serverSeed = crypto.randomBytes(32).toString('hex');

// Bad: Not cryptographically secure
const serverSeed = Math.random().toString();
```

### Commitment Integrity

- Server seed hash must be published BEFORE any bets using that seed
- Hash algorithm: SHA-256 (no collisions, pre-image resistant)
- Never reveal seed before rotation period ends

### Client Seed Requirements

- Allow users to provide their own seeds
- Auto-generate using crypto.getRandomValues() if not provided
- Minimum 16 bytes (32 hex characters)

## API Endpoints for Verification

### Get Active Seed Hash

```
GET /api/v1/admin/seeds?limit=1
```

Response:
```json
{
  "seeds": [{
    "server_seed_hash": "e3b0c442...",
    "is_active": true,
    "is_revealed": false,
    "committed_at": "2025-01-15T00:00:00Z",
    "bets_count": 1234
  }]
}
```

### Get Revealed Seeds

```
GET /api/v1/admin/seeds
```

Response includes revealed server seeds for verification.

## Third-Party Verification

Players can use third-party tools to verify fairness:

1. Export bet data (bet ID, seeds, results)
2. Use independent verification scripts
3. Community-developed verification tools
4. On-chain verification (for blockchain bets)

## Frequently Asked Questions

### Q: Can the casino cheat?

A: No, because:
1. Server seed hash is committed before your bet
2. You can provide your own client seed
3. The bet ID prevents result manipulation
4. After rotation, you can verify with revealed seed

### Q: How do I know the hash matches the seed?

A: When the seed is revealed, calculate SHA-256(server_seed) and compare with the published hash.

### Q: What if I don't trust the casino's client seed generation?

A: Always provide your own client seed! Use a random string or hash of your choosing.

### Q: Can past results be changed?

A: No. Bet records are immutable. Any change would be detectable through verification.

### Q: How often should seeds rotate?

A: Industry standard is every 7 days or 10,000 bets, whichever comes first.

## Best Practices for Players

1. **Save Your Data**: Record bet ID, client seed, and server seed hash
2. **Provide Your Own Seeds**: Don't rely on auto-generated client seeds
3. **Verify Regularly**: Check a sample of your bets after seed revelation
4. **Use Multiple Verification Tools**: Cross-check with independent tools
5. **Report Discrepancies**: Contact support immediately if verification fails

## Conclusion

The provably fair system provides mathematical proof of fairness. By following the verification process, players can confirm that every bet outcome was determined fairly and wasn't manipulated after the bet was placed.

For technical support or questions about verification, please refer to the API documentation or contact technical support.
