<?php
declare(strict_types=1);
namespace PT;

// API machine-à-machine pour l'application SYNC (même serveur).
// Indépendante des sessions/CSRF : IP locale + clé SYNC_API_KEY obligatoires.

function sync_deny(): never
{
    json_out(['error' => 'Accès non autorisé'], 403);
}

function sync_guard(): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $allowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    if (!empty($_SERVER['SERVER_ADDR'])) $allowed[] = $_SERVER['SERVER_ADDR'];
    foreach (explode(',', env('SYNC_ALLOWED_IPS', '')) as $extra) {
        if (trim($extra) !== '') $allowed[] = trim($extra);
    }
    if (!in_array($ip, $allowed, true)) sync_deny();

    $expected = env('SYNC_API_KEY', '');
    if (strlen($expected) < 32) sync_deny(); // clé absente ou trop faible : API désactivée
    $given = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($given === '') {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) $given = trim($m[1]);
    }
    if ($given === '' || !hash_equals($expected, $given)) sync_deny();
}

/** Accepte "66266 | ط | 1", "66266-1-ط", "66266-ط-1", "12345-A-6". */
function sync_plate(mixed $value): ?string
{
    $plate = str_or_null($value, 40);
    if (!$plate) return null;
    $latin = ['A' => 'أ', 'B' => 'ب', 'D' => 'د', 'H' => 'ه', 'E' => 'ه', 'W' => 'و', 'T' => 'ط'];
    $parts = preg_split('/[\s|\-\/]+/u', $plate, -1, PREG_SPLIT_NO_EMPTY);
    $digits = [];
    $letter = null;
    foreach ($parts as $p) {
        if (preg_match('/^\d+$/', $p)) $digits[] = $p;
        elseif (preg_match('/^[أبدهوزحطيكلمن]$/u', $p)) $letter = $p;
        elseif (isset($latin[strtoupper($p)])) $letter = $latin[strtoupper($p)];
        else { $letter = null; break; }
    }
    if ($letter === null || count($digits) !== 2 || strlen($digits[0]) > 5 || strlen($digits[1]) > 2) {
        throw new HttpError(422, "Immatriculation invalide : « $plate ».");
    }
    return $digits[0] . ' | ' . $letter . ' | ' . $digits[1];
}

function sync_vin(mixed $value): ?string
{
    $vin = strtoupper(preg_replace('/[\s-]/', '', (string)($value ?? '')));
    if (!preg_match('/^[A-HJ-NPR-Z0-9]{17}$/', $vin)) return null;
    // placeholders ignorés : pas de lettre, ou un même caractère répété
    if (!preg_match('/[A-Z]/', $vin) || preg_match('/(.)\\1{6,}/', $vin)) return null;
    return $vin;
}

function sync_int(array $b, string $k, int $min, int $max): ?int
{
    if (!array_key_exists($k, $b) || $b[$k] === null || $b[$k] === '') return null;
    if (!is_numeric($b[$k])) throw new HttpError(422, "$k doit être un nombre.");
    $n = (int)round((float)$b[$k]);
    if ($n < $min || $n > $max) throw new HttpError(422, "$k hors limites.");
    return $n;
}

function sync_client_fields(array $b, bool $create): array
{
    $out = [];
    if ($create || array_key_exists('type_client', $b)) {
        $t = $b['type_client'] ?? 'particulier';
        if (!in_array($t, ['particulier', 'societe'], true)) throw new HttpError(422, 'type_client doit être "particulier" ou "societe".');
        $out['type_client'] = $t;
    }
    $limits = ['nom' => 120, 'prenom' => 120, 'raison_sociale' => 190, 'ice' => 40, 'telephone' => 60, 'email' => 190, 'adresse' => 255, 'ville' => 120];
    foreach ($limits as $k => $max) {
        if (array_key_exists($k, $b)) $out[$k] = str_or_null($b[$k], $max);
    }
    if (isset($out['email']) && $out['email'] !== null && !filter_var($out['email'], FILTER_VALIDATE_EMAIL)) {
        throw new HttpError(422, 'Email invalide.');
    }
    return $out;
}

