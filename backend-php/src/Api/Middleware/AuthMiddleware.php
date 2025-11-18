<?php

declare(strict_types=1);

namespace Casino\Api\Middleware;

use Casino\Utils\Response;
use Casino\Utils\Logger;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware
{
    private static ?array $currentUser = null;

    /**
     * Handle authentication
     */
    public static function handle(): void
    {
        $token = self::extractToken();

        if (!$token) {
            Response::unauthorized('No token provided');
        }

        try {
            $decoded = JWT::decode($token, new Key($_ENV['JWT_SECRET'], 'HS256'));
            self::$currentUser = (array) $decoded;

            Logger::debug('User authenticated', ['user_id' => self::$currentUser['user_id']]);
        } catch (\Exception $e) {
            Logger::warning('Authentication failed', ['error' => $e->getMessage()]);
            Response::unauthorized('Invalid token');
        }
    }

    /**
     * Require admin role
     */
    public static function requireAdmin(): void
    {
        if (!self::$currentUser) {
            self::handle();
        }

        if (!isset(self::$currentUser['role']) || self::$currentUser['role'] !== 'admin') {
            Response::forbidden('Admin access required');
        }
    }

    /**
     * Get current authenticated user
     */
    public static function user(): ?array
    {
        return self::$currentUser;
    }

    /**
     * Get current user ID
     */
    public static function userId(): ?string
    {
        return self::$currentUser['user_id'] ?? null;
    }

    /**
     * Extract JWT token from request
     */
    private static function extractToken(): ?string
    {
        // Check Authorization header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s+(.+)/', $headers['Authorization'], $matches)) {
                return $matches[1];
            }
        }

        // Check query parameter (not recommended for production)
        if (isset($_GET['token'])) {
            return $_GET['token'];
        }

        return null;
    }

    /**
     * Generate JWT token
     */
    public static function generateToken(string $userId, string $role, array $additionalClaims = []): string
    {
        $issuedAt = time();
        $expiry = $issuedAt + (int)($_ENV['JWT_EXPIRY'] ?? 86400);

        $payload = array_merge([
            'iat' => $issuedAt,
            'exp' => $expiry,
            'user_id' => $userId,
            'role' => $role
        ], $additionalClaims);

        return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
    }
}
