<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Casino\Services\PayrollService;
use Dotenv\Dotenv;

// Load environment
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

echo "Starting payroll job...\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

try {
    $result = PayrollService::runDailyPayroll('cron');

    echo "✓ Payroll completed successfully!\n\n";
    echo "Run ID: {$result['run_id']}\n";
    echo "Users paid: {$result['users_paid']}\n";
    echo "Amount per user: {$result['amount_per_user']}\n";
    echo "Total amount: {$result['total_amount']}\n";

    exit(0);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
