<?php

declare(strict_types=1);

namespace Casino\Utils;

class Response
{
    /**
     * Send JSON response
     */
    public static function send(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Send success response
     */
    public static function success(mixed $data = null, string $message = 'Success', int $statusCode = 200): void
    {
        self::send([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }

    /**
     * Send error response
     */
    public static function error(string $message, int $statusCode = 400, ?array $details = null): void
    {
        $response = [
            'success' => false,
            'error' => $message
        ];

        if ($details !== null) {
            $response['details'] = $details;
        }

        self::send($response, $statusCode);
    }

    /**
     * Send unauthorized response
     */
    public static function unauthorized(string $message = 'Unauthorized'): void
    {
        self::error($message, 401);
    }

    /**
     * Send forbidden response
     */
    public static function forbidden(string $message = 'Forbidden'): void
    {
        self::error($message, 403);
    }

    /**
     * Send not found response
     */
    public static function notFound(string $message = 'Resource not found'): void
    {
        self::error($message, 404);
    }

    /**
     * Send validation error response
     */
    public static function validationError(array $errors): void
    {
        self::send([
            'success' => false,
            'error' => 'Validation failed',
            'errors' => $errors
        ], 422);
    }

    /**
     * Send rate limit response
     */
    public static function rateLimitExceeded(string $message = 'Rate limit exceeded'): void
    {
        self::error($message, 429);
    }
}
