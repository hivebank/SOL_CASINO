<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Nugget
{
    private static string $collection = 'nugget_transactions';

    /**
     * Credit nuggets (mint)
     */
    public static function credit(string $userId, float $amount, string $reason, array $metadata = []): string
    {
        $tx = self::createTransaction($userId, $amount, 'credit', $reason, $metadata);

        // Update user balance
        User::updateBalance($userId, 'nugget_balance', $amount);

        return $tx;
    }

    /**
     * Debit nuggets (burn)
     */
    public static function debit(string $userId, float $amount, string $reason, array $metadata = []): string
    {
        // Check sufficient balance
        $user = User::findById($userId);
        if (!$user || $user['nugget_balance'] < $amount) {
            throw new \RuntimeException('Insufficient nugget balance');
        }

        $tx = self::createTransaction($userId, -$amount, 'debit', $reason, $metadata);

        // Update user balance
        User::updateBalance($userId, 'nugget_balance', -$amount);

        return $tx;
    }

    /**
     * Transfer nuggets between users
     */
    public static function transfer(string $fromUserId, string $toUserId, float $amount, string $reason = 'transfer'): array
    {
        // Debit from sender
        $debitTx = self::debit($fromUserId, $amount, $reason, ['to_user_id' => $toUserId]);

        // Credit to recipient
        $creditTx = self::credit($toUserId, $amount, $reason, ['from_user_id' => $fromUserId]);

        return [
            'debit_tx' => $debitTx,
            'credit_tx' => $creditTx
        ];
    }

    /**
     * Get user transaction history
     */
    public static function getUserHistory(string $userId, int $limit = 50, int $skip = 0): array
    {
        $transactions = Database::collection(self::$collection)
            ->find(
                ['user_id' => $userId],
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['created_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatTransaction'], $transactions);
    }

    /**
     * Get total supply
     */
    public static function getTotalSupply(): float
    {
        $pipeline = [
            [
                '$group' => [
                    '_id' => null,
                    'total' => ['$sum' => '$amount']
                ]
            ]
        ];

        $result = Database::collection(self::$collection)->aggregate($pipeline)->toArray();

        return !empty($result) ? ($result[0]->total ?? 0) : 0;
    }

    /**
     * Create transaction record
     */
    private static function createTransaction(
        string $userId,
        float $amount,
        string $type,
        string $reason,
        array $metadata
    ): string {
        $now = new UTCDateTime();

        $tx = [
            'user_id' => $userId,
            'amount' => $amount,
            'type' => $type, // credit, debit
            'reason' => $reason, // payroll, payout, promotion, transfer, etc.
            'metadata' => $metadata,
            'created_at' => $now
        ];

        $result = Database::collection(self::$collection)->insertOne($tx);
        return (string) $result->getInsertedId();
    }

    /**
     * Format transaction document
     */
    private static function formatTransaction($tx): array
    {
        return [
            'id' => (string) $tx->_id,
            'user_id' => $tx->user_id,
            'amount' => $tx->amount,
            'type' => $tx->type,
            'reason' => $tx->reason,
            'metadata' => $tx->metadata ?? [],
            'created_at' => $tx->created_at->toDateTime()->format('c')
        ];
    }
}
