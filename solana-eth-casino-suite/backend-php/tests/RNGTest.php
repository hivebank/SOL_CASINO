<?php

declare(strict_types=1);

namespace Casino\Tests;

use PHPUnit\Framework\TestCase;
use Casino\Services\RNG;

class RNGTest extends TestCase
{
    /**
     * Test RNG generates consistent results with same inputs
     */
    public function testDeterministicRNG(): void
    {
        $serverSeed = 'test_server_seed_123';
        $clientSeed = 'test_client_seed_456';
        $betId = 'test_bet_001';

        // Mock ProvablyFair to return our test seed
        $this->markTestSkipped('Requires database connection');

        // In a real test environment with test database:
        // $result1 = RNG::generate($clientSeed, $betId, 0, 36);
        // $result2 = RNG::generate($clientSeed, $betId, 0, 36);
        // $this->assertEquals($result1, $result2);
    }

    /**
     * Test RNG generates different results with different inputs
     */
    public function testRandomnessWithDifferentInputs(): void
    {
        $this->markTestSkipped('Requires database connection');

        // Test that different client seeds produce different results
        // Test that different bet IDs produce different results
    }

    /**
     * Test RNG generates results within range
     */
    public function testRangeConstraints(): void
    {
        $this->markTestSkipped('Requires database connection');

        // Test that results are always within min/max range
    }

    /**
     * Test verification function
     */
    public function testVerification(): void
    {
        $serverSeed = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        $clientSeed = 'test_client_seed';
        $betId = 'bet_123';
        $min = 0;
        $max = 36;

        // Calculate expected result
        $message = $clientSeed . '||' . $betId;
        $hmac = hash_hmac('sha256', $message, $serverSeed, true);

        $randomInt = 0;
        for ($i = 0; $i < 8; $i++) {
            $randomInt = ($randomInt << 8) | ord($hmac[$i]);
        }

        $range = $max - $min + 1;
        $expectedResult = $min + ($randomInt % $range);

        // Verify
        $isValid = RNG::verify($serverSeed, $clientSeed, $betId, $min, $max, $expectedResult);

        $this->assertTrue($isValid, 'RNG verification should succeed with correct inputs');
    }
}
