<?php

declare(strict_types=1);

namespace Casino\Api\Middleware;

use Casino\Utils\Response;
use Casino\Utils\Logger;

class RateLimitMiddleware
{
    private static array $limits = [];
    private const STORAGE_FILE = __DIR__ . '/../../../storage/rate_limits.json';

    /**
     * Handle rate limiting
     */
    public static function handle(string $type): void
    {
        self::loadLimits();

        $identifier = self::getIdentifier();
        $limit = self::getLimit($type);
        $window = 3600; // 1 hour window

        $key = $type . ':' . $identifier;
        $now = time();

        if (!isset(self::$limits[$key])) {
            self::$limits[$key] = [
                'count' => 0,
                'reset_at' => $now + $window
            ];
        }

        $limitData = &self::$limits[$key];

        // Reset if window expired
        if ($now >= $limitData['reset_at']) {
            $limitData['count'] = 0;
            $limitData['reset_at'] = $now + $window;
        }

        // Check limit
        if ($limitData['count'] >= $limit) {
            Logger::warning('Rate limit exceeded', [
                'type' => $type,
                'identifier' => $identifier,
                'count' => $limitData['count'],
                'limit' => $limit
            ]);

            Response::rateLimitExceeded(
                sprintf('Rate limit exceeded. Try again in %d seconds', $limitData['reset_at'] - $now)
            );
        }

        // Increment counter
        $limitData['count']++;

        self::saveLimits();
    }

    /**
     * Get rate limit for type
     */
    private static function getLimit(string $type): int
    {
        return match ($type) {
            'demo_topup' => (int)($_ENV['RATE_LIMIT_DEMO_TOPUP'] ?? 10),
            'bet' => (int)($_ENV['RATE_LIMIT_BET'] ?? 100),
            'login' => (int)($_ENV['RATE_LIMIT_LOGIN'] ?? 20),
            default => 60
        };
    }

    /**
     * Get user identifier for rate limiting
     */
    private static function getIdentifier(): string
    {
        // Use authenticated user ID if available
        $user = AuthMiddleware::user();
        if ($user && isset($user['user_id'])) {
            return 'user:' . $user['user_id'];
        }

        // Fall back to IP address
        return 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    /**
     * Load rate limits from storage
     */
    private static function loadLimits(): void
    {
        $dir = dirname(self::STORAGE_FILE);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (file_exists(self::STORAGE_FILE)) {
            $data = file_get_contents(self::STORAGE_FILE);
            self::$limits = json_decode($data, true) ?? [];

            // Clean up expired entries
            $now = time();
            self::$limits = array_filter(self::$limits, function ($limit) use ($now) {
                return $limit['reset_at'] > $now - 86400; // Keep for 24 hours
            });
        }
    }

    /**
     * Save rate limits to storage
     */
    private static function saveLimits(): void
    {
        file_put_contents(
            self::STORAGE_FILE,
            json_encode(self::$limits, JSON_PRETTY_PRINT),
            LOCK_EX
        );
    }
}
