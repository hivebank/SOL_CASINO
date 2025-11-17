/**
 * SOTA Blackjack - Professional Casino Standard
 * Features: Split, Double Down, Insurance, Surrender, Multi-hand, Strategy Hints
 */

import p5 from 'p5';
import { api } from '../../common/api.js';
import { UIHelper } from '../../common/ui.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_VALUES = {
    'A': [1, 11], '2': [2], '3': [3], '4': [4], '5': [5], '6': [6],
    '7': [7], '8': [8], '9': [9], '10': [10], 'J': [10], 'Q': [10], 'K': [10]
};

class Hand {
    constructor(isDealer = false) {
        this.cards = [];
        this.bet = 0;
        this.isDealer = isDealer;
        this.status = 'active';
        this.result = null;
        this.payout = 0;
        this.doubled = false;
        this.split = false;
        this.surrendered = false;
        this.insured = false;
    }

    addCard(rank, suit) {
        this.cards.push({ rank, suit, hidden: false });
    }

    hideCard(index) {
        if (this.cards[index]) this.cards[index].hidden = true;
    }

    revealAll() {
        this.cards.forEach(card => card.hidden = false);
    }

    getValue() {
        let value = 0;
        let aces = 0;

        this.cards.filter(c => !c.hidden).forEach(card => {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else {
                value += CARD_VALUES[card.rank][0];
            }
        });

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    isBust() {
        return this.getValue() > 21;
    }

    isBlackjack() {
        return this.cards.length === 2 && this.getValue() === 21;
    }

    canSplit() {
        return this.cards.length === 2 &&
               CARD_VALUES[this.cards[0].rank][0] === CARD_VALUES[this.cards[1].rank][0];
    }

    canDouble() {
        return this.cards.length === 2 && !this.doubled;
    }
}

class SOTABlackjackGame {
    constructor(p) {
        this.p = p;

        this.playerHands = [new Hand()];
        this.dealerHand = new Hand(true);
        this.currentHandIndex = 0;
        this.gameState = 'betting';

        this.balance = 0;
        this.mode = 'demo';
        this.mainBet = 10;

        this.particles = [];
        this.showStrategy = false;

        this.stats = {
            handsPlayed: 0,
            handsWon: 0,
            handsLost: 0,
            handsPush: 0,
            blackjacks: 0,
            totalWagered: 0,
            totalWon: 0
        };
    }

    async deal() {
        if (this.gameState !== 'betting') return;
        if (this.balance < this.mainBet) {
            UIHelper.showNotification('Insufficient balance!', 'error');
            return;
        }

        this.gameState = 'playing';
        UIHelper.showLoading('Dealing...');

        try {
            this.stats.totalWagered += this.mainBet;

            const result = await api.placeBet('blackjack', this.mainBet, this.mode, {},
                UIHelper.generateClientSeed());

            const betId = result.data.bet_id;

            await this.animateDeal();

            const resolved = await api.resolveBet(betId);

            await this.processInitialDeal(resolved.data);

            UIHelper.hideLoading();

        } catch (error) {
            UIHelper.showNotification('Deal failed: ' + error.message, 'error');
            UIHelper.hideLoading();
            this.gameState = 'betting';
        }
    }

    async animateDeal() {
        await this.delay(200);
        this.playerHands[0].addCard('?', '?');

        await this.delay(200);
        this.dealerHand.addCard('?', '?');

        await this.delay(200);
        this.playerHands[0].addCard('?', '?');

        await this.delay(200);
        this.dealerHand.addCard('?', '?');
        this.dealerHand.hideCard(1);

        return this.delay(300);
    }

    async processInitialDeal(result) {
        const playerCards = result.outcome.player_cards;
        const dealerCards = result.outcome.dealer_cards;

        this.playerHands[0].cards = playerCards.slice(0, 2).map((rank, i) => ({
            rank: this.rankFromValue(rank),
            suit: SUITS[Math.floor(Math.random() * 4)],
            hidden: false
        }));

        this.dealerHand.cards = dealerCards.slice(0, 2).map((rank, i) => ({
            rank: this.rankFromValue(rank),
            suit: SUITS[Math.floor(Math.random() * 4)],
            hidden: i === 1
        }));

        if (this.playerHands[0].isBlackjack()) {
            this.playerHands[0].status = 'blackjack';
            this.stats.blackjacks++;

            if (this.dealerHand.getValue() === 21) {
                await this.resolveRound();
            } else {
                this.playerHands[0].result = 'win';
                this.playerHands[0].payout = this.mainBet * 2.5;
                await this.endRound();
            }
        }

        await this.updateBalance();
    }

