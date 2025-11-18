/**
 * Solana Web3 Integration
 * Provides wallet connection and transaction helpers for Solana
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

class SolanaWallet {
    constructor() {
        this.provider = null;
        this.publicKey = null;
        this.connection = null;
    }

    /**
     * Initialize connection
     */
    initialize(rpcUrl = 'https://api.devnet.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    /**
     * Check if Phantom wallet is installed
     */
    isPhantomInstalled() {
        return typeof window !== 'undefined' && window.solana?.isPhantom;
    }

    /**
     * Connect to Phantom wallet
     */
    async connect() {
        if (!this.isPhantomInstalled()) {
            throw new Error('Phantom wallet is not installed. Please install it from https://phantom.app');
        }

        try {
            const response = await window.solana.connect();
            this.provider = window.solana;
            this.publicKey = response.publicKey;

            console.log('Connected to Phantom:', this.publicKey.toString());

            return {
                address: this.publicKey.toString(),
                chain: 'solana'
            };
        } catch (error) {
            console.error('Failed to connect to Phantom:', error);
            throw error;
        }
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        if (this.provider) {
            await this.provider.disconnect();
            this.provider = null;
            this.publicKey = null;
        }
    }

    /**
     * Sign message for authentication
     */
    async signMessage(message) {
        if (!this.provider || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await this.provider.signMessage(encodedMessage, 'utf8');

        return {
            signature: Buffer.from(signedMessage.signature).toString('base64'),
            publicKey: this.publicKey.toString()
        };
    }

    /**
     * Get wallet balance
     */
    async getBalance() {
        if (!this.connection || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        const balance = await this.connection.getBalance(this.publicKey);
        return balance / LAMPORTS_PER_SOL;
    }

    /**
     * Send SOL transfer
     */
    async sendTransfer(toAddress, amount) {
        if (!this.provider || !this.publicKey || !this.connection) {
            throw new Error('Wallet not connected');
        }

        const lamports = amount * LAMPORTS_PER_SOL;
        const toPublicKey = new PublicKey(toAddress);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.publicKey,
                toPubkey: toPublicKey,
                lamports
            })
        );

        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.publicKey;

        // Sign and send transaction
        const signed = await this.provider.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize());

        // Wait for confirmation
        await this.connection.confirmTransaction(signature);

        return signature;
    }

    /**
     * Request airdrop (devnet only)
     */
    async requestAirdrop(amount = 1) {
        if (!this.connection || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        try {
            const lamports = amount * LAMPORTS_PER_SOL;
            const signature = await this.connection.requestAirdrop(this.publicKey, lamports);
            await this.connection.confirmTransaction(signature);

            console.log('Airdrop successful:', signature);
            return signature;
        } catch (error) {
            console.error('Airdrop failed:', error);
            throw new Error('Airdrop failed. Please use a faucet: https://faucet.solana.com');
        }
    }

    /**
     * Get transaction details
     */
    async getTransaction(signature) {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }

        return await this.connection.getTransaction(signature);
    }
}

// Export singleton instance
export const solanaWallet = new SolanaWallet();
export default solanaWallet;
