/**
 * Roulette Game with p5.js
 * European roulette with animated wheel and bet table
 */

import p5 from 'p5';
import { api } from '../../common/api.js';
import { UIHelper } from '../../common/ui.js';

const NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

class RouletteGame {
    constructor(p, config) {
        this.p = p;
        this.config = config;
        this.wheelAngle = 0;
        this.ballAngle = 0;
        this.spinning = false;
        this.ballSpeed = 0;
        this.wheelSpeed = 0;
        this.stake = 10;
        this.balance = 0;
        this.mode = 'demo';
        this.currentBet = {
            type: 'straight',
            values: []
        };
        this.lastResult = null;
    }

    async placeBet(betType, betValues) {
        if (this.spinning) return;
        if (this.balance < this.stake) {
            UIHelper.showNotification('Insufficient balance!', 'error');
            return;
        }

        if (betValues.length === 0) {
            UIHelper.showNotification('Please select a bet!', 'error');
            return;
        }

        this.spinning = true;
        UIHelper.showLoading('Placing bet...');

        try {
            // Place bet
            const betResponse = await api.placeBet('roulette', this.stake, this.mode, {
                bet_type: betType,
                bet_values: betValues
            }, UIHelper.generateClientSeed());

            const betId = betResponse.data.bet_id;

            // Start spinning animation
            this.startSpin();

            // Resolve bet
            setTimeout(async () => {
                try {
                    const result = await api.resolveBet(betId);
                    this.lastResult = result.data;

                    // Stop wheel at winning number
                    this.stopSpin(result.data.outcome.winning_number);

                    // Update balance
                    await this.updateBalance();

                    // Show result
                    setTimeout(() => {
                        if (result.data.payout > 0) {
                            UIHelper.showNotification(
                                `You won ${UIHelper.formatCurrency(result.data.payout)}! Number: ${result.data.outcome.winning_number}`,
                                'success'
                            );
                        } else {
                            UIHelper.showNotification(
                                `House wins. Number: ${result.data.outcome.winning_number}`,
                                'info'
                            );
                        }
                    }, 4000);

                } catch (error) {
                    UIHelper.showNotification('Failed to resolve bet: ' + error.message, 'error');
                }

                UIHelper.hideLoading();
                setTimeout(() => {
                    this.spinning = false;
                }, 5000);
            }, 1000);

        } catch (error) {
            UIHelper.showNotification('Failed to place bet: ' + error.message, 'error');
            UIHelper.hideLoading();
            this.spinning = false;
        }
    }

    startSpin() {
        this.wheelSpeed = 0.1;
        this.ballSpeed = 0.3;
    }

    stopSpin(winningNumber) {
        const numberIndex = NUMBERS.indexOf(winningNumber);
        const targetAngle = (numberIndex / NUMBERS.length) * Math.PI * 2;

        // Gradually slow down to target
        const slowDown = () => {
            this.ballSpeed *= 0.95;
            this.wheelSpeed *= 0.98;

            if (this.ballSpeed > 0.01) {
                requestAnimationFrame(slowDown);
            } else {
                this.ballAngle = targetAngle;
                this.ballSpeed = 0;
                this.wheelSpeed = 0;
            }
        };

        slowDown();
    }

    async updateBalance() {
        try {
            const userData = await api.getMe();
            this.balance = this.mode === 'demo'
                ? userData.data.user.demo_balance
                : userData.data.user.nugget_balance;

            this.updateUI();
        } catch (error) {
            console.error('Failed to update balance:', error);
        }
    }

    draw() {
        const p = this.p;
        p.background(20, 40, 20);

        // Draw wheel
        this.drawWheel(p.width / 2, 300);

        // Draw bet table
        this.drawBetTable();

        // Draw UI
        this.drawUI();

        // Update wheel rotation
        if (this.spinning) {
            this.wheelAngle += this.wheelSpeed;
            this.ballAngle -= this.ballSpeed;
        }
    }

    drawWheel(centerX, centerY) {
        const p = this.p;
        const radius = 150;

        p.push();
        p.translate(centerX, centerY);
        p.rotate(this.wheelAngle);

        // Draw wheel segments
        for (let i = 0; i < NUMBERS.length; i++) {
            const angle = (i / NUMBERS.length) * p.TWO_PI;
            const nextAngle = ((i + 1) / NUMBERS.length) * p.TWO_PI;
            const number = NUMBERS[i];

            // Determine color
            if (number === 0) {
                p.fill(0, 150, 0);
            } else if (RED_NUMBERS.includes(number)) {
                p.fill(200, 0, 0);
            } else {
                p.fill(20, 20, 20);
            }

            p.arc(0, 0, radius * 2, radius * 2, angle, nextAngle, p.PIE);

            // Draw number
            p.push();
            p.rotate(angle + (nextAngle - angle) / 2);
            p.translate(radius * 0.7, 0);
            p.rotate(-this.wheelAngle);
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text(number, 0, 0);
            p.pop();
        }

        // Draw center
        p.fill(150, 150, 100);
        p.circle(0, 0, 40);

        p.pop();

        // Draw ball
        p.push();
        p.translate(centerX, centerY);
        p.rotate(this.ballAngle);
        p.translate(radius - 20, 0);
        p.fill(255, 255, 255);
        p.circle(0, 0, 15);
        p.pop();
    }

