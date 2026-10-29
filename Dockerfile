FROM php:8.3-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev postgresql-client curl \
    && docker-php-ext-install pdo_mysql pdo_pgsql \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html \
    && printf '<Directory /var/www/html/>\n    AllowOverride All\n    Options FollowSymLinks\n    Require all granted\n</Directory>\n' > /etc/apache2/conf-available/eduroom.conf \
    && a2enconf eduroom

COPY docker-entrypoint.sh /usr/local/bin/eduroom-entrypoint
RUN chmod +x /usr/local/bin/eduroom-entrypoint

ENV APP_ENV=production
ENV SESSION_COOKIE_SECURE=1
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS http://localhost/api/health.php >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/eduroom-entrypoint"]
CMD ["apache2-foreground"]
