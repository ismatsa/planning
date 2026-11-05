<?php
declare(strict_types=1);
// Usage: php cli/create-admin.php "Nom complet" login "mot de passe"
namespace PT;

require dirname(__DIR__) . '/src/bootstrap.php';

[, $name, $login, $password] = $argv + [null, null, null, null];
if (!$name || !$login || strlen((string)$password) < 8) {
    fwrite(STDERR, "Usage: php cli/create-admin.php \"Nom\" login motdepasse(8+)\n");
    exit(1);
}
q("INSERT INTO users (name, login, password_hash, role) VALUES (?, ?, ?, 'admin')", [$name, strtolower($login), password_hash($password, PASSWORD_ARGON2ID)]);
echo "Administrateur créé.\n";