    drawBetTable() {
        const p = this.p;
        const tableX = 50;
        const tableY = 480;

        // Draw bet options
        p.fill(40, 80, 40);
        p.rect(tableX, tableY, 700, 100, 10);

        // Draw bet buttons
        const bets = [
            { type: 'red', label: 'RED', x: 60, color: [200, 0, 0] },
            { type: 'black', label: 'BLACK', x: 150, color: [20, 20, 20] },
            { type: 'even', label: 'EVEN', x: 260 },
            { type: 'odd', label: 'ODD', x: 350 },
            { type: 'dozen', label: '1-12', x: 440 },
            { type: 'dozen', label: '13-24', x: 530 },
            { type: 'dozen', label: '25-36', x: 620 }
        ];

        bets.forEach(bet => {
            if (bet.color) {
                p.fill(...bet.color);
            } else {
                p.fill(60, 100, 60);
            }

            p.rect(bet.x, tableY + 30, 80, 50, 5);

            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            p.text(bet.label, bet.x + 40, tableY + 55);
        });
    }

    drawUI() {
        const p = this.p;

        // Balance
        p.fill(255);
        p.textSize(20);
        p.textAlign(p.LEFT);
        p.text(`Balance: ${UIHelper.formatCurrency(this.balance)}`, 50, 30);

        // Stake
        p.text(`Stake: ${UIHelper.formatCurrency(this.stake)}`, 50, 60);

        // Last result
        if (this.lastResult) {
            const outcome = this.lastResult.outcome;
            p.text(`Last: ${outcome.winning_number} (${outcome.color})`, 400, 30);
            p.text(`Win: ${UIHelper.formatCurrency(this.lastResult.payout)}`, 400, 60);
        }
    }

    updateUI() {
        const balanceEl = document.getElementById('balance-display');
        if (balanceEl) {
            balanceEl.textContent = UIHelper.formatCurrency(this.balance);
        }
    }

    handleClick(x, y) {
        const p = this.p;
        const tableY = 480;

        // Check bet button clicks
        const bets = [
            { type: 'red', values: RED_NUMBERS, x: 60, y: tableY + 30, w: 80, h: 50 },
            { type: 'black', values: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35], x: 150, y: tableY + 30, w: 80, h: 50 },
            { type: 'even', values: Array.from({length: 18}, (_, i) => (i + 1) * 2), x: 260, y: tableY + 30, w: 80, h: 50 },
            { type: 'odd', values: Array.from({length: 18}, (_, i) => i * 2 + 1).filter(n => n <= 36), x: 350, y: tableY + 30, w: 80, h: 50 }
        ];

        for (const bet of bets) {
            if (x >= bet.x && x <= bet.x + bet.w && y >= bet.y && y <= bet.y + bet.h) {
                this.currentBet = { type: bet.type, values: bet.values };
                this.placeBet(bet.type, bet.values);
                return;
            }
        }
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.createElement('div');
    container.className = 'game-container';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    controls.innerHTML = `
        <div class="control-group">
            <label>Stake:</label>
            <input type="number" id="stake-input" value="10" min="1" max="1000">
        </div>
        <button id="back-btn" class="btn btn-secondary">Back to Lobby</button>
        <p style="margin: 0; color: #aaa;">Click on a bet option on the table to place your bet</p>
    `;

    document.body.appendChild(container);
    document.body.appendChild(controls);

    let game;

    const sketch = (p) => {
        p.setup = async () => {
            p.createCanvas(800, 650).parent(container);

            const config = await api.getGameConfig();
            game = new RouletteGame(p, config.data.games.roulette);

            await game.updateBalance();
        };

        p.draw = () => {
            if (game) {
                game.draw();
            }
        };

        p.mousePressed = () => {
            if (game) {
                game.handleClick(p.mouseX, p.mouseY);
            }
        };
    };

    new p5(sketch);

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });

    document.getElementById('stake-input').addEventListener('input', (e) => {
        if (game) {
            game.stake = parseFloat(e.target.value) || 10;
        }
    });
});
