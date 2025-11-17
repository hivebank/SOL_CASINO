<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Bet
{
    private static string $collection = 'bets';

    /**
     * Create new bet
     */
    public static function create(array $data): string
    {
        $now = new UTCDateTime();

        $bet = [
            'user_id' => $data['user_id'],
            'game' => $data['game'], // slots, roulette, blackjack
            'mode' => $data['mode'], // demo, testnet, production
            'stake' => $data['stake'],
            'currency' => $data['currency'] ?? 'demo',
            'game_data' => $data['game_data'] ?? [],
            'client_seed' => $data['client_seed'] ?? null,
            'server_seed_hash' => $data['server_seed_hash'] ?? null,
            'status' => 'pending', // pending, resolved, cancelled
            'outcome' => null,
            'payout' => null,
            'multiplier' => null,
            'house_edge' => $data['house_edge'] ?? 0.0,
            'tx_hash' => $data['tx_hash'] ?? null,
            'chain' => $data['chain'] ?? null,
            'created_at' => $now,
            'resolved_at' => null
        ];

        $result = Database::collection(self::$collection)->insertOne($bet);
        return (string) $result->getInsertedId();
    }

    /**
     * Find bet by ID
     */
    public static function findById(string $id): ?array
    {
        try {
            $bet = Database::collection(self::$collection)->findOne([
                '_id' => new ObjectId($id)
            ]);

            return $bet ? self::formatBet($bet) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Update bet
     */
    public static function update(string $id, array $data): bool
    {
        $result = Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($id)],
            ['$set' => $data]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Resolve bet
     */
    public static function resolve(string $id, array $outcome, float $payout, float $multiplier): bool
    {
        $data = [
            'status' => 'resolved',
            'outcome' => $outcome,
            'payout' => $payout,
            'multiplier' => $multiplier,
            'resolved_at' => new UTCDateTime()
        ];

        return self::update($id, $data);
    }

    /**
     * Get user bet history
     */
    public static function getUserHistory(string $userId, int $limit = 50, int $skip = 0): array
    {
        $bets = Database::collection(self::$collection)
            ->find(
                ['user_id' => $userId],
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['created_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatBet'], $bets);
    }

    /**
     * Get all bets (admin)
     */
    public static function getAll(array $filters = [], int $limit = 50, int $skip = 0): array
    {
        $query = [];

        if (isset($filters['game'])) {
            $query['game'] = $filters['game'];
        }

        if (isset($filters['mode'])) {
            $query['mode'] = $filters['mode'];
        }

        if (isset($filters['status'])) {
            $query['status'] = $filters['status'];
        }

        if (isset($filters['user_id'])) {
            $query['user_id'] = $filters['user_id'];
        }

        $bets = Database::collection(self::$collection)
            ->find(
                $query,
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['created_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatBet'], $bets);
    }

    /**
     * Get statistics
     */
    public static function getStats(array $filters = []): array
    {
        $query = ['status' => 'resolved'];

        if (isset($filters['game'])) {
            $query['game'] = $filters['game'];
        }

        if (isset($filters['mode'])) {
            $query['mode'] = $filters['mode'];
        }

        $pipeline = [
            ['$match' => $query],
            [
                '$group' => [
                    '_id' => null,
                    'total_bets' => ['$sum' => 1],
                    'total_wagered' => ['$sum' => '$stake'],
                    'total_payout' => ['$sum' => '$payout'],
                    'avg_multiplier' => ['$avg' => '$multiplier']
                ]
            ]
        ];

        $result = Database::collection(self::$collection)->aggregate($pipeline)->toArray();

        if (empty($result)) {
            return [
                'total_bets' => 0,
                'total_wagered' => 0,
                'total_payout' => 0,
                'avg_multiplier' => 0,
                'house_profit' => 0
            ];
        }

        $stats = $result[0];
        return [
            'total_bets' => $stats->total_bets ?? 0,
            'total_wagered' => $stats->total_wagered ?? 0,
            'total_payout' => $stats->total_payout ?? 0,
            'avg_multiplier' => $stats->avg_multiplier ?? 0,
            'house_profit' => ($stats->total_wagered ?? 0) - ($stats->total_payout ?? 0)
        ];
    }

    /**
     * Format bet document
     */
    private static function formatBet($bet): array
    {
        return [
            'id' => (string) $bet->_id,
            'user_id' => $bet->user_id,
            'game' => $bet->game,
            'mode' => $bet->mode,
            'stake' => $bet->stake,
            'currency' => $bet->currency ?? 'demo',
            'game_data' => $bet->game_data ?? [],
            'client_seed' => $bet->client_seed ?? null,
            'server_seed_hash' => $bet->server_seed_hash ?? null,
            'status' => $bet->status,
            'outcome' => $bet->outcome ?? null,
            'payout' => $bet->payout ?? null,
            'multiplier' => $bet->multiplier ?? null,
            'house_edge' => $bet->house_edge ?? 0.0,
            'tx_hash' => $bet->tx_hash ?? null,
            'chain' => $bet->chain ?? null,
            'created_at' => $bet->created_at->toDateTime()->format('c'),
            'resolved_at' => $bet->resolved_at ? $bet->resolved_at->toDateTime()->format('c') : null
        ];
    }
}
