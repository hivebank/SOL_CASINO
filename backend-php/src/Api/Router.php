<?php

declare(strict_types=1);

namespace Casino\Api;

use Casino\Api\Controllers\AuthController;
use Casino\Api\Controllers\UserController;
use Casino\Api\Controllers\GameController;
use Casino\Api\Controllers\AdminController;
use Casino\Api\Middleware\AuthMiddleware;
use Casino\Api\Middleware\RateLimitMiddleware;
use Casino\Utils\Response;

class Router
{
    private array $routes = [];
    private array $middlewares = [];

    public function __construct()
    {
        $this->registerRoutes();
    }

    /**
     * Register all application routes
     */
    private function registerRoutes(): void
    {
        // Health check
        $this->get('/health', fn() => ['status' => 'ok', 'timestamp' => time()]);

        // Authentication routes
        $this->post('/api/v1/auth/nonce', [AuthController::class, 'nonce']);
        $this->post('/api/v1/auth/login', [AuthController::class, 'login']);

        // User routes (require authentication)
        $this->get('/api/v1/user/me', [UserController::class, 'me'], ['auth']);
        $this->post('/api/v1/topup/demo', [UserController::class, 'topupDemo'], ['auth', 'rate:demo_topup']);
        $this->post('/api/v1/topup/testnet-request', [UserController::class, 'testnetRequest'], ['auth']);

        // Game routes
        $this->post('/api/v1/game/bet', [GameController::class, 'placeBet'], ['auth', 'rate:bet']);
        $this->post('/api/v1/game/resolve', [GameController::class, 'resolveBet'], ['auth']);
        $this->get('/api/v1/game/history', [GameController::class, 'history'], ['auth']);
        $this->get('/api/v1/game/config', [GameController::class, 'config']);

        // Admin routes (require authentication and admin role)
        $this->get('/api/v1/admin/bets', [AdminController::class, 'listBets'], ['auth', 'admin']);
        $this->post('/api/v1/admin/payout', [AdminController::class, 'issuePayout'], ['auth', 'admin']);
        $this->post('/api/v1/admin/seed/commit', [AdminController::class, 'commitSeed'], ['auth', 'admin']);
        $this->post('/api/v1/admin/seed/reveal', [AdminController::class, 'revealSeed'], ['auth', 'admin']);
        $this->get('/api/v1/admin/seeds', [AdminController::class, 'listSeeds'], ['auth', 'admin']);
        $this->get('/api/v1/admin/users', [AdminController::class, 'listUsers'], ['auth', 'admin']);
        $this->put('/api/v1/admin/house-edge', [AdminController::class, 'updateHouseEdge'], ['auth', 'admin']);
        $this->get('/api/v1/admin/stats', [AdminController::class, 'getStats'], ['auth', 'admin']);
        $this->post('/api/v1/admin/payroll/run', [AdminController::class, 'runPayroll'], ['auth', 'admin']);
    }

    /**
     * Add GET route
     */
    private function get(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    /**
     * Add POST route
     */
    private function post(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    /**
     * Add PUT route
     */
    private function put(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middlewares);
    }

    /**
     * Add DELETE route
     */
    private function delete(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }

    /**
     * Add route to routes array
     */
    private function addRoute(string $method, string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    /**
     * Route the incoming request
     */
    public function route(string $method, string $path): array
    {
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $this->matchPath($route['path'], $path, $params)) {
                // Apply middlewares
                foreach ($route['middlewares'] as $middleware) {
                    $this->applyMiddleware($middleware);
                }

                // Execute handler
                return $this->executeHandler($route['handler'], $params);
            }
        }

        Response::notFound('Endpoint not found');
        return [];
    }

    /**
     * Match path with route pattern
     */
    private function matchPath(string $pattern, string $path, &$params = []): bool
    {
        // Exact match
        if ($pattern === $path) {
            return true;
        }

        // Pattern matching with parameters
        $patternRegex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $patternRegex = '#^' . $patternRegex . '$#';

        if (preg_match($patternRegex, $path, $matches)) {
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            return true;
        }

        return false;
    }

    /**
     * Apply middleware
     */
    private function applyMiddleware(string $middleware): void
    {
        if ($middleware === 'auth') {
            AuthMiddleware::handle();
        } elseif ($middleware === 'admin') {
            AuthMiddleware::requireAdmin();
        } elseif (str_starts_with($middleware, 'rate:')) {
            $type = substr($middleware, 5);
            RateLimitMiddleware::handle($type);
        }
    }

    /**
     * Execute route handler
     */
    private function executeHandler(callable|array $handler, array $params = []): array
    {
        if (is_callable($handler)) {
            $result = $handler($params);
        } elseif (is_array($handler) && count($handler) === 2) {
            [$class, $method] = $handler;
            $controller = new $class();
            $result = $controller->$method();
        } else {
            throw new \RuntimeException('Invalid handler');
        }

        // Ensure result is an array
        if (!is_array($result)) {
            $result = ['data' => $result];
        }

        return $result;
    }
}
