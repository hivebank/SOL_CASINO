<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Casino\Models\User;
use Casino\Models\ProvablyFair;
use Casino\Models\Database;
use Dotenv\Dotenv;

// Load environment
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

echo "Starting database seeding...\n\n";

try {
    // Initialize database connection
    $db = Database::getInstance();
    echo "✓ Connected to MongoDB\n";

    // Create indexes
    echo "\nCreating indexes...\n";

    $db->selectCollection('users')->createIndex(['wallets.address' => 1], ['unique' => true, 'sparse' => true]);
    $db->selectCollection('users')->createIndex(['email' => 1], ['unique' => true, 'sparse' => true]);
    $db->selectCollection('bets')->createIndex(['user_id' => 1]);
    $db->selectCollection('bets')->createIndex(['status' => 1]);
    $db->selectCollection('bets')->createIndex(['created_at' => -1]);
    $db->selectCollection('nugget_transactions')->createIndex(['user_id' => 1]);
    $db->selectCollection('provably_fair_seeds')->createIndex(['is_active' => 1]);

    echo "✓ Indexes created\n";

    // Create admin user
    echo "\nCreating admin user...\n";

    $adminEmail = $_ENV['ADMIN_EMAIL'] ?? 'admin@casino.local';
    $adminPassword = $_ENV['ADMIN_PASSWORD'] ?? 'Admin123!@#';

    $existingAdmin = User::findByEmail($adminEmail);

    if (!$existingAdmin) {
        $adminId = User::create([
            'email' => $adminEmail,
            'password_hash' => password_hash($adminPassword, PASSWORD_BCRYPT, ['cost' => 12]),
            'role' => 'admin',
            'demo_balance' => 100000,
            'nugget_balance' => 10000
        ]);

        echo "✓ Admin user created\n";
        echo "  Email: $adminEmail\n";
        echo "  Password: $adminPassword\n";
        echo "  ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!\n";
    } else {
        echo "✓ Admin user already exists\n";
        $adminId = $existingAdmin['id'];
    }

    // Create demo users
    echo "\nCreating demo users...\n";

    $demoWallets = [
        ['address' => 'DemoSolWallet1' . bin2hex(random_bytes(16)), 'chain' => 'solana'],
        ['address' => 'DemoSolWallet2' . bin2hex(random_bytes(16)), 'chain' => 'solana'],
        ['address' => '0xDemo' . bin2hex(random_bytes(20)), 'chain' => 'ethereum'],
    ];

    foreach ($demoWallets as $idx => $wallet) {
        $existing = User::findByWallet($wallet['address']);

        if (!$existing) {
            User::create([
                'wallets' => [$wallet],
                'role' => 'user',
                'demo_balance' => 5000,
                'nugget_balance' => 500
            ]);
            echo "✓ Demo user " . ($idx + 1) . " created (chain: {$wallet['chain']})\n";
        }
    }

    // Create initial provably fair seed
    echo "\nCreating initial server seed...\n";

    $activeSeed = ProvablyFair::getActiveSeed();

    if (!$activeSeed) {
        $serverSeed = bin2hex(random_bytes(32));
        $seedId = ProvablyFair::commitSeed($serverSeed);
        echo "✓ Initial server seed committed\n";
        echo "  Seed ID: $seedId\n";
        echo "  Hash: " . hash('sha256', $serverSeed) . "\n";
    } else {
        echo "✓ Active server seed already exists\n";
    }

    echo "\n✓ Database seeding completed successfully!\n";
    echo "\nYou can now start the application and log in with:\n";
    echo "  Email: $adminEmail\n";
    echo "  Password: $adminPassword\n";
    echo "\nOr connect with a wallet using the demo mode.\n";

} catch (Exception $e) {
    echo "\n✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