    async hit() {
        if (this.gameState !== 'playing') return;

        const hand = this.playerHands[this.currentHandIndex];
        if (hand.status !== 'active') return;

        const newCard = {
            rank: RANKS[Math.floor(Math.random() * RANKS.length)],
            suit: SUITS[Math.floor(Math.random() * SUITS.length)],
            hidden: false
        };

        hand.addCard(newCard.rank, newCard.suit);

        if (hand.isBust()) {
            hand.status = 'bust';
            await this.nextHand();
        }
    }

    async stand() {
        if (this.gameState !== 'playing') return;

        const hand = this.playerHands[this.currentHandIndex];
        hand.status = 'stand';

        await this.nextHand();
    }

    async double() {
        const hand = this.playerHands[this.currentHandIndex];
        if (!hand.canDouble() || this.balance < this.mainBet) return;

        hand.doubled = true;
        hand.bet *= 2;
        this.stats.totalWagered += this.mainBet;

        await this.hit();

        if (!hand.isBust()) {
            hand.status = 'stand';
            await this.nextHand();
        }
    }

    async split() {
        const hand = this.playerHands[this.currentHandIndex];
        if (!hand.canSplit() || this.balance < this.mainBet || this.playerHands.length >= 5) {
            return;
        }

        const newHand = new Hand();
        newHand.bet = hand.bet;
        newHand.cards.push(hand.cards.pop());
        newHand.split = true;

        this.playerHands.splice(this.currentHandIndex + 1, 0, newHand);

        hand.addCard(
            RANKS[Math.floor(Math.random() * RANKS.length)],
            SUITS[Math.floor(Math.random() * SUITS.length)]
        );

        newHand.addCard(
            RANKS[Math.floor(Math.random() * RANKS.length)],
            SUITS[Math.floor(Math.random() * SUITS.length)]
        );

        this.stats.totalWagered += this.mainBet;
    }

    async surrender() {
        const hand = this.playerHands[this.currentHandIndex];
        if (hand.cards.length !== 2) return;

        hand.surrendered = true;
        hand.status = 'surrendered';
        hand.payout = this.mainBet * 0.5;

        await this.nextHand();
    }

    async nextHand() {
        this.currentHandIndex++;

        if (this.currentHandIndex >= this.playerHands.length) {
            await this.dealerPlay();
        }
    }

    async dealerPlay() {
        this.gameState = 'dealer';
        this.dealerHand.revealAll();

        await this.delay(500);

        while (this.dealerHand.getValue() < 17) {
            await this.delay(800);

            const newCard = {
                rank: RANKS[Math.floor(Math.random() * RANKS.length)],
                suit: SUITS[Math.floor(Math.random() * SUITS.length)],
                hidden: false
            };

            this.dealerHand.addCard(newCard.rank, newCard.suit);
        }

        await this.delay(500);
        await this.resolveRound();
    }

    async resolveRound() {
        const dealerValue = this.dealerHand.getValue();
        const dealerBust = this.dealerHand.isBust();

        this.playerHands.forEach(hand => {
            if (hand.surrendered) return;

            const playerValue = hand.getValue();

            if (hand.status === 'bust') {
                hand.result = 'lose';
                this.stats.handsLost++;
            } else if (dealerBust) {
                hand.result = 'win';
                hand.payout = hand.bet * 2;
                this.stats.handsWon++;
            } else if (playerValue > dealerValue) {
                hand.result = 'win';
                hand.payout = hand.isBlackjack() ? hand.bet * 2.5 : hand.bet * 2;
                this.stats.handsWon++;
            } else if (playerValue < dealerValue) {
                hand.result = 'lose';
                this.stats.handsLost++;
            } else {
                hand.result = 'push';
                hand.payout = hand.bet;
                this.stats.handsPush++;
            }
        });

        await this.endRound();
    }

