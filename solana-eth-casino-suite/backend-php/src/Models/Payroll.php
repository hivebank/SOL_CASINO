<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Payroll
{
    private static string $collection = 'payroll_runs';

    /**
     * Create payroll run
     */
    public static function createRun(array $data): string
    {
        $now = new UTCDateTime();

        $run = [
            'type' => $data['type'] ?? 'daily', // daily, weekly, bonus
            'amount_per_user' => $data['amount_per_user'],
            'eligible_users' => $data['eligible_users'] ?? [],
            'total_amount' => $data['total_amount'],
            'users_paid' => $data['users_paid'] ?? 0,
            'status' => 'completed',
            'created_at' => $now,
            'executed_by' => $data['executed_by'] ?? 'system'
        ];

        $result = Database::collection(self::$collection)->insertOne($run);
        return (string) $result->getInsertedId();
    }

    /**
     * Get user payroll history
     */
    public static function getUserPayrolls(string $userId, int $limit = 50): array
    {
        $payrolls = Database::collection(self::$collection)
            ->find(
                ['eligible_users' => $userId],
                [
                    'limit' => $limit,
                    'sort' => ['created_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatRun'], $payrolls);
    }

    /**
     * Get all payroll runs
     */
    public static function getAll(int $limit = 50, int $skip = 0): array
    {
        $runs = Database::collection(self::$collection)
            ->find(
                [],
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['created_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatRun'], $runs);
    }

    /**
     * Format payroll run document
     */
    private static function formatRun($run): array
    {
        return [
            'id' => (string) $run->_id,
            'type' => $run->type ?? 'daily',
            'amount_per_user' => $run->amount_per_user,
            'total_amount' => $run->total_amount,
            'users_paid' => $run->users_paid ?? 0,
            'status' => $run->status,
            'created_at' => $run->created_at->toDateTime()->format('c'),
            'executed_by' => $run->executed_by ?? 'system'
        ];
    }
}
