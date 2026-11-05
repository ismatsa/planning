<?php
declare(strict_types=1);
namespace PT;

use PDO;

final class HttpError extends \Exception
{
    public function __construct(public int $status, string $message, public mixed $details = null)
    {
        parent::__construct($message);
    }
}

function env(string $k, ?string $default = null): string
{
    static $vars = null;
    if ($vars === null) {
        $vars = [];
        $file = dirname(__DIR__) . '/.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if ($line[0] === '#' || !str_contains($line, '=')) continue;
                [$key, $val] = explode('=', $line, 2);
                $vars[trim($key)] = trim($val);
            }
        }
    }
    $v = $vars[$k] ?? getenv($k);
    if ($v === false || $v === null) {
        if ($default === null) throw new \RuntimeException("Missing config $k");
        return $default;
    }
    return (string)$v;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . env('DB_HOST') . ';dbname=' . env('DB_NAME') . ';charset=utf8mb4',
            env('DB_USER'),
            env('DB_PASS'),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false],
        );
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

function q(string $sql, array $params = []): \PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function one(string $sql, array $params = []): ?array
{
    $r = q($sql, $params)->fetch();
    return $r === false ? null : $r;
}

function all(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

function tx(callable $fn): mixed
{
    db()->beginTransaction();
    try {
        $r = $fn();
        db()->commit();
        return $r;
    } catch (\Throwable $e) {
        db()->rollBack();
        throw $e;
    }
}

function setting(string $k): string
{
    return (string)(one('SELECT v FROM settings WHERE k = ?', [$k])['v'] ?? '');
}

function set_setting(string $k, string $v): void
{
    q('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [$k, $v]);
}

function audit(?int $userId, string $action, string $type, ?string $id, string $details = ''): void
{
    q('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
        [$userId, $action, $type, $id, mb_substr($details, 0, 500)]);
}

function uuid(): string
{
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

/** "2026-11-05 14:30:00" (UTC) -> "2026-11-05T14:30:00Z" */
function iso(?string $mysql): ?string
{
    return $mysql ? str_replace(' ', 'T', $mysql) . 'Z' : null;
}

/** ISO 8601 entrant -> "Y-m-d H:i:s" UTC pour MySQL. */
function mysql_dt(?string $iso): ?string
{
    if ($iso === null || trim($iso) === '') return null;
    $t = strtotime($iso);
    if ($t === false) throw new HttpError(422, 'Date invalide : ' . $iso);
    return gmdate('Y-m-d H:i:s', $t);
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $d = json_decode($raw, true);
    if (!is_array($d)) throw new HttpError(400, 'JSON invalide.');
    return $d;
}

function str_or_null(mixed $v, int $max = 500): ?string
{
    if ($v === null) return null;
    $s = trim((string)$v);
    return $s === '' ? null : mb_substr($s, 0, $max);
}
