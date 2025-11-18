/**
 * Casino Lobby with p5.js animations
 */

import p5 from 'p5';
import { api } from '../common/api.js';
import { solanaWallet } from '../common/solana.js';
import { ethereumWallet } from '../common/ethereum.js';
import { UIHelper } from '../common/ui.js';

class Lobby {
    constructor(p) {
        this.p = p;
        this.particles = [];
        this.wallet = null;
        this.user = null;
        this.mode = localStorage.getItem('casino_mode') || 'demo';

        this.initParticles();
    }

    initParticles() {
        const p = this.p;
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: p.random(p.width),
                y: p.random(p.height),
                vx: p.random(-0.5, 0.5),
                vy: p.random(-0.5, 0.5),
                size: p.random(2, 6),
                alpha: p.random(100, 255)
            });
        }
    }

    async connectWallet(chain) {
        try {
            UIHelper.showLoading(`Connecting to ${chain} wallet...`);

            let walletData;

            if (chain === 'solana') {
                solanaWallet.initialize();
                walletData = await solanaWallet.connect();
            } else if (chain === 'ethereum') {
                walletData = await ethereumWallet.connect();
            }

            // Request nonce
            const nonceResponse = await api.requestNonce(walletData.address, chain);
            const nonce = nonceResponse.data.nonce;

            // Sign message
            let signature;
            if (chain === 'solana') {
                const signed = await solanaWallet.signMessage(nonce);
                signature = signed.signature;
            } else if (chain === 'ethereum') {
                const signed = await ethereumWallet.signMessage(nonce);
                signature = signed.signature;
            }

            // Login
            const loginResponse = await api.login(walletData.address, signature, chain);

            this.wallet = walletData;
            this.user = loginResponse.data.user;

            UIHelper.hideLoading();
            UIHelper.showNotification('Connected successfully!', 'success');

            this.updateUI();

        } catch (error) {
            UIHelper.hideLoading();
            UIHelper.showNotification('Failed to connect: ' + error.message, 'error');
        }
    }

    async disconnect() {
        if (this.wallet?.chain === 'solana') {
            await solanaWallet.disconnect();
        } else if (this.wallet?.chain === 'ethereum') {
            ethereumWallet.disconnect();
        }

        await api.logout();

        this.wallet = null;
        this.user = null;

        UIHelper.showNotification('Disconnected', 'info');
        this.updateUI();
    }

    async topupDemo() {
        try {
            UIHelper.showLoading('Adding demo credits...');
            await api.topupDemo();

            const userData = await api.getMe();
            this.user = userData.data.user;

            UIHelper.hideLoading();
            UIHelper.showNotification('Demo credits added!', 'success');
            this.updateUI();
        } catch (error) {
            UIHelper.hideLoading();
            UIHelper.showNotification('Failed to top up: ' + error.message, 'error');
        }
    }

    switchMode(newMode) {
        this.mode = newMode;
        localStorage.setItem('casino_mode', newMode);
        this.updateUI();
        UIHelper.showNotification(`Switched to ${newMode} mode`, 'info');
    }

    draw() {
        const p = this.p;
        p.background(15, 15, 30);

        // Draw and update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > p.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > p.height) particle.vy *= -1;

            p.fill(150, 100, 255, particle.alpha);
            p.noStroke();
            p.circle(particle.x, particle.y, particle.size);
        });

        // Draw casino title
        p.fill(255, 200, 100);
        p.textSize(60);
        p.textAlign(p.CENTER);
        p.text('🎰 CRYPTO CASINO 🎰', p.width / 2, 100);

        // Draw subtitle
        p.fill(200, 200, 200);
        p.textSize(18);
        p.text('Solana & Ethereum Powered', p.width / 2, 140);
    }

    updateUI() {
        const walletSection = document.getElementById('wallet-section');
        const modeSection = document.getElementById('mode-section');
        const balanceSection = document.getElementById('balance-section');

        if (this.user) {
            walletSection.innerHTML = `
                <p>Connected: ${UIHelper.formatAddress(this.wallet.address)}</p>
                <p>Chain: ${this.wallet.chain}</p>
                <button id="disconnect-btn" class="btn btn-secondary">Disconnect</button>
            `;

            document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());

            balanceSection.innerHTML = `
                <div class="balance-card">
                    <h3>Demo Balance</h3>
                    <p class="balance-amount">${UIHelper.formatCurrency(this.user.demo_balance)}</p>
                    ${this.mode === 'demo' ? '<button id="topup-btn" class="btn btn-primary">Top Up Demo</button>' : ''}
                </div>
                <div class="balance-card">
                    <h3>Nugget Balance</h3>
                    <p class="balance-amount">${UIHelper.formatCurrency(this.user.nugget_balance)}</p>
                </div>
            `;

            const topupBtn = document.getElementById('topup-btn');
            if (topupBtn) {
                topupBtn.addEventListener('click', () => this.topupDemo());
            }
        } else {
            walletSection.innerHTML = `
                <button id="connect-phantom-btn" class="btn btn-primary">Connect Phantom (Solana)</button>
                <button id="connect-metamask-btn" class="btn btn-primary">Connect MetaMask (Ethereum)</button>
            `;

            document.getElementById('connect-phantom-btn').addEventListener('click', () => this.connectWallet('solana'));
            document.getElementById('connect-metamask-btn').addEventListener('click', () => this.connectWallet('ethereum'));

            balanceSection.innerHTML = '<p class="text-muted">Connect wallet to view balances</p>';
        }

        // Update mode toggles
        document.querySelectorAll('.mode-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });
    }
}

// Initialize lobby
document.addEventListener('DOMContentLoaded', () => {
    let lobby;

    const sketch = (p) => {
        p.setup = () => {
            const canvas = p.createCanvas(p.windowWidth, 200);
            canvas.parent('canvas-container');

            lobby = new Lobby(p);

            // Check if already logged in
            if (api.token) {
                api.getMe().then(response => {
                    lobby.user = response.data.user;
                    lobby.updateUI();
                }).catch(() => {
                    api.logout();
                });
            } else {
                lobby.updateUI();
            }
        };

        p.draw = () => {
            if (lobby) {
                lobby.draw();
            }
        };

        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, 200);
        };
    };

    new p5(sketch);

    // Mode toggle listeners
    document.querySelectorAll('.mode-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            if (lobby) {
                lobby.switchMode(btn.dataset.mode);
            }
        });
    });

    // Game navigation
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!lobby.user) {
                UIHelper.showNotification('Please connect your wallet first!', 'warning');
                return;
            }

            const game = card.dataset.game;
            window.location.href = `/games/${game}/index.html`;
        });
    });

    // Dashboard navigation
    document.getElementById('dashboard-btn')?.addEventListener('click', () => {
        if (!lobby.user) {
            UIHelper.showNotification('Please connect your wallet first!', 'warning');
            return;
        }
        window.location.href = '/dashboard/index.html';
    });

    // Admin navigation
    document.getElementById('admin-btn')?.addEventListener('click', () => {
        if (!lobby.user || lobby.user.role !== 'admin') {
            UIHelper.showNotification('Admin access required!', 'error');
            return;
        }
        window.location.href = '/admin/index.html';
    });
});
