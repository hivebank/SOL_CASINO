<?php

declare(strict_types=1);

namespace Casino\Services;

use Casino\Models\ProvablyFair;

class RNG
{
    /**
     * Generate provably fair random number
     */
    public static function generate(string $clientSeed, string $betId, int $min, int $max): int
    {
        // Get active server seed
        $seedData = ProvablyFair::getActiveSeed();

        if (!$seedData) {
            throw new \RuntimeException('No active server seed');
        }

        $serverSeed = $seedData['server_seed'];

        // Generate random bytes using HMAC
        $message = $clientSeed . '||' . $betId;
        $hmac = hash_hmac('sha256', $message, $serverSeed, true);

        // Convert first 8 bytes to integer
        $randomInt = 0;
        for ($i = 0; $i < 8; $i++) {
            $randomInt = ($randomInt << 8) | ord($hmac[$i]);
        }

        // Map to range [min, max]
        $range = $max - $min + 1;
        $result = $min + ($randomInt % $range);

        // Increment bet count for this seed
        ProvablyFair::incrementBetCount($seedData['id']);

        return $result;
    }

    /**
     * Generate multiple random numbers
     */
    public static function generateMultiple(string $clientSeed, string $betId, int $count, int $min, int $max): array
    {
        $results = [];

        for ($i = 0; $i < $count; $i++) {
            $modifiedBetId = $betId . '_' . $i;
            $results[] = self::generate($clientSeed, $modifiedBetId, $min, $max);
        }

        return $results;
    }

    /**
     * Generate random float between 0 and 1
     */
    public static function generateFloat(string $clientSeed, string $betId): float
    {
        $seedData = ProvablyFair::getActiveSeed();

        if (!$seedData) {
            throw new \RuntimeException('No active server seed');
        }

        $serverSeed = $seedData['server_seed'];
        $message = $clientSeed . '||' . $betId;
        $hmac = hash_hmac('sha256', $message, $serverSeed, true);

        // Convert first 8 bytes to float [0, 1]
        $randomInt = 0;
        for ($i = 0; $i < 8; $i++) {
            $randomInt = ($randomInt << 8) | ord($hmac[$i]);
        }

        ProvablyFair::incrementBetCount($seedData['id']);

        return $randomInt / (2 ** 64);
    }

    /**
     * Verify a result
     */
    public static function verify(
        string $serverSeed,
        string $clientSeed,
        string $betId,
        int $min,
        int $max,
        int $expectedResult
    ): bool {
        $message = $clientSeed . '||' . $betId;
        $hmac = hash_hmac('sha256', $message, $serverSeed, true);

        $randomInt = 0;
        for ($i = 0; $i < 8; $i++) {
            $randomInt = ($randomInt << 8) | ord($hmac[$i]);
        }

        $range = $max - $min + 1;
        $result = $min + ($randomInt % $range);

        return $result === $expectedResult;
    }

    /**
     * Generate client seed (for demo purposes)
     */
    public static function generateClientSeed(): string
    {
        return bin2hex(random_bytes(16));
    }
}
