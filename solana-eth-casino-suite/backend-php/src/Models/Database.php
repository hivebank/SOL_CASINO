<?php

declare(strict_types=1);

namespace Casino\Models;

use MongoDB\Client;
use MongoDB\Database as MongoDatabase;

class Database
{
    private static ?MongoDatabase $db = null;

    /**
     * Get database instance
     */
    public static function getInstance(): MongoDatabase
    {
        if (self::$db === null) {
            $client = new Client($_ENV['MONGO_URI']);
            $dbName = $_ENV['MONGO_DATABASE'] ?? 'casino';
            self::$db = $client->selectDatabase($dbName);
        }

        return self::$db;
    }

    /**
     * Get collection
     */
    public static function collection(string $name)
    {
        return self::getInstance()->selectCollection($name);
    }
}