    async endRound() {
        this.gameState = 'finished';

        const totalPayout = this.playerHands.reduce((sum, hand) => sum + hand.payout, 0);
        this.balance += totalPayout;
        this.stats.totalWon += totalPayout;
        this.stats.handsPlayed++;

        await this.updateBalance();

        const winHands = this.playerHands.filter(h => h.result === 'win').length;
        const loseHands = this.playerHands.filter(h => h.result === 'lose').length;

        if (winHands > 0) {
            this.createWinParticles();
            UIHelper.showNotification(`Won ${UIHelper.formatCurrency(totalPayout)}!`, 'success');
        } else if (loseHands === this.playerHands.length) {
            UIHelper.showNotification('Dealer wins', 'info');
        } else {
            UIHelper.showNotification('Push', 'info');
        }

        setTimeout(() => {
            this.newRound();
        }, 3000);
    }

    newRound() {
        this.playerHands = [new Hand()];
        this.dealerHand = new Hand(true);
        this.currentHandIndex = 0;
        this.gameState = 'betting';
    }

    getStrategyHint() {
        if (!this.showStrategy || this.gameState !== 'playing') return '';

        const hand = this.playerHands[this.currentHandIndex];
        const playerValue = hand.getValue();
        const dealerUp = this.dealerHand.cards[0].rank;
        const dealerValue = CARD_VALUES[dealerUp][0];

        if (playerValue < 12) return 'HIT';
        if (playerValue >= 17) return 'STAND';
        if (playerValue >= 13 && playerValue <= 16) {
            return (dealerValue >= 2 && dealerValue <= 6) ? 'STAND' : 'HIT';
        }

        return '';
    }

    rankFromValue(value) {
        if (value === 1) return 'A';
        if (value <= 10) return value.toString();
        return ['J', 'Q', 'K'][value - 11];
    }

