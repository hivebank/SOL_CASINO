#!/bin/bash
set -e

echo "🚀 Starting Solana-ETH Casino Suite..."

# Environment variables with defaults
export PORT="${PORT:-8080}"
export MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-casino_db}"
export JWT_SECRET="${JWT_SECRET:-your-secret-key-change-this}"
export MODE="${MODE:-demo}"

echo "📦 Installing dependencies..."
cd backend-php
composer install --no-dev --optimize-autoloader

echo "🔧 Configuring Apache..."
# Create Apache configuration
cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:${PORT}>
    ServerAdmin webmaster@localhost
    DocumentRoot /app/backend-php/public

    <Directory /app/backend-php/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Enable mod_rewrite
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ index.php [L]
        </IfModule>
    </Directory>

    # Serve frontend static files
    Alias /games /app/frontend/games
    Alias /lobby /app/frontend/lobby
    Alias /public /app/frontend/public

    <Directory /app/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Update Apache ports configuration
echo "Listen ${PORT}" > /etc/apache2/ports.conf

# Enable required Apache modules
a2enmod rewrite
a2enmod headers
a2enmod expires

echo "🌐 Starting Apache on port ${PORT}..."
# Start Apache in foreground
apachectl -D FOREGROUND
