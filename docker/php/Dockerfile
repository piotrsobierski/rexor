FROM php:8.5-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite headers expires

COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html
