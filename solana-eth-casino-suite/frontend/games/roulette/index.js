/**
 * SOTA Roulette - Professional Casino Standard
 * European Roulette with Advanced Features
 */

import p5 from 'p5';
import { api } from '../../common/api.js';
import { UIHelper } from '../../common/ui.js';

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

class RouletteStats {
    constructor() {
        this.history = [];
        this.hot = new Map();
        this.maxHistory = 500;
    }

    addResult(number) {
        this.history.unshift(number);
        if (this.history.length > this.maxHistory) this.history.pop();
        this.hot.set(number, (this.hot.get(number) || 0) + 1);
    }

    getHotNumbers(count = 5) {
        return Array.from(this.hot.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([num]) => num);
    }

    getRecentHistory(count = 20) {
        return this.history.slice(0, count);
    }

    getStats() {
        const total = this.history.length;
        if (total === 0) return null;

        const reds = this.history.filter(n => RED.includes(n)).length;
        const blacks = this.history.filter(n => BLACK.includes(n)).length;
        const evens = this.history.filter(n => n > 0 && n % 2 === 0).length;
        const odds = this.history.filter(n => n > 0 && n % 2 === 1).length;

        return {
            total,
            red: ((reds / total) * 100).toFixed(1),
            black: ((blacks / total) * 100).toFixed(1),
            even: ((evens / total) * 100).toFixed(1),
            odd: ((odds / total) * 100).toFixed(1)
        };
    }
}

class ChipManager {
    constructor() {
        this.denominations = [1, 5, 10, 25, 50, 100, 500];
        this.selected = 10;
        this.bets = new Map();
    }

    selectChip(value) {
        this.selected = value;
    }

    placeBet(betKey, amount) {
        const current = this.bets.get(betKey) || 0;
        this.bets.set(betKey, current + amount);
    }

    clearBets() {
        this.bets.clear();
    }

    getTotalBet() {
        return Array.from(this.bets.values()).reduce((sum, val) => sum + val, 0);
    }

    getBets() {
        return new Map(this.bets);
    }
}

class SOTARouletteGame {
    constructor(p) {
        this.p = p;
        this.wheelAngle = 0;
        this.ballAngle = 0;
        this.spinning = false;
        this.ballSpeed = 0;
        this.wheelSpeed = 0;
        this.winningNumber = null;
        this.balance = 0;
        this.mode = 'demo';
        this.chipManager = new ChipManager();
        this.stats = new RouletteStats();
        this.particles = [];
        this.showStats = false;
        this.soundEnabled = true;
    }

    async placeBet() {
        if (this.spinning) return;

        const totalBet = this.chipManager.getTotalBet();
        if (totalBet === 0) {
            UIHelper.showNotification('Place your bets first!', 'error');
            return;
        }

        if (this.balance < totalBet) {
            UIHelper.showNotification('Insufficient balance!', 'error');
            return;
        }

        this.spinning = true;
        UIHelper.showLoading('Spinning...');

        try {
            const bets = this.convertBetsToAPI();
            const result = await api.placeBet('roulette', totalBet, this.mode, {
                bets: Array.from(bets.entries())
            }, UIHelper.generateClientSeed());

            this.startSpin();

            setTimeout(async () => {
                const resolved = await api.resolveBet(result.data.bet_id);
                await this.processResult(resolved.data);

                UIHelper.hideLoading();
                this.spinning = false;

                setTimeout(() => this.chipManager.clearBets(), 3000);
            }, 2000);

        } catch (error) {
            UIHelper.showNotification('Bet failed: ' + error.message, 'error');
            UIHelper.hideLoading();
            this.spinning = false;
        }
    }

    convertBetsToAPI() {
        const apiBets = new Map();
        this.chipManager.getBets().forEach((amount, key) => {
            apiBets.set(key, { amount, numbers: this.getBetNumbers(key) });
        });
        return apiBets;
    }

    getBetNumbers(betKey) {
        const parts = betKey.split('_');
        const type = parts[0];

        switch(type) {
            case 'red': return RED;
            case 'black': return BLACK;
            case 'even': return Array.from({length: 18}, (_, i) => (i + 1) * 2);
            case 'odd': return Array.from({length: 18}, (_, i) => i * 2 + 1).filter(n => n <= 36);
            case 'low': return Array.from({length: 18}, (_, i) => i + 1);
            case 'high': return Array.from({length: 18}, (_, i) => i + 19);
            default: return [];
        }
    }

    async processResult(result) {
        const winningNum = result.outcome.winning_number;
        this.winningNumber = winningNum;

        this.stopSpin(winningNum);
        this.stats.addResult(winningNum);

        await this.updateBalance();

        if (result.payout > 0) {
            this.createWinParticles();
            UIHelper.showNotification(
                `Number ${winningNum} ${this.getColor(winningNum)}! Won: ${UIHelper.formatCurrency(result.payout)}`,
                'success'
            );
        } else {
            UIHelper.showNotification(`Number ${winningNum} ${this.getColor(winningNum)}`, 'info');
        }
    }

