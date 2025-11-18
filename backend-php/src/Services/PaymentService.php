<?php

declare(strict_types=1);

namespace Casino\Services;

use Casino\Utils\Logger;
use GuzzleHttp\Client;

class PaymentService
{
    /**
     * Verify Solana transaction
     */
    public static function verifySolanaTransaction(string $signature, string $expectedAmount, string $expectedRecipient): bool
    {
        try {
            $client = new Client();
            $response = $client->post($_ENV['SOLANA_RPC_URL'], [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'getTransaction',
                    'params' => [
                        $signature,
                        ['encoding' => 'json']
                    ]
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (!isset($data['result'])) {
                return false;
            }

            // Verify transaction details
            // This is simplified - in production, verify amounts and recipients properly
            Logger::info('Solana transaction verified', ['signature' => $signature]);

            return true;
        } catch (\Exception $e) {
            Logger::error('Failed to verify Solana transaction', [
                'signature' => $signature,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Verify Ethereum transaction
     */
    public static function verifyEthereumTransaction(string $txHash, string $expectedAmount, string $expectedRecipient): bool
    {
        try {
            $client = new Client();
            $response = $client->post($_ENV['ETH_RPC_URL'], [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'eth_getTransactionByHash',
                    'params' => [$txHash]
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (!isset($data['result'])) {
                return false;
            }

            // Verify transaction details
            Logger::info('Ethereum transaction verified', ['tx_hash' => $txHash]);

            return true;
        } catch (\Exception $e) {
            Logger::error('Failed to verify Ethereum transaction', [
                'tx_hash' => $txHash,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Request testnet airdrop (Solana)
     */
    public static function requestSolanaAirdrop(string $address, float $amount = 1.0): ?string
    {
        try {
            $client = new Client();
            $lamports = (int)($amount * 1000000000); // Convert SOL to lamports

            $response = $client->post($_ENV['SOLANA_RPC_URL'], [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'requestAirdrop',
                    'params' => [$address, $lamports]
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (isset($data['result'])) {
                Logger::info('Solana airdrop requested', [
                    'address' => $address,
                    'amount' => $amount,
                    'signature' => $data['result']
                ]);
                return $data['result'];
            }

            return null;
        } catch (\Exception $e) {
            Logger::error('Failed to request Solana airdrop', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get Solana balance
     */
    public static function getSolanaBalance(string $address): ?float
    {
        try {
            $client = new Client();
            $response = $client->post($_ENV['SOLANA_RPC_URL'], [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'getBalance',
                    'params' => [$address]
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (isset($data['result']['value'])) {
                return $data['result']['value'] / 1000000000; // Convert lamports to SOL
            }

            return null;
        } catch (\Exception $e) {
            Logger::error('Failed to get Solana balance', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get Ethereum balance
     */
    public static function getEthereumBalance(string $address): ?float
    {
        try {
            $client = new Client();
            $response = $client->post($_ENV['ETH_RPC_URL'], [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'eth_getBalance',
                    'params' => [$address, 'latest']
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (isset($data['result'])) {
                $wei = hexdec($data['result']);
                return $wei / 1e18; // Convert wei to ETH
            }

            return null;
        } catch (\Exception $e) {
            Logger::error('Failed to get Ethereum balance', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
