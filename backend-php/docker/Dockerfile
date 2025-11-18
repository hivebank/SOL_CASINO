FROM php:8.3-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libzip-dev \
    libssl-dev \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install zip
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Enable Apache modules
RUN a2enmod rewrite headers

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Create necessary directories
RUN mkdir -p logs storage && \
    chmod -R 777 logs storage

# Configure Apache
RUN sed -i 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf

# Add security headers to Apache config
RUN echo '<IfModule mod_headers.c>\n\
    Header set X-Content-Type-Options "nosniff"\n\
    Header set X-Frame-Options "SAMEORIGIN"\n\
    Header set X-XSS-Protection "1; mode=block"\n\
    Header set Referrer-Policy "strict-origin-when-cross-origin"\n\
</IfModule>' >> /etc/apache2/apache2.conf

# Expose port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
