<?php

declare(strict_types=1);

namespace Casino\Services;

use Casino\Models\User;
use Casino\Models\Nugget;
use Casino\Models\Payroll;
use Casino\Models\Bet;
use Casino\Utils\Logger;

class PayrollService
{
    /**
     * Run daily payroll
     */
    public static function runDailyPayroll(string $executedBy = 'system'): array
    {
        if (!self::isPayrollEnabled()) {
            throw new \RuntimeException('Payroll is disabled');
        }

        $amountPerUser = (float)($_ENV['PAYROLL_DAILY_AMOUNT'] ?? 100);
        $minActivityThreshold = (int)($_ENV['PAYROLL_MIN_ACTIVITY_THRESHOLD'] ?? 5);

        // Get eligible users (active users with minimum activity)
        $eligibleUsers = self::getEligibleUsers($minActivityThreshold);

        $totalAmount = 0;
        $usersPaid = 0;

        foreach ($eligibleUsers as $userId) {
            try {
                Nugget::credit($userId, $amountPerUser, 'daily_payroll', [
                    'type' => 'daily',
                    'date' => date('Y-m-d')
                ]);

                $totalAmount += $amountPerUser;
                $usersPaid++;

                Logger::debug('Payroll credited', [
                    'user_id' => $userId,
                    'amount' => $amountPerUser
                ]);
            } catch (\Exception $e) {
                Logger::error('Failed to credit payroll', [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Record payroll run
        $runId = Payroll::createRun([
            'type' => 'daily',
            'amount_per_user' => $amountPerUser,
            'eligible_users' => $eligibleUsers,
            'total_amount' => $totalAmount,
            'users_paid' => $usersPaid,
            'executed_by' => $executedBy
        ]);

        Logger::info('Payroll run completed', [
            'run_id' => $runId,
            'users_paid' => $usersPaid,
            'total_amount' => $totalAmount
        ]);

        return [
            'run_id' => $runId,
            'users_paid' => $usersPaid,
            'total_amount' => $totalAmount,
            'amount_per_user' => $amountPerUser
        ];
    }

    /**
     * Run bonus payroll
     */
    public static function runBonusPayroll(array $userIds, float $amount, string $executedBy): array
    {
        $totalAmount = 0;
        $usersPaid = 0;

        foreach ($userIds as $userId) {
            try {
                Nugget::credit($userId, $amount, 'bonus_payroll', [
                    'type' => 'bonus',
                    'date' => date('Y-m-d')
                ]);

                $totalAmount += $amount;
                $usersPaid++;
            } catch (\Exception $e) {
                Logger::error('Failed to credit bonus', [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Record payroll run
        $runId = Payroll::createRun([
            'type' => 'bonus',
            'amount_per_user' => $amount,
            'eligible_users' => $userIds,
            'total_amount' => $totalAmount,
            'users_paid' => $usersPaid,
            'executed_by' => $executedBy
        ]);

        return [
            'run_id' => $runId,
            'users_paid' => $usersPaid,
            'total_amount' => $totalAmount,
            'amount_per_user' => $amount
        ];
    }

    /**
     * Get eligible users for payroll
     */
    private static function getEligibleUsers(int $minActivityThreshold): array
    {
        $users = User::getAll(1000);
        $eligible = [];

        $yesterday = strtotime('-1 day');

        foreach ($users as $user) {
            if (!$user['is_active']) {
                continue;
            }

            // Count recent bets
            $recentBets = Bet::getUserHistory($user['id'], 100);
            $activeBets = array_filter($recentBets, function ($bet) use ($yesterday) {
                return strtotime($bet['created_at']) >= $yesterday;
            });

            if (count($activeBets) >= $minActivityThreshold) {
                $eligible[] = $user['id'];
            }
        }

        return $eligible;
    }

    /**
     * Check if payroll is enabled
     */
    private static function isPayrollEnabled(): bool
    {
        return filter_var($_ENV['PAYROLL_ENABLED'] ?? true, FILTER_VALIDATE_BOOLEAN);
    }
}
