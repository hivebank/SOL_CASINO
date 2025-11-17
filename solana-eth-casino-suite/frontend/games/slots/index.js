/**
 * State-of-the-Art Slots Game - Professional Casino Standard
 * Complete implementation with all modern casino features
 */

import p5 from 'p5';
import { api } from '../../common/api.js';
import { UIHelper } from '../../common/ui.js';

// Symbol definitions with weighted probabilities
const SYMBOLS = {
    CHERRY: { id: 0, icon: '🍒', value: 5, weight: 15 },
    LEMON: { id: 1, icon: '🍋', value: 10, weight: 12 },
    ORANGE: { id: 2, icon: '🍊', value: 15, weight: 10 },
    PLUM: { id: 3, icon: '🍇', value: 20, weight: 8 },
    BELL: { id: 4, icon: '🔔', value: 30, weight: 6 },
    STAR: { id: 5, icon: '⭐', value: 50, weight: 4 },
    SEVEN: { id: 6, icon: '7️⃣', value: 100, weight: 2 },
    DIAMOND: { id: 7, icon: '💎', value: 200, weight: 1 },
    WILD: { id: 8, icon: '🎰', value: 0, weight: 3 },
    SCATTER: { id: 9, icon: '⚡', value: 0, weight: 2 }
};

const CONFIG = {
    REELS: 5,
    ROWS: 3,
    SYMBOL_SIZE: 90,
    REEL_WIDTH: 110,
    PAYLINES: 25,
    MAX_BET_LEVEL: 10,
    SPIN_DURATION: 1500
};

// Jackpot Manager - handles progressive jackpots
class JackpotManager {
    constructor() {
        this.jackpots = {
            mini: 100,
            minor: 500,
            major: 2500,
            grand: 10000
        };
        this.seeds = {
            mini: 100,
            minor: 500,
            major: 2500,
            grand: 10000
        };
    }

    contribute(betAmount) {
        this.jackpots.mini += betAmount * 0.01;
        this.jackpots.minor += betAmount * 0.02;
        this.jackpots.major += betAmount * 0.03;
        this.jackpots.grand += betAmount * 0.04;
    }

    win(tier) {
        const amount = this.jackpots[tier];
        this.jackpots[tier] = this.seeds[tier];
        return amount;
    }

    getAll() {
        return { ...this.jackpots };
    }
}

