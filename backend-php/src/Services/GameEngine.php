<?php

declare(strict_types=1);

namespace Casino\Services;

use Casino\Models\Bet;
use Casino\Models\User;
use Casino\Utils\Logger;

class GameEngine
{
    /**
     * Resolve a bet
     */
    public static function resolve(string $betId): array
    {
        $bet = Bet::findById($betId);

        if (!$bet) {
            throw new \RuntimeException('Bet not found');
        }

        if ($bet['status'] !== 'pending') {
            throw new \RuntimeException('Bet already resolved');
        }

        // Resolve based on game type
        $result = match ($bet['game']) {
            'slots' => self::resolveSlots($bet),
            'roulette' => self::resolveRoulette($bet),
            'blackjack' => self::resolveBlackjack($bet),
            default => throw new \RuntimeException('Unknown game type')
        };

        // Calculate payout
        $payout = $result['multiplier'] * $bet['stake'];

        // Update bet
        Bet::resolve($betId, $result['outcome'], $payout, $result['multiplier']);

        // Credit user if they won
        if ($payout > 0) {
            $balanceField = $bet['currency'] === 'demo' ? 'demo_balance' : 'nugget_balance';
            User::updateBalance($bet['user_id'], $balanceField, $payout);
        }

        Logger::info('Bet resolved', [
            'bet_id' => $betId,
            'game' => $bet['game'],
            'multiplier' => $result['multiplier'],
            'payout' => $payout
        ]);

        return [
            'bet_id' => $betId,
            'outcome' => $result['outcome'],
            'payout' => $payout,
            'multiplier' => $result['multiplier']
        ];
    }

    /**
     * Resolve slots bet
     */
    private static function resolveSlots(array $bet): array
    {
        $clientSeed = $bet['client_seed'] ?? RNG::generateClientSeed();
        $reels = $bet['game_data']['reels'] ?? 5;
        $symbols = $bet['game_data']['symbols'] ?? 10;

        // Generate reel results
        $results = RNG::generateMultiple($clientSeed, $bet['id'], $reels, 0, $symbols - 1);

        // Check for wins
        $multiplier = self::calculateSlotsMultiplier($results, $bet['house_edge']);

        return [
            'outcome' => [
                'reels' => $results,
                'paylines' => self::calculatePaylines($results)
            ],
            'multiplier' => $multiplier
        ];
    }

    /**
     * Calculate slots multiplier
     */
    private static function calculateSlotsMultiplier(array $results, float $houseEdge): float
    {
        // Count matching symbols
        $counts = array_count_values($results);
        $maxCount = max($counts);

        // Base multipliers
        $multipliers = [
            5 => 100,
            4 => 20,
            3 => 5,
            2 => 0
        ];

        $baseMultiplier = $multipliers[$maxCount] ?? 0;

        // Apply house edge reduction
        return $baseMultiplier * (1 - ($houseEdge / 100));
    }

    /**
     * Calculate paylines
     */
    private static function calculatePaylines(array $results): array
    {
        $paylines = [];

        // Simple payline: all matching
        $counts = array_count_values($results);
        foreach ($counts as $symbol => $count) {
            if ($count >= 3) {
                $paylines[] = [
                    'symbol' => $symbol,
                    'count' => $count,
                    'positions' => array_keys($results, $symbol)
                ];
            }
        }

        return $paylines;
    }

    /**
     * Resolve roulette bet
     */
    private static function resolveRoulette(array $bet): array
    {
        $clientSeed = $bet['client_seed'] ?? RNG::generateClientSeed();

        // European roulette: 0-36
        $winningNumber = RNG::generate($clientSeed, $bet['id'], 0, 36);

        $betType = $bet['game_data']['bet_type'] ?? 'straight';
        $betValues = $bet['game_data']['bet_values'] ?? [];

        $multiplier = self::calculateRouletteMultiplier($winningNumber, $betType, $betValues, $bet['house_edge']);

        return [
            'outcome' => [
                'winning_number' => $winningNumber,
                'color' => self::getRouletteColor($winningNumber),
                'is_even' => $winningNumber > 0 && $winningNumber % 2 === 0,
                'dozen' => $winningNumber > 0 ? (int)ceil($winningNumber / 12) : 0,
                'column' => $winningNumber > 0 ? (($winningNumber - 1) % 3) + 1 : 0
            ],
            'multiplier' => $multiplier
        ];
    }

