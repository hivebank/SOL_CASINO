<?php

declare(strict_types=1);

namespace Casino\Utils;

class Logger
{
    private static ?string $logFile = null;
    private static ?string $logLevel = null;

    private const LEVELS = [
        'debug' => 0,
        'info' => 1,
        'warning' => 2,
        'error' => 3,
        'critical' => 4
    ];

    /**
     * Initialize logger
     */
    private static function init(): void
    {
        if (self::$logFile === null) {
            self::$logFile = $_ENV['LOG_FILE'] ?? __DIR__ . '/../../logs/casino.log';
            self::$logLevel = strtolower($_ENV['LOG_LEVEL'] ?? 'info');

            // Create logs directory if it doesn't exist
            $logDir = dirname(self::$logFile);
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
        }
    }

    /**
     * Log a message
     */
    private static function log(string $level, string $message, array $context = []): void
    {
        self::init();

        // Check if we should log this level
        $currentLevel = self::LEVELS[self::$logLevel] ?? 1;
        $messageLevel = self::LEVELS[$level] ?? 1;

        if ($messageLevel < $currentLevel) {
            return;
        }

        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? json_encode($context, JSON_UNESCAPED_SLASHES) : '';
        $logMessage = sprintf(
            "[%s] %s: %s %s\n",
            $timestamp,
            strtoupper($level),
            $message,
            $contextStr
        );

        file_put_contents(self::$logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log debug message
     */
    public static function debug(string $message, array $context = []): void
    {
        self::log('debug', $message, $context);
    }

    /**
     * Log info message
     */
    public static function info(string $message, array $context = []): void
    {
        self::log('info', $message, $context);
    }

    /**
     * Log warning message
     */
    public static function warning(string $message, array $context = []): void
    {
        self::log('warning', $message, $context);
    }

    /**
     * Log error message
     */
    public static function error(string $message, array $context = []): void
    {
        self::log('error', $message, $context);
    }

    /**
     * Log critical message
     */
    public static function critical(string $message, array $context = []): void
    {
        self::log('critical', $message, $context);
    }
}
