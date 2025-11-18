<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class ProvablyFair
{
    private static string $collection = 'provably_fair_seeds';

    /**
     * Commit new server seed
     */
    public static function commitSeed(string $serverSeed): string
    {
        $hash = hash('sha256', $serverSeed);
        $now = new UTCDateTime();

        // Mark previous active seed as inactive
        Database::collection(self::$collection)->updateMany(
            ['is_active' => true],
            ['$set' => ['is_active' => false]]
        );

        $seed = [
            'server_seed' => $serverSeed,
            'server_seed_hash' => $hash,
            'is_active' => true,
            'is_revealed' => false,
            'committed_at' => $now,
            'revealed_at' => null,
            'bets_count' => 0
        ];

        $result = Database::collection(self::$collection)->insertOne($seed);
        return (string) $result->getInsertedId();
    }

    /**
     * Get active seed
     */
    public static function getActiveSeed(): ?array
    {
        $seed = Database::collection(self::$collection)->findOne([
            'is_active' => true
        ]);

        return $seed ? self::formatSeed($seed) : null;
    }

    /**
     * Reveal seed
     */
    public static function revealSeed(string $id): bool
    {
        $result = Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($id)],
            [
                '$set' => [
                    'is_revealed' => true,
                    'is_active' => false,
                    'revealed_at' => new UTCDateTime()
                ]
            ]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Increment bet count
     */
    public static function incrementBetCount(string $id): void
    {
        Database::collection(self::$collection)->updateOne(
            ['_id' => new ObjectId($id)],
            ['$inc' => ['bets_count' => 1]]
        );
    }

    /**
     * Get all seeds (for verification)
     */
    public static function getAll(int $limit = 50, int $skip = 0): array
    {
        $seeds = Database::collection(self::$collection)
            ->find(
                [],
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['committed_at' => -1]
                ]
            )
            ->toArray();

        return array_map([self::class, 'formatSeed'], $seeds);
    }

    /**
     * Format seed document
     */
    private static function formatSeed($seed): array
    {
        return [
            'id' => (string) $seed->_id,
            'server_seed' => ($seed->is_revealed ?? false) ? $seed->server_seed : null,
            'server_seed_hash' => $seed->server_seed_hash,
            'is_active' => $seed->is_active ?? false,
            'is_revealed' => $seed->is_revealed ?? false,
            'committed_at' => $seed->committed_at->toDateTime()->format('c'),
            'revealed_at' => $seed->revealed_at ? $seed->revealed_at->toDateTime()->format('c') : null,
            'bets_count' => $seed->bets_count ?? 0
        ];
    }
}