// Sound Manager (framework - add actual audio files in production)
class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.7;
    }

    play(sound) {
        if (!this.enabled) return;
        console.log(`🔊 ${sound}`);
        // In production: load and play actual audio files
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Main Slots Game Class
class SOTASlotsGame {
    constructor(p) {
        this.p = p;

        // Game state
        this.reels = [];
        this.spinning = false;
        this.balance = 0;
        this.mode = 'demo';

        // Betting
        this.stake = 10;
        this.betLevel = 1;
        this.activePaylines = CONFIG.PAYLINES;

        // Features
        this.jackpotManager = new JackpotManager();
        this.soundManager = new SoundManager();

        // Free Spins
        this.freeSpins = {
            active: false,
            remaining: 0,
            multiplier: 1,
            totalWin: 0,
            triggeredCount: 0
        };

        // Autoplay
        this.autoplay = {
            active: false,
            remaining: 0,
            stopOnWin: false,
            stopOnBonus: false,
            stopOnBalance: 0
        };

        // Visual effects
        this.particles = [];
        this.winLines = [];
        this.bigWinActive = false;
        this.winCounter = 0;
        this.winTarget = 0;

        // Statistics
        this.stats = {
            spins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            bonusCount: 0,
            jackpotWins: []
        };

        this.initReels();
    }

    initReels() {
        for (let i = 0; i < CONFIG.REELS; i++) {
            this.reels.push({
                symbols: this.generateSymbols(),
                offset: 0,
                target: 0,
                spinning: false,
                speed: 0
            });
        }
    }

    generateSymbols(count = 40) {
        const pool = [];
        Object.values(SYMBOLS).forEach(sym => {
            for (let i = 0; i < sym.weight; i++) {
                pool.push(sym.id);
            }
        });

        const symbols = [];
        for (let i = 0; i < count; i++) {
            symbols.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        return symbols;
    }

    async spin() {
        if (this.spinning) return;

        const cost = this.freeSpins.active ? 0 : this.stake * this.betLevel;

        if (!this.freeSpins.active && this.balance < cost) {
            UIHelper.showNotification('Insufficient balance!', 'error');
            return;
        }

        this.spinning = true;
        this.stats.spins++;

        if (!this.freeSpins.active) {
            this.stats.totalWagered += cost;
            this.jackpotManager.contribute(cost);
        }

        this.soundManager.play('spin');
        UIHelper.showLoading(this.freeSpins.active ? 'Free Spin...' : 'Spinning...');

        try {
            const result = await api.placeBet('slots', cost, this.mode, {
                reels: CONFIG.REELS,
                paylines: this.activePaylines,
                betLevel: this.betLevel
            }, UIHelper.generateClientSeed());

            this.startSpinAnimation();

            setTimeout(async () => {
                const resolved = await api.resolveBet(result.data.bet_id);
                await this.processWin(resolved.data);

                UIHelper.hideLoading();
                this.spinning = false;

                // Handle autoplay
                if (this.autoplay.active) {
                    this.autoplay.remaining--;
                    if (this.shouldStopAutoplay(resolved.data)) {
                        this.stopAutoplay();
                    } else if (this.autoplay.remaining > 0) {
                        setTimeout(() => this.spin(), 800);
                    } else {
                        this.stopAutoplay();
                    }
                }

                // Continue free spins
                if (this.freeSpins.active && this.freeSpins.remaining > 0) {
                    setTimeout(() => this.spin(), 1200);
                }
            }, CONFIG.SPIN_DURATION);

        } catch (error) {
            UIHelper.showNotification('Bet failed: ' + error.message, 'error');
            UIHelper.hideLoading();
            this.spinning = false;
        }
    }

    async processWin(result) {
        const reels = result.outcome.reels;
        this.stopSpinAnimation(reels);

        await this.updateBalance();

        // Count special symbols
        const scatters = this.countSymbol(reels, SYMBOLS.SCATTER.id);

        // Calculate payout with multiplier
        const multiplier = this.freeSpins.active ? this.freeSpins.multiplier : 1;
        const payout = result.payout * multiplier;

        if (this.freeSpins.active) {
            this.freeSpins.totalWin += payout;
            this.freeSpins.remaining--;
        }

        if (payout > 0) {
            this.stats.totalWon += payout;
            if (payout > this.stats.biggestWin) {
                this.stats.biggestWin = payout;
            }

            // Big win?
            if (payout >= this.stake * this.betLevel * 15) {
                this.triggerBigWin(payout);
            } else {
                this.createParticles(50);
                this.soundManager.play('win');
            }

            this.animateWinCounter(payout);
            UIHelper.showNotification(`Won ${UIHelper.formatCurrency(payout)}!`, 'success');
        }

        // Check jackpot
        await this.checkJackpot(reels);

        // Trigger free spins
        if (scatters >= 3 && !this.freeSpins.active) {
            this.triggerFreeSpins(scatters);
        }

        // End free spins
        if (this.freeSpins.active && this.freeSpins.remaining === 0) {
            this.endFreeSpins();
        }
    }

    async checkJackpot(reels) {
        const patterns = [
            { symbols: [7,7,7,7,7], tier: 'grand' },
            { symbols: [6,6,6,6,6], tier: 'major' },
            { symbols: [5,5,5,5,5], tier: 'minor' },
            { symbols: [4,4,4,4,4], tier: 'mini' }
        ];

        for (const pattern of patterns) {
            if (this.matchesPattern(reels, pattern.symbols)) {
                const amount = this.jackpotManager.win(pattern.tier);
                this.stats.jackpotWins.push({ tier: pattern.tier, amount, date: new Date() });
                await this.showJackpotWin(pattern.tier, amount);
                break;
            }
        }
    }

    matchesPattern(reels, pattern) {
        return reels.every((reel, i) => reel === pattern[i]);
    }

    countSymbol(reels, symbolId) {
        return reels.filter(id => id === symbolId).length;
    }

    triggerFreeSpins(scatterCount) {
        const spins = [0, 0, 0, 10, 15, 20][Math.min(scatterCount, 5)];
        const mult = [1, 1, 1, 2, 3, 5][Math.min(scatterCount, 5)];

        this.freeSpins = {
            active: true,
            remaining: spins,
            multiplier: mult,
            totalWin: 0,
            triggeredCount: this.freeSpins.triggeredCount + 1
        };

        this.stats.bonusCount++;
        this.soundManager.play('bonus');

        UIHelper.showNotification(`🎊 FREE SPINS! ${spins} spins with ${mult}x multiplier! 🎊`, 'success');
    }

    endFreeSpins() {
        const total = this.freeSpins.totalWin;
        this.freeSpins.active = false;

        UIHelper.showNotification(`🎉 Free Spins Complete! Won ${UIHelper.formatCurrency(total)}! 🎉`, 'success');
    }

    async showJackpotWin(tier, amount) {
        this.soundManager.play('jackpot');
        this.bigWinActive = true;

        UIHelper.showNotification(`💰 ${tier.toUpperCase()} JACKPOT! Won ${UIHelper.formatCurrency(amount)}! 💰`, 'success');

        this.balance += amount;
        await this.updateBalance();
        setTimeout(() => { this.bigWinActive = false; }, 4000);
    }

    triggerBigWin(amount) {
        this.bigWinActive = true;
        this.soundManager.play('bigwin');
        this.createParticles(150);

        setTimeout(() => { this.bigWinActive = false; }, 4000);
    }

    startAutoplay(spins, options = {}) {
        this.autoplay = {
            active: true,
            remaining: spins,
            stopOnWin: options.stopOnWin || false,
            stopOnBonus: options.stopOnBonus || false,
            stopOnBalance: options.stopOnBalance || 0
        };
        this.spin();
    }

    stopAutoplay() {
        this.autoplay.active = false;
        this.autoplay.remaining = 0;
    }

    shouldStopAutoplay(result) {
        if (this.autoplay.stopOnWin && result.payout > 0) return true;
        if (this.autoplay.stopOnBonus && this.freeSpins.active) return true;
        if (this.autoplay.stopOnBalance > 0 && this.balance <= this.autoplay.stopOnBalance) return true;
        return false;
    }

    startSpinAnimation() {
        this.reels.forEach((reel, i) => {
            reel.spinning = true;
            reel.speed = 25 + i * 3;
        });
    }

    stopSpinAnimation(results) {
        this.reels.forEach((reel, i) => {
            setTimeout(() => {
                reel.spinning = false;
                reel.target = results[i] * CONFIG.SYMBOL_SIZE;
                this.soundManager.play('stop');
            }, 300 * i);
        });
    }

    animateWinCounter(target) {
        this.winCounter = 0;
        this.winTarget = target;
        const step = target / 40;

        const animate = () => {
            if (this.winCounter < this.winTarget) {
                this.winCounter = Math.min(this.winCounter + step, this.winTarget);
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    createParticles(count) {
        const p = this.p;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: p.width / 2,
                y: p.height / 2,
                vx: p.random(-10, 10),
                vy: p.random(-15, -5),
                life: 255,
                size: p.random(6, 14),
                color: p.color(p.random(200,255), p.random(150,255), p.random(0,150))
            });
        }
    }

    async updateBalance() {
        try {
            const user = await api.getMe();
            this.balance = this.mode === 'demo' ?
                user.data.user.demo_balance : user.data.user.nugget_balance;
        } catch (e) {
            console.error('Balance update failed:', e);
        }
    }

    // Draw methods
    draw() {
        const p = this.p;
        p.background(5, 5, 15);

        this.drawBackground();
        this.drawJackpots();
        this.drawReelFrame();
        this.drawReels();
        this.drawParticles();

        if (this.bigWinActive) this.drawBigWin();
        if (this.freeSpins.active) this.drawFreeSpinsBanner();

        this.drawUI();
    }

    drawBackground() {
        const p = this.p;
        p.noStroke();
        for (let i = 0; i < 6; i++) {
            p.fill(10 + i*5, 10 + i*5, 25 + i*8, 80);
            p.circle(
                p.width/2 + p.sin(p.frameCount*0.008 + i)*150,
                p.height/2 + p.cos(p.frameCount*0.008 + i)*150,
                250 + i*60
            );
        }
    }

    drawJackpots() {
        const p = this.p;
        const j = this.jackpotManager.getAll();
        const x = p.width - 280;
        let y = 30;

        p.textSize(14);
        p.textAlign(p.LEFT);
        p.textFont('monospace');

        const colors = {
            grand: [255,215,0],
            major: [255,100,100],
            minor: [100,200,255],
            mini: [150,255,150]
        };

        Object.entries(j).forEach(([tier, amt]) => {
            p.fill(...colors[tier]);
            p.text(`${tier.toUpperCase()}: $${amt.toFixed(2)}`, x, y);
            y += 22;
        });
    }

    drawReelFrame() {
        const p = this.p;
        p.fill(15, 15, 30, 220);
        p.stroke(80, 80, 120);
        p.strokeWeight(5);
        p.rect(40, 140, CONFIG.REELS * CONFIG.REEL_WIDTH + 60, CONFIG.ROWS * CONFIG.SYMBOL_SIZE + 60, 25);
    }

    drawReels() {
        for (let i = 0; i < CONFIG.REELS; i++) {
            this.drawReel(i, 70 + i * CONFIG.REEL_WIDTH, 170);
        }
    }

    drawReel(idx, x, y) {
        const p = this.p;
        const reel = this.reels[idx];

        if (reel.spinning) {
            reel.offset += reel.speed;
            if (reel.offset >= CONFIG.SYMBOL_SIZE * reel.symbols.length) {
                reel.offset = 0;
            }
        } else {
            reel.offset += (reel.target - reel.offset) * 0.15;
        }

        p.fill(25, 25, 45);
        p.noStroke();
        p.rect(x, y, CONFIG.REEL_WIDTH - 10, CONFIG.ROWS * CONFIG.SYMBOL_SIZE, 12);

        p.push();
        p.clip(() => p.rect(x, y, CONFIG.REEL_WIDTH - 10, CONFIG.ROWS * CONFIG.SYMBOL_SIZE));

        for (let i = -1; i < CONFIG.ROWS + 2; i++) {
            const symIdx = Math.floor((reel.offset / CONFIG.SYMBOL_SIZE + i)) % reel.symbols.length;
            const sym = Object.values(SYMBOLS).find(s => s.id === reel.symbols[symIdx]);
            const symY = y + i * CONFIG.SYMBOL_SIZE - (reel.offset % CONFIG.SYMBOL_SIZE);

            if (sym) {
                // Special symbol glow
                if (sym.id === SYMBOLS.WILD.id || sym.id === SYMBOLS.SCATTER.id) {
                    p.fill(255, 215, 0, 120);
                    p.circle(x + CONFIG.REEL_WIDTH/2 - 5, symY + CONFIG.SYMBOL_SIZE/2, 85);
                }

                p.fill(255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(66);
                p.text(sym.icon, x + CONFIG.REEL_WIDTH/2 - 5, symY + CONFIG.SYMBOL_SIZE/2);
            }
        }

        p.pop();
    }

    drawParticles() {
        const p = this.p;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.vy += 0.4;
            part.life -= 6;

            p.fill(part.color);
            p.noStroke();
            p.circle(part.x, part.y, part.size);

            if (part.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawBigWin() {
        const p = this.p;
        const flash = 150 + Math.sin(p.frameCount * 0.15) * 105;
        p.fill(255, 215, 0, flash);
        p.rect(0, 0, p.width, p.height);

        p.textSize(100);
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255, 215, 0);
        p.text('BIG WIN!', p.width/2, p.height/2 - 50);

        p.textSize(70);
        p.fill(255);
        p.text(`$${this.winCounter.toFixed(2)}`, p.width/2, p.height/2 + 60);
    }

    drawFreeSpinsBanner() {
        const p = this.p;
        p.fill(138, 43, 226, 230);
        p.rect(0, 90, p.width, 70);

        p.textSize(36);
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255);
        p.text(
            `FREE SPINS: ${this.freeSpins.remaining} | ${this.freeSpins.multiplier}x | Won: $${this.freeSpins.totalWin.toFixed(2)}`,
            p.width/2, 125
        );
    }

    drawUI() {
        const p = this.p;
        p.fill(255);
        p.textSize(22);
        p.textAlign(p.LEFT);
        p.text(`Balance: $${this.balance.toFixed(2)}`, 40, 35);
        p.text(`Bet: $${(this.stake * this.betLevel).toFixed(2)}`, 40, 65);
        p.text(`Paylines: ${this.activePaylines}`, 40, 95);

        p.textSize(16);
        p.text(`Spins: ${this.stats.spins}`, 40, 120);

        if (this.autoplay.active) {
            p.fill(255, 215, 0);
            p.text(`AUTO: ${this.autoplay.remaining}`, p.width - 150, 35);
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Create UI elements
    const container = document.createElement('div');
    container.className = 'game-container';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    controls.innerHTML = `
        <div class="control-group">
            <label>Stake:</label>
            <input type="number" id="stake-input" value="10" min="1" max="1000">
        </div>
        <div class="control-group">
            <label>Bet Level:</label>
            <input type="number" id="bet-level-input" value="1" min="1" max="${CONFIG.MAX_BET_LEVEL}">
        </div>
        <button id="spin-btn" class="btn btn-primary btn-large">SPIN</button>
        <button id="autoplay-btn" class="btn btn-primary">AUTO (10)</button>
        <button id="stop-auto-btn" class="btn btn-secondary" style="display:none">STOP AUTO</button>
        <button id="back-btn" class="btn btn-secondary">Back to Lobby</button>
    `;

    document.body.appendChild(container);
    document.body.appendChild(controls);

    let game;

    // Initialize p5
    const sketch = (p) => {
        p.setup = async () => {
            p.createCanvas(1000, 700).parent(container);
            p.textFont('Arial');

            game = new SOTASlotsGame(p);

            // Update balance
            await game.updateBalance();
        };

        p.draw = () => {
            if (game) {
                game.draw();
            }
        };
    };

    new p5(sketch);

    // Event listeners
    document.getElementById('spin-btn').addEventListener('click', () => {
        if (game && !game.autoplay.active) {
            game.stake = parseFloat(document.getElementById('stake-input').value) || 10;
            game.betLevel = parseInt(document.getElementById('bet-level-input').value) || 1;
            game.spin();
        }
    });

    document.getElementById('autoplay-btn').addEventListener('click', () => {
        if (game && !game.autoplay.active) {
            game.stake = parseFloat(document.getElementById('stake-input').value) || 10;
            game.betLevel = parseInt(document.getElementById('bet-level-input').value) || 1;
            game.startAutoplay(10);

            document.getElementById('autoplay-btn').style.display = 'none';
            document.getElementById('stop-auto-btn').style.display = 'inline-block';
        }
    });

    document.getElementById('stop-auto-btn').addEventListener('click', () => {
        if (game) {
            game.stopAutoplay();
            document.getElementById('autoplay-btn').style.display = 'inline-block';
            document.getElementById('stop-auto-btn').style.display = 'none';
        }
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});
