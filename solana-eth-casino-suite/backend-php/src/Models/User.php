<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class User
{
    private static string $collection = 'users';

    /**
     * Create new user
     */
    public static function create(array $data): string
    {
        $now = new UTCDateTime();

        $user = [
            'wallets' => $data['wallets'] ?? [],
            'role' => $data['role'] ?? 'user',
            'demo_balance' => $data['demo_balance'] ?? (float)($_ENV['DEMO_INITIAL_BALANCE'] ?? 0),
            'nugget_balance' => $data['nugget_balance'] ?? 0.0,
            'testnet_balances' => [
                'solana' => 0.0,
                'ethereum' => 0.0
            ],
            'email' => $data['email'] ?? null,
            'password_hash' => $data['password_hash'] ?? null,
            'nonce' => null,
            'kyc_status' => 'pending',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
            'last_login_at' => null
        ];

        $result = Database::collection(self::$collection)->insertOne($user);
        return (string) $result->getInsertedId();
    }

    /**
     * Find user by ID
     */
    public static function findById(string $id): ?array
    {
        try {
            $user = Database::collection(self::$collection)->findOne([
                '_id' => new ObjectId($id)
            ]);

            return $user ? self::formatUser($user) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Find user by wallet address
     */
    public static function findByWallet(string $address): ?array
    {
        $user = Database::collection(self::$collection)->findOne([
            'wallets.address' => $address
        ]);

        return $user ? self::formatUser($user) : null;
    }

    /**
     * Find user by email
     */
    public static function findByEmail(string $email): ?array
    {
        $user = Database::collection(self::$collection)->findOne([
            'email' => $email
        ]);

        return $user ? self::formatUser($user) : null;
    }

    /**
     * Update user
     */
    public static function update(string $id, array $data): bool
    {
        $data['updated_at'] = new UTCDateTime();

        $result = Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($id)],
            ['$set' => $data]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Add wallet to user
     */
    public static function addWallet(string $userId, string $address, string $chain): bool
    {
        $result = Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($userId)],
            [
                '$push' => [
                    'wallets' => [
                        'address' => $address,
                        'chain' => $chain,
                        'added_at' => new UTCDateTime()
                    ]
                ],
                '$set' => ['updated_at' => new UTCDateTime()]
            ]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Update balance
     */
    public static function updateBalance(string $userId, string $balanceType, float $amount): bool
    {
        $result = Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($userId)],
            [
                '$inc' => [$balanceType => $amount],
                '$set' => ['updated_at' => new UTCDateTime()]
            ]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Generate and store nonce
     */
    public static function generateNonce(string $address): string
    {
        $nonce = bin2hex(random_bytes(16));

        Database::collection(self::$collection)->updateOne(
            ['wallets.address' => $address],
            ['$set' => ['nonce' => $nonce, 'updated_at' => new UTCDateTime()]]
        );

        return $nonce;
    }

    /**
     * Get all users (admin)
     */
    public static function getAll(int $limit = 50, int $skip = 0): array
    {
        $users = Database::collection(self::$collection)
            ->find([], ['limit' => $limit, 'skip' => $skip])
            ->toArray();

        return array_map([self::class, 'formatUser'], $users);
    }

    /**
     * Format user document
     */
    private static function formatUser($user): array
    {
        return [
            'id' => (string) $user->_id,
            'wallets' => $user->wallets ?? [],
            'role' => $user->role ?? 'user',
            'demo_balance' => $user->demo_balance ?? 0.0,
            'nugget_balance' => $user->nugget_balance ?? 0.0,
            'testnet_balances' => $user->testnet_balances ?? [],
            'email' => $user->email ?? null,
            'nonce' => $user->nonce ?? null,
            'kyc_status' => $user->kyc_status ?? 'pending',
            'is_active' => $user->is_active ?? true,
            'created_at' => $user->created_at->toDateTime()->format('c'),
            'updated_at' => $user->updated_at->toDateTime()->format('c'),
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toDateTime()->format('c') : null
        ];
    }
}