    /**
     * Calculate roulette multiplier
     */
    private static function calculateRouletteMultiplier(
        int $winningNumber,
        string $betType,
        array $betValues,
        float $houseEdge
    ): float {
        $won = false;

        switch ($betType) {
            case 'straight':
                $won = in_array($winningNumber, $betValues);
                $baseMultiplier = 35;
                break;
            case 'split':
                $won = in_array($winningNumber, $betValues);
                $baseMultiplier = 17;
                break;
            case 'red':
            case 'black':
                $won = self::getRouletteColor($winningNumber) === $betType;
                $baseMultiplier = 1;
                break;
            case 'even':
            case 'odd':
                $won = $winningNumber > 0 && (
                    ($betType === 'even' && $winningNumber % 2 === 0) ||
                    ($betType === 'odd' && $winningNumber % 2 === 1)
                );
                $baseMultiplier = 1;
                break;
            case 'dozen':
            case 'column':
                $won = in_array($winningNumber, $betValues);
                $baseMultiplier = 2;
                break;
            default:
                $baseMultiplier = 0;
        }

        if (!$won) {
            return 0;
        }

        return $baseMultiplier * (1 - ($houseEdge / 100));
    }

    /**
     * Get roulette color
     */
    private static function getRouletteColor(int $number): string
    {
        if ($number === 0) {
            return 'green';
        }

        $redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        return in_array($number, $redNumbers) ? 'red' : 'black';
    }

    /**
     * Resolve blackjack bet
     */
    private static function resolveBlackjack(array $bet): array
    {
        $clientSeed = $bet['client_seed'] ?? RNG::generateClientSeed();

        // Deal cards (simplified)
        $playerCards = RNG::generateMultiple($clientSeed, $bet['id'] . '_player', 2, 1, 13);
        $dealerCards = RNG::generateMultiple($clientSeed, $bet['id'] . '_dealer', 2, 1, 13);

        $playerTotal = self::calculateBlackjackTotal($playerCards);
        $dealerTotal = self::calculateBlackjackTotal($dealerCards);

        // Dealer hits on 16 or less
        $cardIndex = 2;
        while ($dealerTotal < 17) {
            $newCard = RNG::generate($clientSeed, $bet['id'] . '_dealer_' . $cardIndex, 1, 13);
            $dealerCards[] = $newCard;
            $dealerTotal = self::calculateBlackjackTotal($dealerCards);
            $cardIndex++;
        }

        // Determine winner
        $multiplier = self::calculateBlackjackMultiplier($playerTotal, $dealerTotal, $bet['house_edge']);

        return [
            'outcome' => [
                'player_cards' => $playerCards,
                'player_total' => $playerTotal,
                'dealer_cards' => $dealerCards,
                'dealer_total' => $dealerTotal,
                'result' => $multiplier > 1 ? 'win' : ($multiplier === 1 ? 'push' : 'lose')
            ],
            'multiplier' => $multiplier
        ];
    }

    /**
     * Calculate blackjack hand total
     */
    private static function calculateBlackjackTotal(array $cards): int
    {
        $total = 0;
        $aces = 0;

        foreach ($cards as $card) {
            if ($card === 1) {
                $aces++;
                $total += 11;
            } elseif ($card >= 10) {
                $total += 10;
            } else {
                $total += $card;
            }
        }

        // Adjust for aces
        while ($total > 21 && $aces > 0) {
            $total -= 10;
            $aces--;
        }

        return $total;
    }

    /**
     * Calculate blackjack multiplier
     */
    private static function calculateBlackjackMultiplier(int $playerTotal, int $dealerTotal, float $houseEdge): float
    {
        // Player busts
        if ($playerTotal > 21) {
            return 0;
        }

        // Dealer busts
        if ($dealerTotal > 21) {
            return 2 * (1 - ($houseEdge / 100));
        }

        // Player wins
        if ($playerTotal > $dealerTotal) {
            // Blackjack pays 3:2
            if ($playerTotal === 21) {
                return 2.5 * (1 - ($houseEdge / 100));
            }
            return 2 * (1 - ($houseEdge / 100));
        }

        // Push
        if ($playerTotal === $dealerTotal) {
            return 1; // Return stake
        }

        // Dealer wins
        return 0;
    }
}
