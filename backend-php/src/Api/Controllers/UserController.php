<?php

declare(strict_types=1);

namespace Casino\Api\Controllers;

use Casino\Models\User;
use Casino\Models\Nugget;
use Casino\Api\Middleware\AuthMiddleware;
use Casino\Services\PaymentService;
use Casino\Utils\Response;
use Casino\Utils\Logger;

class UserController
{
    /**
     * Get current user data
     */
    public function me(): array
    {
        $userId = AuthMiddleware::userId();
        $user = User::findById($userId);

        if (!$user) {
            Response::notFound('User not found');
        }

        // Get recent nugget transactions
        $nuggetHistory = Nugget::getUserHistory($userId, 10);

        return [
            'success' => true,
            'data' => [
                'user' => $user,
                'nugget_history' => $nuggetHistory
            ]
        ];
    }

    /**
     * Top up demo balance
     */
    public function topupDemo(): array
    {
        if ($_ENV['OPERATING_MODE'] !== 'demo') {
            Response::error('Demo top-up only available in demo mode', 400);
        }

        $userId = AuthMiddleware::userId();
        $amount = (float)($_ENV['DEMO_TOPUP_AMOUNT'] ?? 1000);

        User::updateBalance($userId, 'demo_balance', $amount);

        Logger::info('Demo balance topped up', [
            'user_id' => $userId,
            'amount' => $amount
        ]);

        $user = User::findById($userId);

        return [
            'success' => true,
            'message' => "Added {$amount} demo credits",
            'data' => [
                'demo_balance' => $user['demo_balance']
            ]
        ];
    }

    /**
     * Request testnet tokens
     */
    public function testnetRequest(): array
    {
        if ($_ENV['OPERATING_MODE'] === 'production') {
            Response::error('Testnet requests not available in production mode', 400);
        }

        $input = $this->getJsonInput();
        $chain = $input['chain'] ?? 'solana';
        $address = $input['address'] ?? null;

        if (!$address) {
            Response::validationError(['address' => 'Address is required']);
        }

        $result = [];

        if ($chain === 'solana') {
            // Try to airdrop on devnet
            $signature = PaymentService::requestSolanaAirdrop($address, 1.0);

            if ($signature) {
                $result = [
                    'chain' => 'solana',
                    'signature' => $signature,
                    'amount' => 1.0,
                    'message' => 'Airdrop requested successfully'
                ];
            } else {
                $result = [
                    'chain' => 'solana',
                    'faucet_url' => 'https://faucet.solana.com',
                    'message' => 'Please use the Solana faucet to get testnet tokens'
                ];
            }
        } elseif ($chain === 'ethereum') {
            $result = [
                'chain' => 'ethereum',
                'faucet_urls' => [
                    'goerli' => 'https://goerlifaucet.com',
                    'sepolia' => 'https://sepoliafaucet.com'
                ],
                'message' => 'Please use an Ethereum testnet faucet to get testnet tokens'
            ];
        }

        return [
            'success' => true,
            'data' => $result
        ];
    }

    /**
     * Get JSON input
     */
    private function getJsonInput(): array
    {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        return $data ?? [];
    }
}