    startSpin() {
        this.wheelSpeed = 0.08;
        this.ballSpeed = 0.25;
        this.playSound('spin');
    }

    stopSpin(number) {
        const index = WHEEL_ORDER.indexOf(number);
        const targetAngle = (index / WHEEL_ORDER.length) * Math.PI * 2;

        const slowDown = () => {
            this.ballSpeed *= 0.96;
            this.wheelSpeed *= 0.98;

            if (this.ballSpeed > 0.005) {
                requestAnimationFrame(slowDown);
            } else {
                this.ballAngle = targetAngle;
                this.ballSpeed = 0;
                this.wheelSpeed = 0;
                this.playSound('stop');
            }
        };

        slowDown();
    }

    quickBet(type) {
        const chip = this.chipManager.selected;
        this.chipManager.placeBet(type, chip);
    }

    getColor(number) {
        if (number === 0) return 'Green';
        return RED.includes(number) ? 'Red' : 'Black';
    }

    createWinParticles() {
        const p = this.p;
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: p.width / 2,
                y: 300,
                vx: p.random(-8, 8),
                vy: p.random(-12, -4),
                life: 255,
                size: p.random(6, 12),
                color: p.color(p.random(200,255), p.random(150,255), 0)
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

    playSound(sound) {
        if (this.soundEnabled) console.log(`🔊 ${sound}`);
    }

    draw() {
        const p = this.p;
        p.background(10, 35, 10);

        this.drawWheel(p.width / 2, 300);
        this.drawBetTable();
        if (this.showStats) this.drawStatistics();
        this.drawParticles();
        this.drawUI();

        if (this.spinning) {
            this.wheelAngle += this.wheelSpeed;
            this.ballAngle -= this.ballSpeed;
        }
    }

    drawWheel(cx, cy) {
        const p = this.p;
        const radius = 140;

        p.push();
        p.translate(cx, cy);
        p.rotate(this.wheelAngle);

        WHEEL_ORDER.forEach((num, i) => {
            const angle = (i / WHEEL_ORDER.length) * p.TWO_PI;
            const nextAngle = ((i + 1) / WHEEL_ORDER.length) * p.TWO_PI;

            if (num === 0) p.fill(0, 150, 0);
            else if (RED.includes(num)) p.fill(200, 0, 0);
            else p.fill(20, 20, 20);

            p.arc(0, 0, radius * 2, radius * 2, angle, nextAngle, p.PIE);

            p.push();
            p.rotate(angle + (nextAngle - angle) / 2);
            p.translate(radius * 0.75, 0);
            p.rotate(-this.wheelAngle);
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text(num, 0, 0);
            p.pop();
        });

        p.fill(150, 150, 100);
        p.circle(0, 0, 50);
        p.pop();

        p.push();
        p.translate(cx, cy);
        p.rotate(this.ballAngle);
        p.translate(radius - 25, 0);
        p.fill(255);
        p.circle(0, 0, 18);
        p.pop();
    }

    drawBetTable() {
        const p = this.p;
        const tx = 50, ty = 520;

        p.fill(30, 70, 30, 220);
        p.stroke(100, 150, 100);
        p.strokeWeight(3);
        p.rect(tx, ty, 900, 160, 12);

        const bets = [
            { label: 'RED', x: 70, color: [200, 0, 0] },
            { label: 'BLACK', x: 170, color: [20, 20, 20] },
            { label: 'EVEN', x: 290 },
            { label: 'ODD', x: 390 },
            { label: '1-18', x: 500 },
            { label: '19-36', x: 620 }
        ];

        bets.forEach(bet => {
            p.fill(bet.color || [50, 100, 50]);
            p.rect(bet.x, ty + 30, 90, 55, 8);

            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            p.text(bet.label, bet.x + 45, ty + 57);
        });

        const total = this.chipManager.getTotalBet();
        if (total > 0) {
            p.fill(255, 215, 0);
            p.textSize(18);
            p.text(`Total Bet: ${UIHelper.formatCurrency(total)}`, tx + 450, ty + 120);
        }
    }

    drawStatistics() {
        const p = this.p;
        p.fill(20, 20, 50, 240);
        p.rect(p.width - 320, 50, 270, 400, 12);

        p.fill(255);
        p.textSize(18);
        p.textAlign(p.LEFT);
        p.text('Statistics', p.width - 305, 75);

        p.textSize(14);
        p.text('Hot Numbers:', p.width - 305, 105);

        const hot = this.stats.getHotNumbers(5);
        hot.forEach((num, i) => {
            const color = num === 0 ? [0,150,0] : RED.includes(num) ? [200,0,0] : [20,20,20];
            p.fill(...color);
            p.circle(p.width - 290 + i * 40, 130, 30);
            p.fill(255);
            p.textAlign(p.CENTER);
            p.textSize(14);
            p.text(num, p.width - 290 + i * 40, 135);
        });

        p.textAlign(p.LEFT);
        p.text('Last 20 Spins:', p.width - 305, 170);

        const recent = this.stats.getRecentHistory(20);
        recent.forEach((num, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const color = num === 0 ? [0,150,0] : RED.includes(num) ? [200,0,0] : [20,20,20];

            p.fill(...color);
            p.circle(p.width - 290 + col * 25, 195 + row * 30, 22);
            p.fill(255);
            p.textAlign(p.CENTER);
            p.textSize(11);
            p.text(num, p.width - 290 + col * 25, 200 + row * 30);
        });

        const stats = this.stats.getStats();
        if (stats) {
            p.textAlign(p.LEFT);
            p.textSize(13);
            p.fill(255);
            p.text(`Red: ${stats.red}%`, p.width - 305, 280);
            p.text(`Black: ${stats.black}%`, p.width - 305, 300);
            p.text(`Even: ${stats.even}%`, p.width - 305, 320);
            p.text(`Odd: ${stats.odd}%`, p.width - 305, 340);
        }
    }

    drawParticles() {
        const p = this.p;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.vy += 0.3;
            part.life -= 6;

            p.fill(part.color);
            p.noStroke();
            p.circle(part.x, part.y, part.size);

            if (part.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawUI() {
        const p = this.p;
        p.fill(255);
        p.textSize(22);
        p.textAlign(p.LEFT);
        p.text(`Balance: ${UIHelper.formatCurrency(this.balance)}`, 50, 35);

        if (this.winningNumber !== null) {
            p.textSize(28);
            p.fill(255, 215, 0);
            p.text(`Last: ${this.winningNumber}`, p.width - 200, 35);
        }

        p.textSize(14);
        p.fill(200);
        p.text('Chip:', p.width - 200, 490);

        this.chipManager.denominations.forEach((val, i) => {
            const selected = val === this.chipManager.selected;
            p.fill(selected ? [255,215,0] : [100,100,100]);
            p.circle(p.width - 160 + i * 25, 495, 20);

            p.fill(0);
            p.textAlign(p.CENTER);
            p.textSize(9);
            p.text(val, p.width - 160 + i * 25, 498);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.createElement('div');
    container.className = 'game-container';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    controls.innerHTML = `
        <button id="red-btn" class="btn btn-secondary">RED</button>
        <button id="black-btn" class="btn btn-secondary">BLACK</button>
        <button id="even-btn" class="btn btn-secondary">EVEN</button>
        <button id="odd-btn" class="btn btn-secondary">ODD</button>
        <button id="low-btn" class="btn btn-secondary">1-18</button>
        <button id="high-btn" class="btn btn-secondary">19-36</button>
        <button id="spin-roulette-btn" class="btn btn-primary btn-large">SPIN</button>
        <button id="clear-bets-btn" class="btn btn-secondary">Clear Bets</button>
        <button id="stats-btn" class="btn btn-secondary">Toggle Stats</button>
        <button id="back-btn" class="btn btn-secondary">Back to Lobby</button>
    `;

    document.body.appendChild(container);
    document.body.appendChild(controls);

    let game;

    const sketch = (p) => {
        p.setup = async () => {
            p.createCanvas(1000, 700).parent(container);
            game = new SOTARouletteGame(p);
            await game.updateBalance();
        };

        p.draw = () => {
            if (game) game.draw();
        };
    };

    new p5(sketch);

    document.getElementById('red-btn').addEventListener('click', () => {
        if (game) game.quickBet('red');
    });

    document.getElementById('black-btn').addEventListener('click', () => {
        if (game) game.quickBet('black');
    });

    document.getElementById('even-btn').addEventListener('click', () => {
        if (game) game.quickBet('even');
    });

    document.getElementById('odd-btn').addEventListener('click', () => {
        if (game) game.quickBet('odd');
    });

    document.getElementById('low-btn').addEventListener('click', () => {
        if (game) game.quickBet('low');
    });

    document.getElementById('high-btn').addEventListener('click', () => {
        if (game) game.quickBet('high');
    });

    document.getElementById('spin-roulette-btn').addEventListener('click', () => {
        if (game) game.placeBet();
    });

    document.getElementById('clear-bets-btn').addEventListener('click', () => {
        if (game) game.chipManager.clearBets();
    });

    document.getElementById('stats-btn').addEventListener('click', () => {
        if (game) game.showStats = !game.showStats;
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});
