# 🚂 Railway.com Deployment Guide

Complete guide to deploying the Solana-ETH Casino Suite on Railway.com.

## 📋 Prerequisites

- Railway.com account (sign up at https://railway.app)
- GitHub account with this repository
- MongoDB database (can use Railway's MongoDB template)

## 🚀 Quick Deploy

### Step 1: Create MongoDB Database

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy MongoDB"
4. Note the connection string from the MongoDB service variables

### Step 2: Deploy Application

1. In Railway, click "New" → "GitHub Repo"
2. Select this repository
3. Railway will auto-detect the Dockerfile and deploy

### Step 3: Configure Environment Variables

Set the following variables in your Railway service:

#### Required Variables
```bash
PORT=8080                    # Railway will set this automatically
MONGODB_URI=mongodb://...    # Copy from MongoDB service
DB_NAME=casino_db
JWT_SECRET=your-secret-key-here-min-32-chars
MODE=demo                    # Options: demo, testnet, production
```

#### Blockchain Variables (for testnet/production)
```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
ETHEREUM_RPC_URL=https://goerli.infura.io/v3/YOUR-PROJECT-ID

# For production mode
SOLANA_PROGRAM_ID=your-solana-program-id
ETH_CONTRACT_ADDRESS=your-eth-contract-address
```

#### Optional Variables
```bash
CORS_ORIGIN=*               # Set to your frontend domain
LOG_LEVEL=info              # Options: debug, info, warn, error
RATE_LIMIT=100              # Requests per minute
```

## 🔗 Connect MongoDB

### Option 1: Railway MongoDB (Recommended)

1. Add MongoDB from Railway templates
2. Click on MongoDB service → Variables
3. Copy `MONGO_URL` value
4. Set it as `MONGODB_URI` in your app service

### Option 2: External MongoDB (MongoDB Atlas)

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/casino_db
```

## 🌐 Custom Domain

1. Go to your Railway service → Settings
2. Click "Generate Domain" for a free railway.app domain
3. Or add your custom domain:
   - Click "Custom Domain"
   - Add your domain (e.g., casino.yourdomain.com)
   - Configure DNS:
     - Type: CNAME
     - Name: casino (or @)
     - Value: your-app.up.railway.app

## 📊 Health Check

Your app includes a health check endpoint:

```bash
GET https://your-app.up.railway.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "mode": "demo"
}
```

## 🔍 Monitoring

Railway provides:
- Real-time logs in the dashboard
- Metrics (CPU, Memory, Network)
- Deployment history
- Automatic HTTPS

## 🎮 Access Your Casino

After deployment:

1. **Frontend Lobby:** `https://your-app.up.railway.app/lobby`
2. **Slots Game:** `https://your-app.up.railway.app/games/slots`
3. **Roulette Game:** `https://your-app.up.railway.app/games/roulette`
4. **Blackjack Game:** `https://your-app.up.railway.app/games/blackjack`
5. **API Docs:** `https://your-app.up.railway.app/api`

## 🛠️ Troubleshooting

### Container Won't Start

Check logs in Railway dashboard. Common issues:

1. **MongoDB not connected:** Verify `MONGODB_URI` is correct
2. **Port conflict:** Railway sets PORT automatically, don't hardcode it
3. **Composer dependencies:** Clear build cache and redeploy

### API Returns 500 Error

1. Check Railway logs for PHP errors
2. Verify all environment variables are set
3. Ensure MongoDB is running and accessible

### Games Not Loading

1. Check browser console for errors
2. Verify CORS settings (`CORS_ORIGIN`)
3. Ensure frontend files are being served correctly

## 🔐 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a strong random string (min 32 chars)
- [ ] Set `MODE=production` only when ready
- [ ] Configure proper `CORS_ORIGIN` (not `*`)
- [ ] Use environment-specific MongoDB database
- [ ] Enable MongoDB authentication
- [ ] Set up proper blockchain RPC endpoints
- [ ] Configure rate limiting
- [ ] Review and update API keys
- [ ] Enable HTTPS (automatic with Railway)
- [ ] Set up monitoring and alerts

## 📈 Scaling

Railway auto-scales based on:
- CPU usage
- Memory consumption
- Request volume

To manually scale:
1. Go to service settings
2. Adjust "Replicas" (Pro plan required)

## 💰 Cost Estimation

**Free Tier:**
- $5 free credit/month
- Suitable for development/testing

**Pro Plan ($20/month):**
- Unlimited projects
- Custom domains
- Higher resource limits
- Better for production

**Estimated Monthly Cost:**
- Hobby: $0-5 (demo/testnet)
- Production: $20-50 (depends on traffic)

## 🆘 Support

- Railway Docs: https://docs.railway.app
- Casino Repo: https://github.com/yourusername/solana-eth-casino-suite
- Railway Discord: https://discord.gg/railway

## 🎯 Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure environment variables
3. ✅ Test all three games
4. ✅ Set up custom domain
5. 🔲 Add blockchain integration (testnet)
6. 🔲 Test provably fair RNG
7. 🔲 Configure admin dashboard
8. 🔲 Deploy to production

---

**Made with ❤️ for the blockchain casino community**
