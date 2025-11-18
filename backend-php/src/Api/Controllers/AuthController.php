<?php

declare(strict_types=1);

namespace Casino\Api\Controllers;

use Casino\Models\User;
use Casino\Api\Middleware\AuthMiddleware;
use Casino\Utils\Response;
use Casino\Utils\Logger;

class AuthController
{
    /**
     * Request nonce for wallet signature
     */
    public function nonce(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['address'])) {
            Response::validationError(['address' => 'Address is required']);
        }

        $address = $input['address'];
        $chain = $input['chain'] ?? 'unknown';

        // Find or create user
        $user = User::findByWallet($address);

        if (!$user) {
            // Create new user
            $userId = User::create([
                'wallets' => [
                    [
                        'address' => $address,
                        'chain' => $chain,
                        'added_at' => new \MongoDB\BSON\UTCDateTime()
                    ]
                ]
            ]);

            Logger::info('New user created', ['user_id' => $userId, 'address' => $address]);
        }

        // Generate nonce
        $nonce = User::generateNonce($address);

        return [
            'success' => true,
            'data' => [
                'nonce' => $nonce,
                'message' => "Sign this message to authenticate: {$nonce}"
            ]
        ];
    }

    /**
     * Login with signed message
     */
    public function login(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['address'], $input['signature'])) {
            Response::validationError([
                'address' => 'Address is required',
                'signature' => 'Signature is required'
            ]);
        }

        $address = $input['address'];
        $signature = $input['signature'];
        $chain = $input['chain'] ?? 'unknown';

        // Find user
        $user = User::findByWallet($address);

        if (!$user || !$user['nonce']) {
            Response::error('Invalid login attempt. Please request a nonce first.', 400);
        }

        // Verify signature (simplified - in production, verify cryptographic signature)
        $isValid = $this->verifySignature($address, $user['nonce'], $signature, $chain);

        if (!$isValid) {
            Logger::warning('Invalid signature', ['address' => $address]);
            Response::unauthorized('Invalid signature');
        }

        // Clear nonce (one-time use)
        User::update($user['id'], [
            'nonce' => null,
            'last_login_at' => new \MongoDB\BSON\UTCDateTime()
        ]);

        // Generate JWT
        $token = AuthMiddleware::generateToken($user['id'], $user['role']);

        Logger::info('User logged in', ['user_id' => $user['id'], 'address' => $address]);

        return [
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'role' => $user['role'],
                    'demo_balance' => $user['demo_balance'],
                    'nugget_balance' => $user['nugget_balance']
                ]
            ]
        ];
    }

    /**
     * Verify signature (simplified)
     */
    private function verifySignature(string $address, string $nonce, string $signature, string $chain): bool
    {
        // In production, implement proper signature verification for Solana and Ethereum
        // For Ethereum: use ecrecover
        // For Solana: use nacl signature verification

        // For demo purposes, accept any non-empty signature
        if ($_ENV['APP_ENV'] === 'development') {
            return !empty($signature);
        }

        // Production signature verification would go here
        // This is a placeholder
        return strlen($signature) > 32;
    }

    /**
     * Get JSON input
     */
    private function getJsonInput(): array
    {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON', 400);
        }

        return $data ?? [];
    }
}
