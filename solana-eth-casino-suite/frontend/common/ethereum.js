/**
 * Ethereum Web3 Integration
 * Provides wallet connection and transaction helpers for Ethereum
 */

import { ethers } from 'ethers';

class EthereumWallet {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.chainId = null;
    }

    /**
     * Check if MetaMask is installed
     */
    isMetaMaskInstalled() {
        return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
    }

    /**
     * Connect to MetaMask wallet
     */
    async connect() {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install it from https://metamask.io');
        }

        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.address = await this.signer.getAddress();

            // Get chain ID
            const network = await this.provider.getNetwork();
            this.chainId = Number(network.chainId);

            console.log('Connected to MetaMask:', this.address);
            console.log('Chain ID:', this.chainId);

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.address = accounts[0];
                    console.log('Account changed:', this.address);
                }
            });

            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                this.chainId = parseInt(chainId, 16);
                console.log('Chain changed:', this.chainId);
                window.location.reload();
            });

            return {
                address: this.address,
                chain: 'ethereum',
                chainId: this.chainId
            };
        } catch (error) {
            console.error('Failed to connect to MetaMask:', error);
            throw error;
        }
    }

    /**
     * Disconnect wallet
     */
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.chainId = null;
    }

    /**
     * Sign message for authentication
     */
    async signMessage(message) {
        if (!this.signer) {
            throw new Error('Wallet not connected');
        }

        const signature = await this.signer.signMessage(message);

        return {
            signature,
            address: this.address
        };
    }

    /**
     * Get wallet balance
     */
    async getBalance(address = null) {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        const targetAddress = address || this.address;
        if (!targetAddress) {
            throw new Error('No address provided');
        }

        const balance = await this.provider.getBalance(targetAddress);
        return ethers.formatEther(balance);
    }

    /**
     * Send ETH transfer
     */
    async sendTransfer(toAddress, amount) {
        if (!this.signer) {
            throw new Error('Wallet not connected');
        }

        const tx = await this.signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount.toString())
        });

        console.log('Transaction sent:', tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();

        console.log('Transaction confirmed:', receipt);

        return tx.hash;
    }

    /**
     * Switch to specific network
     */
    async switchNetwork(chainId) {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask not installed');
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ethers.toBeHex(chainId) }]
            });

            this.chainId = chainId;
        } catch (error) {
            // Chain not added, try to add it
            if (error.code === 4902) {
                await this.addNetwork(chainId);
            } else {
                throw error;
            }
        }
    }

    /**
     * Add network to MetaMask
     */
    async addNetwork(chainId) {
        const networks = {
            5: { // Goerli
                chainId: '0x5',
                chainName: 'Goerli Testnet',
                nativeCurrency: {
                    name: 'GoerliETH',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://goerli.infura.io/v3/'],
                blockExplorerUrls: ['https://goerli.etherscan.io']
            },
            11155111: { // Sepolia
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                    name: 'SepoliaETH',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
            }
        };

        const network = networks[chainId];
        if (!network) {
            throw new Error('Unsupported network');
        }

        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network]
        });
    }

    /**
     * Get transaction details
     */
    async getTransaction(txHash) {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        return await this.provider.getTransaction(txHash);
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        return await this.provider.getTransactionReceipt(txHash);
    }
}

// Export singleton instance
export const ethereumWallet = new EthereumWallet();
export default ethereumWallet;
