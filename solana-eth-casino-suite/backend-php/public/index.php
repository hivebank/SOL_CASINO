<?php

declare(strict_types=1);

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Start output buffering
ob_start();

// Load Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use Casino\Api\Router;
use Casino\Utils\Response;
use Casino\Utils\Logger;
use Dotenv\Dotenv;

try {
    // Load environment variables
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();

    // Set error handling based on environment
    if ($_ENV['APP_ENV'] === 'production') {
        ini_set('display_errors', '0');
    }

    // Handle CORS preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // Initialize router
    $router = new Router();

    // Get request method and path
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Route the request
    $response = $router->route($method, $path);

    // Send response
    Response::send($response);
} catch (Throwable $e) {
    // Log the error
    Logger::error('Application error', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);

    // Send error response
    $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    Response::send([
        'success' => false,
        'error' => $_ENV['APP_DEBUG'] === 'true' ? $e->getMessage() : 'Internal server error',
        'trace' => $_ENV['APP_DEBUG'] === 'true' ? $e->getTraceAsString() : null
    ], $statusCode);
}

ob_end_flush();
