<?php

declare(strict_types=1);

namespace Casino\Api\Controllers;

use Casino\Models\Bet;
use Casino\Models\User;
use Casino\Models\ProvablyFair;
use Casino\Api\Middleware\AuthMiddleware;
use Casino\Services\GameEngine;
use Casino\Services\RNG;
use Casino\Utils\Response;
use Casino\Utils\Logger;

class GameController
{
    /**
     * Place a bet
     */
    public function placeBet(): array
    {
        $userId = AuthMiddleware::userId();
        $input = $this->getJsonInput();

        // Validate input
        if (!isset($input['game'], $input['stake'], $input['mode'])) {
            Response::validationError([
                'game' => 'Game is required',
                'stake' => 'Stake is required',
                'mode' => 'Mode is required (demo, testnet, production)'
            ]);
        }

        $game = $input['game'];
        $stake = (float)$input['stake'];
        $mode = $input['mode'];
        $gameData = $input['game_data'] ?? [];
        $clientSeed = $input['client_seed'] ?? RNG::generateClientSeed();

        // Validate game type
        if (!in_array($game, ['slots', 'roulette', 'blackjack'])) {
            Response::error('Invalid game type', 400);
        }

        // Validate stake
        if ($stake <= 0) {
            Response::error('Stake must be greater than 0', 400);
        }

        // Check user balance
        $user = User::findById($userId);
        $currency = $mode === 'demo' ? 'demo' : 'nugget';
        $balanceField = $currency . '_balance';

        if ($user[$balanceField] < $stake) {
            Response::error('Insufficient balance', 400);
        }

        // Deduct stake from balance
        User::updateBalance($userId, $balanceField, -$stake);

        // Get active server seed hash
        $activeSeed = ProvablyFair::getActiveSeed();
        $serverSeedHash = $activeSeed ? $activeSeed['server_seed_hash'] : null;

        // Get house edge for game
        $houseEdge = $this->getHouseEdge($game);

        // Create bet
        $betId = Bet::create([
            'user_id' => $userId,
            'game' => $game,
            'mode' => $mode,
            'stake' => $stake,
            'currency' => $currency,
            'game_data' => $gameData,
            'client_seed' => $clientSeed,
            'server_seed_hash' => $serverSeedHash,
            'house_edge' => $houseEdge,
            'tx_hash' => $input['tx_hash'] ?? null,
            'chain' => $input['chain'] ?? null
        ]);

        Logger::info('Bet placed', [
            'bet_id' => $betId,
            'user_id' => $userId,
            'game' => $game,
            'stake' => $stake
        ]);

        return [
            'success' => true,
            'data' => [
                'bet_id' => $betId,
                'status' => 'pending',
                'client_seed' => $clientSeed,
                'server_seed_hash' => $serverSeedHash
            ]
        ];
    }

    /**
     * Resolve a bet
     */
    public function resolveBet(): array
    {
        $input = $this->getJsonInput();

        if (!isset($input['bet_id'])) {
            Response::validationError(['bet_id' => 'Bet ID is required']);
        }

        $betId = $input['bet_id'];

        try {
            $result = GameEngine::resolve($betId);

            return [
                'success' => true,
                'data' => $result
            ];
        } catch (\Exception $e) {
            Logger::error('Failed to resolve bet', [
                'bet_id' => $betId,
                'error' => $e->getMessage()
            ]);

            Response::error($e->getMessage(), 400);
            return [];
        }
    }

    /**
     * Get bet history
     */
    public function history(): array
    {
        $userId = AuthMiddleware::userId();
        $limit = (int)($_GET['limit'] ?? 50);
        $skip = (int)($_GET['skip'] ?? 0);

        $bets = Bet::getUserHistory($userId, $limit, $skip);

        return [
            'success' => true,
            'data' => [
                'bets' => $bets,
                'count' => count($bets)
            ]
        ];
    }

    /**
     * Get game configuration
     */
    public function config(): array
    {
        return [
            'success' => true,
            'data' => [
                'games' => [
                    'slots' => [
                        'name' => 'Slots',
                        'house_edge' => $this->getHouseEdge('slots'),
                        'min_bet' => 1,
                        'max_bet' => 1000
                    ],
                    'roulette' => [
                        'name' => 'Roulette',
                        'house_edge' => $this->getHouseEdge('roulette'),
                        'min_bet' => 1,
                        'max_bet' => 1000
                    ],
                    'blackjack' => [
                        'name' => 'Blackjack',
                        'house_edge' => $this->getHouseEdge('blackjack'),
                        'min_bet' => 1,
                        'max_bet' => 1000
                    ]
                ],
                'operating_mode' => $_ENV['OPERATING_MODE'] ?? 'demo'
            ]
        ];
    }

    /**
     * Get house edge for game
     */
    private function getHouseEdge(string $game): float
    {
        return match ($game) {
            'slots' => (float)($_ENV['HOUSE_EDGE_SLOTS'] ?? 5.0),
            'roulette' => (float)($_ENV['HOUSE_EDGE_ROULETTE'] ?? 2.7),
            'blackjack' => (float)($_ENV['HOUSE_EDGE_BLACKJACK'] ?? 0.5),
            default => 5.0
        };
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