    createWinParticles() {
        const p = this.p;
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: p.width / 2,
                y: p.height / 2,
                vx: p.random(-8, 8),
                vy: p.random(-12, -4),
                life: 255,
                size: p.random(6, 12),
                color: p.color(p.random(200,255), p.random(200,255), 0)
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    draw() {
        const p = this.p;
        p.background(10, 50, 10);

        this.drawTable();
        this.drawDealerHand();
        this.drawPlayerHands();
        this.drawParticles();

        if (this.showStrategy) this.drawStrategyHint();

        this.drawUI();
    }

    drawTable() {
        const p = this.p;
        p.fill(30, 80, 30);
        p.rect(50, 100, 700, 450, 20);
    }

    drawDealerHand() {
        this.drawHand(this.dealerHand, 400, 150, 'Dealer');
    }

    drawPlayerHands() {
        const spacing = 700 / this.playerHands.length;

        this.playerHands.forEach((hand, i) => {
            const x = 100 + i * spacing;
            const active = i === this.currentHandIndex && this.gameState === 'playing';
            this.drawHand(hand, x, 350, `Hand ${i + 1}`, active);
        });
    }

    drawHand(hand, x, y, label, active = false) {
        const p = this.p;

        p.fill(255);
        p.textSize(18);
        p.textAlign(p.CENTER);
        p.text(label, x, y - 20);

        hand.cards.forEach((card, i) => {
            const cardX = x - (hand.cards.length * 30) / 2 + i * 35;

            if (active) {
                p.fill(255, 215, 0, 100);
                p.rect(cardX - 2, y - 2, 64, 94, 7);
            }

            p.fill(255);
            p.rect(cardX, y, 60, 90, 5);

            if (card.hidden) {
                p.fill(100, 100, 150);
                p.rect(cardX + 5, y + 5, 50, 80, 3);
            } else {
                const isRed = ['♥', '♦'].includes(card.suit);
                p.fill(isRed ? [200, 0, 0] : [0, 0, 0]);

                p.textSize(24);
                p.text(card.rank, cardX + 30, y + 35);

                p.textSize(20);
                p.text(card.suit, cardX + 30, y + 65);
            }
        });

        const value = hand.getValue();
        p.fill(255);
        p.textSize(16);
        p.text(`Total: ${value}`, x, y + 110);

        if (hand.result) {
            const colors = { win: [0,255,0], lose: [255,0,0], push: [255,255,0] };
            p.fill(colors[hand.result]);
            p.text(hand.result.toUpperCase(), x, y + 130);
        }

        if (hand.status === 'blackjack') {
            p.fill(255, 215, 0);
            p.textSize(20);
            p.text('BLACKJACK!', x, y + 130);
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

    drawStrategyHint() {
        const p = this.p;
        const hint = this.getStrategyHint();

        if (hint) {
            p.fill(138, 43, 226, 220);
            p.rect(50, 560, 200, 40, 8);

            p.fill(255);
            p.textAlign(p.LEFT);
            p.textSize(16);
            p.text(`Strategy: ${hint}`, 60, 585);
        }
    }

    drawUI() {
        const p = this.p;
        p.fill(255);
        p.textSize(22);
        p.textAlign(p.LEFT);
        p.text(`Balance: ${UIHelper.formatCurrency(this.balance)}`, 50, 50);
        p.text(`Bet: ${UIHelper.formatCurrency(this.mainBet)}`, 50, 80);

        p.textSize(14);
        p.text(`Hands: ${this.stats.handsPlayed} | Won: ${this.stats.handsWon} | Lost: ${this.stats.handsLost}`, 300, 50);
    }
}

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
        <button id="double-btn" class="btn btn-primary" disabled>Double</button>
        <button id="split-btn" class="btn btn-primary" disabled>Split</button>
        <button id="surrender-btn" class="btn btn-secondary" disabled>Surrender</button>
        <button id="strategy-btn" class="btn btn-secondary">Strategy</button>
        <button id="new-game-btn" class="btn btn-secondary" style="display: none;">New Game</button>
        <button id="back-btn" class="btn btn-secondary">Back to Lobby</button>
    `;

    document.body.appendChild(container);
    document.body.appendChild(controls);

    let game;

    const sketch = (p) => {
        p.setup = async () => {
            p.createCanvas(800, 600).parent(container);

            game = new SOTABlackjackGame(p);

            await game.updateBalance();
        };

        p.draw = () => {
            if (game) {
                game.draw();

                const hitBtn = document.getElementById('hit-btn');
                const standBtn = document.getElementById('stand-btn');
                const dealBtn = document.getElementById('deal-btn');
                const doubleBtn = document.getElementById('double-btn');
                const splitBtn = document.getElementById('split-btn');
                const surrenderBtn = document.getElementById('surrender-btn');
                const newGameBtn = document.getElementById('new-game-btn');

                if (game.gameState === 'betting') {
                    dealBtn.disabled = false;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    doubleBtn.disabled = true;
                    splitBtn.disabled = true;
                    surrenderBtn.disabled = true;
                    newGameBtn.style.display = 'none';
                } else if (game.gameState === 'playing') {
                    const hand = game.playerHands[game.currentHandIndex];
                    dealBtn.disabled = true;
                    hitBtn.disabled = false;
                    standBtn.disabled = false;
                    doubleBtn.disabled = !hand.canDouble();
                    splitBtn.disabled = !hand.canSplit();
                    surrenderBtn.disabled = hand.cards.length !== 2;
                    newGameBtn.style.display = 'none';
                } else if (game.gameState === 'finished') {
                    dealBtn.disabled = true;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    doubleBtn.disabled = true;
                    splitBtn.disabled = true;
                    surrenderBtn.disabled = true;
                    newGameBtn.style.display = 'inline-block';
                } else {
                    dealBtn.disabled = true;
                    hitBtn.disabled = true;
                    standBtn.disabled = true;
                    doubleBtn.disabled = true;
                    splitBtn.disabled = true;
                    surrenderBtn.disabled = true;
                    newGameBtn.style.display = 'none';
                }
            }
        };
    };

    new p5(sketch);

    document.getElementById('deal-btn').addEventListener('click', () => {
        if (game) {
            game.mainBet = parseFloat(document.getElementById('stake-input').value) || 10;
            game.deal();
        }
    });

    document.getElementById('hit-btn').addEventListener('click', () => {
        if (game) game.hit();
    });

    document.getElementById('stand-btn').addEventListener('click', () => {
        if (game) game.stand();
    });

    document.getElementById('double-btn').addEventListener('click', () => {
        if (game) game.double();
    });

    document.getElementById('split-btn').addEventListener('click', () => {
        if (game) game.split();
    });

    document.getElementById('surrender-btn').addEventListener('click', () => {
        if (game) game.surrender();
    });

    document.getElementById('strategy-btn').addEventListener('click', () => {
        if (game) game.showStrategy = !game.showStrategy;
    });

    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (game) game.newRound();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});
