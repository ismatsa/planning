<?php
declare(strict_types=1);
namespace PT;

const COOKIE = 'pt_session';

function current_user(): ?array
{
    static $cache = false;
    if ($cache !== false) return $cache;
    $token = $_COOKIE[COOKIE] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) return $cache = null;
    $row = one('SELECT s.csrf, u.* FROM sessions s JOIN users u ON u.id = s.user_id
                WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = 1', [hash('sha256', $token)]);
    return $cache = $row;
}

function require_user(): array
{
    $u = current_user();
    if (!$u) throw new HttpError(401, 'Session expirée.');
    return $u;
}

function require_admin(): array
{
    $u = require_user();
    if ($u['role'] !== 'admin') throw new HttpError(403, 'Accès réservé à l\'administrateur.');
    return $u;
}

function check_csrf(): void
{
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) return;
    $u = current_user();
    if (!$u) return; // login itself
    if (!hash_equals($u['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new HttpError(403, 'Jeton CSRF invalide.');
}

function public_user(array $u): array
{
    return ['id' => (int)$u['id'], 'name' => $u['name'], 'login' => $u['login'], 'role' => $u['role'],
        'company' => $u['company'], 'is_active' => (bool)$u['is_active'], 'created_at' => iso($u['created_at'])];
}

function login(string $login, string $password): array
{
    $login = strtolower(trim($login));
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $fails = (int)one('SELECT COUNT(*) c FROM login_attempts WHERE (login = ? OR ip = ?) AND attempted_at > UTC_TIMESTAMP() - INTERVAL 15 MINUTE', [$login, $ip])['c'];
    if ($fails >= 8) throw new HttpError(429, 'Trop de tentatives. Réessayez dans 15 minutes.');

    $u = one('SELECT * FROM users WHERE login = ?', [$login]);
    if (!$u || !password_verify($password, $u['password_hash'])) {
        q('INSERT INTO login_attempts (login, ip) VALUES (?, ?)', [$login, $ip]);
        throw new HttpError(401, 'Identifiants incorrects.');
    }
    if (!$u['is_active']) throw new HttpError(403, 'Compte désactivé.');
    if (password_needs_rehash($u['password_hash'], PASSWORD_ARGON2ID)) {
        q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_ARGON2ID), $u['id']]);
    }
    q('DELETE FROM login_attempts WHERE login = ?', [$login]);

    $token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(32));
    $days = (int)env('SESSION_DAYS', '30');
    q('INSERT INTO sessions (id, user_id, csrf, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP() + INTERVAL ? DAY)',
        [hash('sha256', $token), $u['id'], $csrf, $days]);
    setcookie(COOKIE, $token, ['expires' => time() + $days * 86400, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    audit((int)$u['id'], 'login', 'user', (string)$u['id']);
    return ['user' => public_user($u), 'csrf' => $csrf];
}

function logout(): void
{
    $token = $_COOKIE[COOKIE] ?? '';
    if ($token) q('DELETE FROM sessions WHERE id = ?', [hash('sha256', $token)]);
    setcookie(COOKIE, '', ['expires' => 1, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
}