function sync_require_client(?string $id): void
{
    if ($id !== null && !one('SELECT id FROM clients WHERE id = ?', [$id])) throw new HttpError(422, 'client_id inconnu.');
}

function sync_vin_free(?string $vin, ?string $exceptId = null): void
{
    if ($vin === null) return;
    $row = one('SELECT id FROM vehicules WHERE vin = ?', [$vin]);
    if ($row && $row['id'] !== $exceptId) throw new HttpError(422, "VIN déjà utilisé par le véhicule {$row['id']}.");
}

function handle_sync(string $method, string $path): never
{
    try {
        sync_guard();

        if ($path === '/sync/clients' && $method === 'GET') {
            json_out(['data' => array_map('PT\client_out', all('SELECT * FROM clients ORDER BY created_at'))]);
        }
        if ($path === '/sync/clients' && $method === 'POST') {
            $f = sync_client_fields(body(), true);
            if ($f['type_client'] === 'societe' && empty($f['raison_sociale'])) throw new HttpError(422, 'raison_sociale obligatoire pour une société.');
            if ($f['type_client'] === 'particulier' && empty($f['nom'])) throw new HttpError(422, 'nom obligatoire pour un particulier.');
            $id = uuid();
            $f['id'] = $id;
            $cols = array_keys($f);
            q('INSERT INTO clients (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')', array_values($f));
            audit(null, 'create', 'client', $id, 'sync');
            json_out(['data' => client_out(one('SELECT * FROM clients WHERE id = ?', [$id]))], 201);
        }
        if (preg_match('#^/sync/clients/([\w-]+)$#', $path, $m) && $method === 'PATCH') {
            if (!one('SELECT id FROM clients WHERE id = ?', [$m[1]])) throw new HttpError(404, 'Ressource introuvable');
            $f = sync_client_fields(body(), false);
            if ($f) {
                $sets = array_map(fn($k) => "$k = ?", array_keys($f));
                q('UPDATE clients SET ' . implode(', ', $sets) . ' WHERE id = ?', [...array_values($f), $m[1]]);
                audit(null, 'update', 'client', $m[1], 'sync');
            }
            json_out(['data' => client_out(one('SELECT * FROM clients WHERE id = ?', [$m[1]]))]);
        }

        if ($path === '/sync/vehicules' && $method === 'GET') {
            json_out(['data' => array_map('PT\vehicule_out', all('SELECT * FROM vehicules ORDER BY created_at'))]);
        }
        if ($path === '/sync/vehicules' && $method === 'POST') {
            $b = body();
            $marque = str_or_null($b['marque'] ?? null, 80);
            $modele = str_or_null($b['modele'] ?? null, 120);
            if (!$marque || !$modele) throw new HttpError(422, 'marque et modele obligatoires.');
            $clientId = str_or_null($b['client_id'] ?? null, 36);
            sync_require_client($clientId);
            $vin = sync_vin($b['vin'] ?? null);
            sync_vin_free($vin);
            $statut = $b['statut'] ?? 'actif';
            if (!in_array($statut, ['actif', 'archive'], true)) throw new HttpError(422, 'statut doit être "actif" ou "archive".');
            $id = uuid();
            $row = [$id, $vin, sync_plate($b['immatriculation'] ?? null), 'MA', $marque, $modele,
                sync_int($b, 'annee', 1900, 2100), str_or_null($b['motorisation'] ?? null, 120),
                str_or_null($b['carburant'] ?? null, 40), sync_int($b, 'kilometrage_actuel', 0, 5000000), $statut, $clientId];
            tx(function () use ($row, $id, $clientId) {
                q('INSERT INTO vehicules (id, vin, immatriculation, immatriculation_pays, marque, modele, annee, motorisation, carburant, kilometrage_actuel, statut, client_id)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', $row);
                if ($clientId) {
                    q("INSERT INTO vehicule_proprietaires (id, vehicule_id, client_id, date_debut, motif) VALUES (?,?,?,UTC_TIMESTAMP(),'achat')",
                        [uuid(), $id, $clientId]);
                }
            });
            audit(null, 'create', 'vehicule', $id, 'sync');
            json_out(['data' => vehicule_out(one('SELECT * FROM vehicules WHERE id = ?', [$id]))], 201);
        }
        if (preg_match('#^/sync/vehicules/([\w-]+)$#', $path, $m) && $method === 'PATCH') {
            $vid = $m[1];
            if (!one('SELECT id FROM vehicules WHERE id = ?', [$vid])) throw new HttpError(404, 'Ressource introuvable');
            $b = body();
            if (array_key_exists('client_id', $b)) throw new HttpError(422, 'Le changement de propriétaire passe par /sync/vehicules/{id}/transfer.');
            $f = [];
            foreach (['marque' => 80, 'modele' => 120, 'motorisation' => 120, 'carburant' => 40] as $k => $max) {
                if (array_key_exists($k, $b)) $f[$k] = str_or_null($b[$k], $max);
            }
            if ((array_key_exists('marque', $f) && !$f['marque']) || (array_key_exists('modele', $f) && !$f['modele'])) {
                throw new HttpError(422, 'marque et modele ne peuvent pas être vides.');
            }
            if (array_key_exists('immatriculation', $b)) { $f['immatriculation'] = sync_plate($b['immatriculation']); $f['immatriculation_pays'] = 'MA'; }
            if (array_key_exists('vin', $b)) { $f['vin'] = sync_vin($b['vin']); sync_vin_free($f['vin'], $vid); }
            if (array_key_exists('annee', $b)) $f['annee'] = sync_int($b, 'annee', 1900, 2100);
            if (array_key_exists('kilometrage_actuel', $b)) $f['kilometrage_actuel'] = sync_int($b, 'kilometrage_actuel', 0, 5000000);
            if (array_key_exists('statut', $b)) {
                if (!in_array($b['statut'], ['actif', 'archive'], true)) throw new HttpError(422, 'statut doit être "actif" ou "archive".');
                $f['statut'] = $b['statut'];
            }
            if ($f) {
                $sets = array_map(fn($k) => "$k = ?", array_keys($f));
                q('UPDATE vehicules SET ' . implode(', ', $sets) . ' WHERE id = ?', [...array_values($f), $vid]);
                audit(null, 'update', 'vehicule', $vid, 'sync');
            }
            json_out(['data' => vehicule_out(one('SELECT * FROM vehicules WHERE id = ?', [$vid]))]);
        }
        if (preg_match('#^/sync/vehicules/([\w-]+)/transfer$#', $path, $m) && $method === 'POST') {
            $vid = $m[1];
            $b = body();
            if (!one('SELECT id FROM vehicules WHERE id = ?', [$vid])) throw new HttpError(404, 'Ressource introuvable');
            $newClient = str_or_null($b['client_id'] ?? null, 36);
            if (!$newClient) throw new HttpError(422, 'client_id obligatoire.');
            sync_require_client($newClient);
            $motif = in_array($b['motif'] ?? '', ['achat', 'transfert', 'reprise', 'autre'], true) ? $b['motif'] : 'transfert';
            tx(function () use ($vid, $newClient, $motif) {
                q('UPDATE vehicule_proprietaires SET date_fin = UTC_TIMESTAMP() WHERE vehicule_id = ? AND date_fin IS NULL', [$vid]);
                q('INSERT INTO vehicule_proprietaires (id, vehicule_id, client_id, date_debut, motif) VALUES (?,?,?,UTC_TIMESTAMP(),?)',
                    [uuid(), $vid, $newClient, $motif]);
                q('UPDATE vehicules SET client_id = ? WHERE id = ?', [$newClient, $vid]);
            });
            audit(null, 'transfer', 'vehicule', $vid, 'sync:' . $newClient);
            json_out(['data' => vehicule_out(one('SELECT * FROM vehicules WHERE id = ?', [$vid]))]);
        }

        throw new HttpError(404, 'Ressource introuvable');
    } catch (HttpError $e) {
        json_out(['error' => $e->getMessage()], $e->status);
    } catch (\Throwable $e) {
        error_log((string)$e);
        json_out(['error' => 'Erreur interne.'], 500);
    }
}
