<?php

declare(strict_types=1);

namespace Casino\Api\Controllers;

use Casino\Models\Bet;
use Casino\Models\User;
use Casino\Models\ProvablyFair;
use Casino\Models\Nugget;
use Casino\Api\Middleware\AuthMiddleware;
use Casino\Services\PayrollService;
use Casino\Utils\Response;
use Casino\Utils\Logger;

class AdminController
{
    /**
     * List all bets with filters
     */
    public function listBets(): array
    {
        $filters = [
            'game' => $_GET['game'] ?? null,
            'mode' => $_GET['mode'] ?? null,
            'status' => $_GET['status'] ?? null,
            'user_id' => $_GET['user_id'] ?? null
        ];

        $limit = (int)($_GET['limit'] ?? 50);
        $skip = (int)($_GET['skip'] ?? 0);

        // Remove null filters
        $filters = array_filter($filters, fn($v) => $v !== null);

        $bets = Bet::getAll($filters, $limit, $skip);

        return [
            'success' => true,
            'data' => [
                'bets' => $bets,
                'count' => count($bets),
                'filters' => $filters
            ]
        ];
    }

    /**
     * Issue manual payout
     */
    public function issuePayout(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['user_id'], $input['amount'], $input['reason'])) {
            Response::validationError([
                'user_id' => 'User ID is required',
                'amount' => 'Amount is required',
                'reason' => 'Reason is required'
            ]);
        }

        $userId = $input['user_id'];
        $amount = (float)$input['amount'];
        $reason = $input['reason'];
        $currency = $input['currency'] ?? 'nugget';

        try {
            if ($currency === 'nugget') {
                Nugget::credit($userId, $amount, $reason, [
                    'issued_by' => AuthMiddleware::userId(),
                    'type' => 'manual_payout'
                ]);
            } else {
                $balanceField = $currency . '_balance';
                User::updateBalance($userId, $balanceField, $amount);
            }

            Logger::info('Manual payout issued', [
                'user_id' => $userId,
                'amount' => $amount,
                'currency' => $currency,
                'reason' => $reason,
                'issued_by' => AuthMiddleware::userId()
            ]);

            return [
                'success' => true,
                'message' => 'Payout issued successfully',
                'data' => [
                    'user_id' => $userId,
                    'amount' => $amount,
                    'currency' => $currency
                ]
            ];
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return [];
        }
    }

    /**
     * Commit server seed
     */
    public function commitSeed(): array
    {
        $input = $this->getJsonInput();

        // Generate random server seed if not provided
        $serverSeed = $input['server_seed'] ?? bin2hex(random_bytes(32));

        $seedId = ProvablyFair::commitSeed($serverSeed);

        Logger::info('Server seed committed', [
            'seed_id' => $seedId,
            'committed_by' => AuthMiddleware::userId()
        ]);

        $seed = ProvablyFair::getActiveSeed();

        return [
            'success' => true,
            'message' => 'Server seed committed successfully',
            'data' => $seed
        ];
    }

    /**
     * Reveal server seed
     */
    public function revealSeed(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['seed_id'])) {
            Response::validationError(['seed_id' => 'Seed ID is required']);
        }

        $seedId = $input['seed_id'];
        $success = ProvablyFair::revealSeed($seedId);

        if (!$success) {
            Response::error('Failed to reveal seed', 400);
        }

        Logger::info('Server seed revealed', [
            'seed_id' => $seedId,
            'revealed_by' => AuthMiddleware::userId()
        ]);

        return [
            'success' => true,
            'message' => 'Server seed revealed successfully'
        ];
    }

    /**
     * List all seeds
     */
    public function listSeeds(): array
    {
        $limit = (int)($_GET['limit'] ?? 50);
        $skip = (int)($_GET['skip'] ?? 0);

        $seeds = ProvablyFair::getAll($limit, $skip);

        return [
            'success' => true,
            'data' => [
                'seeds' => $seeds,
                'count' => count($seeds)
            ]
        ];
    }

    /**
     * List all users
     */
    public function listUsers(): array
    {
        $limit = (int)($_GET['limit'] ?? 50);
        $skip = (int)($_GET['skip'] ?? 0);

        $users = User::getAll($limit, $skip);

        return [
            'success' => true,
            'data' => [
                'users' => $users,
                'count' => count($users)
            ]
        ];
    }

    /**
     * Update house edge
     */
    public function updateHouseEdge(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['game'], $input['house_edge'])) {
            Response::validationError([
                'game' => 'Game is required',
                'house_edge' => 'House edge is required'
            ]);
        }

        $game = $input['game'];
        $houseEdge = (float)$input['house_edge'];

        // Validate game
        if (!in_array($game, ['slots', 'roulette', 'blackjack'])) {
            Response::error('Invalid game type', 400);
        }

        // Validate house edge (0-100%)
        if ($houseEdge < 0 || $houseEdge > 100) {
            Response::error('House edge must be between 0 and 100', 400);
        }

        // In a real application, this would update a configuration table
        // For now, we'll just log it
        Logger::info('House edge updated', [
            'game' => $game,
            'house_edge' => $houseEdge,
            'updated_by' => AuthMiddleware::userId()
        ]);

        return [
            'success' => true,
            'message' => 'House edge updated successfully',
            'data' => [
                'game' => $game,
                'house_edge' => $houseEdge
            ]
        ];
    }

    /**
     * Get statistics
     */
    public function getStats(): array
    {
        $game = $_GET['game'] ?? null;
        $mode = $_GET['mode'] ?? null;

        $filters = array_filter([
            'game' => $game,
            'mode' => $mode
        ], fn($v) => $v !== null);

        $stats = Bet::getStats($filters);

        // Add total supply of nuggets
        $nuggetSupply = Nugget::getTotalSupply();

        // Get suspicious activity
        $suspicious = $this->detectSuspiciousActivity();

        return [
            'success' => true,
            'data' => [
                'bets' => $stats,
                'nugget_supply' => $nuggetSupply,
                'suspicious_users' => $suspicious
            ]
        ];
    }

    /**
     * Run payroll
     */
    public function runPayroll(): array
    {
        $input = $this->getJsonInput();
        $type = $input['type'] ?? 'daily';

        try {
            if ($type === 'daily') {
                $result = PayrollService::runDailyPayroll(AuthMiddleware::userId());
            } elseif ($type === 'bonus') {
                if (!isset($input['user_ids'], $input['amount'])) {
                    Response::validationError([
                        'user_ids' => 'User IDs are required for bonus payroll',
                        'amount' => 'Amount is required for bonus payroll'
                    ]);
                }

                $result = PayrollService::runBonusPayroll(
                    $input['user_ids'],
                    (float)$input['amount'],
                    AuthMiddleware::userId()
                );
            } else {
                Response::error('Invalid payroll type', 400);
            }

            return [
                'success' => true,
                'message' => 'Payroll run completed',
                'data' => $result
            ];
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
            return [];
        }
    }

    /**
     * Detect suspicious activity (simple heuristic)
     */
    private function detectSuspiciousActivity(): array
    {
        // This is a simple detection based on win rates
        // In production, use more sophisticated ML/heuristics

        $users = User::getAll(1000);
        $suspicious = [];

        foreach ($users as $user) {
            $bets = Bet::getUserHistory($user['id'], 100);

            if (count($bets) < 10) {
                continue;
            }

            $wins = array_filter($bets, fn($bet) => ($bet['payout'] ?? 0) > $bet['stake']);
            $winRate = count($wins) / count($bets);

            // Flag users with >70% win rate (suspiciously high)
            if ($winRate > 0.7) {
                $suspicious[] = [
                    'user_id' => $user['id'],
                    'win_rate' => $winRate,
                    'total_bets' => count($bets),
                    'reason' => 'Abnormally high win rate'
                ];
            }
        }

        return $suspicious;
    }

    /**
     * Get JSON input
     */
    private function getJsonInput(): array
    {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        return $data ?? [];
    }
}
