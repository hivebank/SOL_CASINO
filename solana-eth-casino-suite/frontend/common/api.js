/**
 * API Client for Casino Backend
 */

class CasinoAPI {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('casino_token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('casino_token', token);
        } else {
            localStorage.removeItem('casino_token');
        }
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async requestNonce(address, chain) {
        return this.request('/api/v1/auth/nonce', {
            method: 'POST',
            body: { address, chain }
        });
    }

    async login(address, signature, chain) {
        const response = await this.request('/api/v1/auth/login', {
            method: 'POST',
            body: { address, signature, chain }
        });

        if (response.data?.token) {
            this.setToken(response.data.token);
        }

        return response;
    }

    async logout() {
        this.setToken(null);
    }

    // User endpoints
    async getMe() {
        return this.request('/api/v1/user/me');
    }

    async topupDemo() {
        return this.request('/api/v1/topup/demo', {
            method: 'POST'
        });
    }

    async requestTestnet(address, chain) {
        return this.request('/api/v1/topup/testnet-request', {
            method: 'POST',
            body: { address, chain }
        });
    }

    // Game endpoints
    async placeBet(game, stake, mode, gameData = {}, clientSeed = null) {
        return this.request('/api/v1/game/bet', {
            method: 'POST',
            body: {
                game,
                stake,
                mode,
                game_data: gameData,
                client_seed: clientSeed
            }
        });
    }

    async resolveBet(betId) {
        return this.request('/api/v1/game/resolve', {
            method: 'POST',
            body: { bet_id: betId }
        });
    }

    async getBetHistory(limit = 50, skip = 0) {
        return this.request(`/api/v1/game/history?limit=${limit}&skip=${skip}`);
    }

    async getGameConfig() {
        return this.request('/api/v1/game/config');
    }

    // Admin endpoints
    async adminListBets(filters = {}, limit = 50, skip = 0) {
        const params = new URLSearchParams({
            ...filters,
            limit: limit.toString(),
            skip: skip.toString()
        });

        return this.request(`/api/v1/admin/bets?${params}`);
    }

    async adminIssuePayout(userId, amount, reason, currency = 'nugget') {
        return this.request('/api/v1/admin/payout', {
            method: 'POST',
            body: { user_id: userId, amount, reason, currency }
        });
    }

    async adminCommitSeed(serverSeed = null) {
        return this.request('/api/v1/admin/seed/commit', {
            method: 'POST',
            body: serverSeed ? { server_seed: serverSeed } : {}
        });
    }

    async adminRevealSeed(seedId) {
        return this.request('/api/v1/admin/seed/reveal', {
            method: 'POST',
            body: { seed_id: seedId }
        });
    }

    async adminListSeeds(limit = 50, skip = 0) {
        return this.request(`/api/v1/admin/seeds?limit=${limit}&skip=${skip}`);
    }

    async adminListUsers(limit = 50, skip = 0) {
        return this.request(`/api/v1/admin/users?limit=${limit}&skip=${skip}`);
    }

    async adminUpdateHouseEdge(game, houseEdge) {
        return this.request('/api/v1/admin/house-edge', {
            method: 'PUT',
            body: { game, house_edge: houseEdge }
        });
    }

    async adminGetStats(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/api/v1/admin/stats?${params}`);
    }

    async adminRunPayroll(type = 'daily', userIds = [], amount = 0) {
        return this.request('/api/v1/admin/payroll/run', {
            method: 'POST',
            body: { type, user_ids: userIds, amount }
        });
    }
}

// Export singleton instance
export const api = new CasinoAPI();
export default api;
