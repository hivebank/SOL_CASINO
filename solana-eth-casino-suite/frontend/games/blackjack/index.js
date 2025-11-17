/**
 * Blackjack Game with p5.js
 * Classic 21 with dealer AI and card animations
 */

import p5 from 'p5';
import { api } from '../../common/api.js';
import { UIHelper } from '../../common/ui.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class BlackjackGame {
    constructor(p, config) {
        this.p = p;
        this.config = config;
        this.playerCards = [];
        this.dealerCards = [];
        this.playerTotal = 0;
        this.dealerTotal = 0;
        this.gameState = 'betting'; // betting, playing, dealer, finished
        this.stake = 10;
        this.balance = 0;
        this.mode = 'demo';
        this.currentBetId = null;
        this.result = null;
    }

    async startGame() {
        if (this.gameState !== 'betting') return;
        if (this.balance < this.stake) {
            UIHelper.showNotification('Insufficient balance!', 'error');
            return;
        }

        UIHelper.showLoading('Dealing cards...');

        try {
            const betResponse = await api.placeBet('blackjack', this.stake, this.mode, {}, UIHelper.generateClientSeed());
            this.currentBetId = betResponse.data.bet_id;

            // Simulate dealing
            this.gameState = 'playing';
            this.playerCards = [];
            this.dealerCards = [];
            this.result = null;

            // Show cards being dealt
            setTimeout(() => {
                this.dealCard('player');
            }, 200);

            setTimeout(() => {
                this.dealCard('dealer');
            }, 400);

            setTimeout(() => {
                this.dealCard('player');
            }, 600);

            setTimeout(() => {
                this.dealCard('dealer', true); // Hidden card
            }, 800);

            UIHelper.hideLoading();

        } catch (error) {
            UIHelper.showNotification('Failed to start game: ' + error.message, 'error');
            UIHelper.hideLoading();
            this.gameState = 'betting';
        }
    }

    dealCard(target, hidden = false) {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];

        const card = { suit, rank, hidden };

        if (target === 'player') {
            this.playerCards.push(card);
            this.playerTotal = this.calculateTotal(this.playerCards);
        } else {
            this.dealerCards.push(card);
            if (!hidden) {
                this.dealerTotal = this.calculateTotal(this.dealerCards.filter(c => !c.hidden));
            }
        }
    }

    calculateTotal(cards) {
        let total = 0;
        let aces = 0;

        cards.filter(c => !c.hidden).forEach(card => {
            if (card.rank === 'A') {
                aces++;
                total += 11;
            } else if (['J', 'Q', 'K'].includes(card.rank)) {
                total += 10;
            } else {
                total += parseInt(card.rank);
            }
        });

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    async hit() {
        if (this.gameState !== 'playing') return;

        this.dealCard('player');

        if (this.playerTotal > 21) {
            await this.stand();
        }
    }

    async stand() {
        if (this.gameState !== 'playing') return;

        this.gameState = 'dealer';
        UIHelper.showLoading('Dealer playing...');

        // Resolve the bet
        try {
            const result = await api.resolveBet(this.currentBetId);
            this.result = result.data;

            // Update cards based on result
            this.playerCards = result.data.outcome.player_cards.map(rank => ({
                rank: this.rankFromValue(rank),
                suit: SUITS[Math.floor(Math.random() * SUITS.length)],
                hidden: false
            }));

            this.dealerCards = result.data.outcome.dealer_cards.map((rank, idx) => ({
                rank: this.rankFromValue(rank),
                suit: SUITS[Math.floor(Math.random() * SUITS.length)],
                hidden: false
            }));

            this.playerTotal = result.data.outcome.player_total;
            this.dealerTotal = result.data.outcome.dealer_total;

            await this.updateBalance();

            this.gameState = 'finished';

            UIHelper.hideLoading();

            setTimeout(() => {
                const resultText = result.data.outcome.result;
                if (resultText === 'win') {
                    UIHelper.showNotification(`You won ${UIHelper.formatCurrency(result.data.payout)}!`, 'success');
                } else if (resultText === 'push') {
                    UIHelper.showNotification('Push! Your stake is returned.', 'info');
                } else {
                    UIHelper.showNotification('Dealer wins!', 'error');
                }
            }, 1000);

        } catch (error) {
            UIHelper.showNotification('Failed to resolve game: ' + error.message, 'error');
            this.gameState = 'betting';
        }

        UIHelper.hideLoading();
    }

    rankFromValue(value) {
        if (value === 1) return 'A';
        if (value >= 10 && value <= 13) return ['10', 'J', 'Q', 'K'][value - 10];
        return value.toString();
    }

    newGame() {
        this.gameState = 'betting';
        this.playerCards = [];
        this.dealerCards = [];
        this.result = null;
    }

    async updateBalance() {
        try {
            const userData = await api.getMe();
            this.balance = this.mode === 'demo'
                ? userData.data.user.demo_balance
                : userData.data.user.nugget_balance;
        } catch (error) {
            console.error('Failed to update balance:', error);
        }
    }

    draw() {
        const p = this.p;
        p.background(20, 50, 20);

        // Draw table
        p.fill(40, 80, 40);
        p.rect(50, 100, 700, 400, 20);

        // Draw dealer cards
        this.drawHand(this.dealerCards, 400, 150, 'Dealer');

        // Draw player cards
        this.drawHand(this.playerCards, 400, 350, 'Player');

        // Draw UI
        this.drawUI();
    }

    drawHand(cards, centerX, y, label) {
        const p = this.p;

        // Draw label
        p.fill(255);
        p.textSize(20);
        p.textAlign(p.CENTER);
        p.text(label, centerX, y - 30);

        // Draw cards
        const cardWidth = 60;
        const cardHeight = 90;
        const spacing = 70;
        const startX = centerX - (cards.length * spacing) / 2;

        cards.forEach((card, index) => {
            const x = startX + index * spacing;

            // Card background
            if (card.hidden) {
                p.fill(100, 100, 150);
            } else {
                p.fill(255);
            }
            p.rect(x, y, cardWidth, cardHeight, 5);

            if (!card.hidden) {
                // Card suit and rank
                const isRed = ['♥', '♦'].includes(card.suit);
                p.fill(isRed ? [200, 0, 0] : [0, 0, 0]);
                p.textSize(24);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(card.rank, x + cardWidth / 2, y + cardHeight / 2 - 15);
                p.textSize(20);
                p.text(card.suit, x + cardWidth / 2, y + cardHeight / 2 + 15);
            } else {
                p.fill(255);
                p.textSize(40);
                p.textAlign(p.CENTER, p.CENTER);
                p.text('?', x + cardWidth / 2, y + cardHeight / 2);
            }
        });

        // Draw total
        if (cards.length > 0) {
            const total = label === 'Player' ? this.playerTotal : this.dealerTotal;
            p.fill(255);
            p.textSize(18);
            p.text(`Total: ${total}`, centerX, y + 110);
        }
    }

    drawUI() {
        const p = this.p;

        // Balance
        p.fill(255);
        p.textSize(20);
        p.textAlign(p.LEFT);
        p.text(`Balance: ${UIHelper.formatCurrency(this.balance)}`, 50, 50);
        p.text(`Stake: ${UIHelper.formatCurrency(this.stake)}`, 50, 80);

        // Game state
        p.textAlign(p.RIGHT);
        p.text(`State: ${this.gameState}`, 750, 50);
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
        <button id="deal-btn" class="btn btn-primary">Deal</button>
        <button id="hit-btn" class="btn btn-primary" disabled>Hit</button>
        <button id="stand-btn" class="btn btn-primary" disabled>Stand</button>
        <button id="new-game-btn" class="btn btn-secondary" style="display: none;">New Game</button>
        <button id="back-btn" class="btn btn-secondary">Back to Lobby</button>
    `;

    document.body.appendChild(container);
    document.body.appendChild(controls);

    let game;

    const sketch = (p) => {
        p.setup = async () => {
            p.createCanvas(800, 600).parent(container);

            const config = await api.getGameConfig();
            game = new BlackjackGame(p, config.data.games.blackjack);

            await game.updateBalance();
        };

        p.draw = () => {
            if (game) {
                game.draw();

                // Update button states
                const hitBtn = document.getElementById('hit-btn');
                const standBtn = document.getElementById('stand-btn');
                const dealBtn = document.getElementById('deal-btn');
                const newGameBtn = document.getElementById('new-game-btn');

                if (game.gameState === 'betting') {
                    dealBtn.disabled = false;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    newGameBtn.style.display = 'none';
                } else if (game.gameState === 'playing') {
                    dealBtn.disabled = true;
                    hitBtn.disabled = false;
                    standBtn.disabled = false;
                    newGameBtn.style.display = 'none';
                } else if (game.gameState === 'finished') {
                    dealBtn.disabled = true;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    newGameBtn.style.display = 'inline-block';
                } else {
                    dealBtn.disabled = true;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    newGameBtn.style.display = 'none';
                }
            }
        };
    };

    new p5(sketch);

    document.getElementById('deal-btn').addEventListener('click', () => {
        if (game) {
            game.stake = parseFloat(document.getElementById('stake-input').value) || 10;
            game.startGame();
        }
    });

    document.getElementById('hit-btn').addEventListener('click', () => {
        if (game) game.hit();
    });

    document.getElementById('stand-btn').addEventListener('click', () => {
        if (game) game.stand();
    });

    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (game) game.newGame();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});
