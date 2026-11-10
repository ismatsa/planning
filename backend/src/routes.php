<?php
declare(strict_types=1);
namespace PT;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/sync.php';

// ---------- Serializers ----------

function metier_out(array $m): array
{
    return ['id' => $m['id'], 'nom' => $m['nom'], 'couleur' => $m['couleur']];
}

function poste_out(array $p): array
{
    return ['id' => $p['id'], 'metier_id' => $p['metier_id'], 'nom' => $p['nom'],
        'actif' => (bool)$p['actif'], 'color_hex' => $p['color_hex'], 'sort_order' => (int)$p['sort_order']];
}

function rdv_out(array $r): array
{
    return ['id' => $r['id'], 'poste_id' => $r['poste_id'], 'debut' => iso($r['debut']), 'fin' => iso($r['fin']),
        'client_nom' => $r['client_nom'], 'client_tel' => $r['client_tel'], 'marque' => $r['marque'],
        'modele' => $r['modele'], 'annee' => $r['annee'], 'vin' => $r['vin'], 'notes' => $r['notes'],
        'statut' => $r['statut'],
        'billing_responsible_user_id' => $r['billing_responsible_user_id'] !== null ? (int)$r['billing_responsible_user_id'] : null,
        'source_devis_id' => $r['source_devis_id'], 'client_id' => $r['client_id'], 'vehicule_id' => $r['vehicule_id'],
        'created_by' => $r['created_by'] !== null ? (int)$r['created_by'] : null,
        'created_at' => iso($r['created_at']), 'updated_at' => iso($r['updated_at'])];
}

function client_out(array $c): array
{
    return ['id' => $c['id'], 'type_client' => $c['type_client'], 'nom' => $c['nom'], 'prenom' => $c['prenom'],
        'raison_sociale' => $c['raison_sociale'], 'ice' => $c['ice'], 'telephone' => $c['telephone'],
        'telephone_secondaire' => $c['telephone_secondaire'], 'email' => $c['email'], 'adresse' => $c['adresse'],
        'ville' => $c['ville'], 'notes_internes' => $c['notes_internes'], 'statut' => $c['statut'],
        'created_by' => $c['created_by'] !== null ? (int)$c['created_by'] : null,
        'created_at' => iso($c['created_at']), 'updated_at' => iso($c['updated_at'])];
}

function vehicule_out(array $v): array
{
    return ['id' => $v['id'], 'vin' => $v['vin'], 'immatriculation' => $v['immatriculation'],
        'immatriculation_pays' => $v['immatriculation_pays'] ?? 'MA',
        'marque' => $v['marque'], 'modele' => $v['modele'],
        'annee' => $v['annee'] !== null ? (int)$v['annee'] : null,
        'motorisation' => $v['motorisation'], 'carburant' => $v['carburant'], 'boite_vitesses' => $v['boite_vitesses'],
        'kilometrage_actuel' => $v['kilometrage_actuel'] !== null ? (int)$v['kilometrage_actuel'] : null,
        'statut' => $v['statut'], 'client_id' => $v['client_id'], 'notes' => $v['notes'],
        'created_by' => $v['created_by'] !== null ? (int)$v['created_by'] : null,
        'created_at' => iso($v['created_at']), 'updated_at' => iso($v['updated_at'])];
}

function proprietaire_out(array $p): array
{
    return ['id' => $p['id'], 'vehicule_id' => $p['vehicule_id'], 'client_id' => $p['client_id'],
        'date_debut' => iso($p['date_debut']), 'date_fin' => iso($p['date_fin']), 'motif' => $p['motif'],
        'created_by' => $p['created_by'] !== null ? (int)$p['created_by'] : null, 'created_at' => iso($p['created_at'])];
}

function entretien_out(array $e): array
{
    return ['id' => $e['id'], 'vehicule_id' => $e['vehicule_id'], 'date_entretien' => $e['date_entretien'],
        'type_entretien' => $e['type_entretien'],
        'kilometrage' => $e['kilometrage'] !== null ? (int)$e['kilometrage'] : null,
        'description' => $e['description'], 'pieces_utilisees' => $e['pieces_utilisees'],
        'realise_par' => $e['realise_par'], 'rdv_id' => $e['rdv_id'], 'devis_id' => $e['devis_id'],
        'cout' => $e['cout'] !== null ? (float)$e['cout'] : null,
        'created_by' => $e['created_by'] !== null ? (int)$e['created_by'] : null,
        'created_at' => iso($e['created_at']), 'updated_at' => iso($e['updated_at'])];
}

function devis_out(array $d): array
{
    return ['id' => $d['id'], 'client_nom' => $d['client_nom'], 'client_tel' => $d['client_tel'],
        'marque' => $d['marque'], 'modele' => $d['modele'], 'annee' => $d['annee'], 'vin' => $d['vin'],
        'notes' => $d['notes'], 'statut' => $d['statut'],
        'billing_responsible_user_id' => $d['billing_responsible_user_id'] !== null ? (int)$d['billing_responsible_user_id'] : null,
        'assigned_user_id' => $d['assigned_user_id'] !== null ? (int)$d['assigned_user_id'] : null,
        'client_id' => $d['client_id'], 'vehicule_id' => $d['vehicule_id'],
        'sent_at' => iso($d['sent_at']), 'status_changed_at' => iso($d['status_changed_at']),
        'follow_up_count' => (int)$d['follow_up_count'], 'last_follow_up_at' => iso($d['last_follow_up_at']),
        'created_by' => $d['created_by'] !== null ? (int)$d['created_by'] : null,
        'created_at' => iso($d['created_at']), 'updated_at' => iso($d['updated_at'])];
}

function comment_out(array $c): array
{
    return ['id' => $c['id'], 'devis_id' => $c['devis_id'], 'user_id' => (int)$c['user_id'],
        'user_name' => $c['user_name'] ?? '', 'content' => $c['content'],
        'created_at' => iso($c['created_at']), 'updated_at' => iso($c['updated_at'])];
}

// ---------- Helpers ----------

const RDV_FIELDS = ['poste_id', 'debut', 'fin', 'client_nom', 'client_tel', 'marque', 'modele', 'annee', 'vin', 'notes', 'statut', 'billing_responsible_user_id', 'source_devis_id', 'client_id', 'vehicule_id'];
const DEVIS_FIELDS = ['client_nom', 'client_tel', 'marque', 'modele', 'annee', 'vin', 'notes', 'statut', 'billing_responsible_user_id', 'assigned_user_id', 'client_id', 'vehicule_id'];
const CLIENT_FIELDS = ['type_client', 'nom', 'prenom', 'raison_sociale', 'ice', 'telephone', 'telephone_secondaire', 'email', 'adresse', 'ville', 'notes_internes', 'statut'];
const VEHICULE_FIELDS = ['vin', 'immatriculation', 'immatriculation_pays', 'marque', 'modele', 'annee', 'motorisation', 'carburant', 'boite_vitesses', 'kilometrage_actuel', 'statut', 'client_id', 'notes'];
const ENTRETIEN_FIELDS = ['vehicule_id', 'date_entretien', 'type_entretien', 'kilometrage', 'description', 'pieces_utilisees', 'realise_par', 'rdv_id', 'devis_id', 'cout'];

/** Valide et normalise la plaque avec son pays (format structuré pour le Maroc). */
function normalize_immatriculation(mixed $value, mixed $country): array
{
    $code = strtoupper(trim((string)($country ?: 'MA')));
    if (!preg_match('/^[A-Z]{2}$/', $code)) throw new HttpError(422, 'Pays d’immatriculation invalide.');
    $plate = str_or_null($value, 40);
    if (!$plate) return [null, $code];
    if ($code === 'MA') {
        $compact = preg_replace('/\s+/', '', $plate);
        if (!preg_match('/^(\d{1,5})\|([أبدهوزحطيكلمن])\|(\d{1,2})$/u', $compact, $m)) {
            throw new HttpError(422, 'Plaque marocaine incomplète : numéro, lettre arabe et région obligatoires.');
        }
        return [$m[1] . ' | ' . $m[2] . ' | ' . $m[3], $code];
    }
    $plate = strtoupper($plate);
    if (!preg_match('/^[A-Z0-9][A-Z0-9 -]{0,19}$/', $plate)) {
        throw new HttpError(422, 'Immatriculation invalide : utilisez uniquement lettres, chiffres, espaces et tirets.');
    }
    return [$plate, $code];
}

/** Construit un UPDATE ne contenant que les champs présents dans le body. */
function build_update(array $b, array $allowed, array $datetimeFields = []): array
{
    $sets = [];
    $params = [];
    foreach ($allowed as $f) {
        if (!array_key_exists($f, $b)) continue;
        $sets[] = "$f = ?";
        $params[] = in_array($f, $datetimeFields, true) ? mysql_dt($b[$f]) : $b[$f];
    }
    return [$sets, $params];
}

function sync_set(string $table, string $idCol, string $id, string $valCol, array $ids): void
{
    q("DELETE FROM $table WHERE $idCol = ?", [$id]);
    foreach (array_unique(array_filter($ids)) as $vid) {
        q("INSERT INTO $table ($idCol, $valCol) VALUES (?, ?)", [$id, $vid]);
    }
}

// ---------- Routeur ----------

function handle_request(): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
    $path = preg_replace('#^/api#', '', $path) ?: '/';

    if (str_starts_with($path, '/sync/') || $path === '/sync') handle_sync($method, $path);

    try {
        check_csrf();

        // ----- Auth -----
        if ($path === '/auth/login' && $method === 'POST') {
            $b = body();
            json_out(login((string)($b['login'] ?? ''), (string)($b['password'] ?? '')));
        }
        if ($path === '/auth/logout' && $method === 'POST') {
            logout();
            json_out(['ok' => true]);
        }
        if ($path === '/auth/me' && $method === 'GET') {
            $u = current_user();
            json_out(['user' => $u ? public_user($u) : null, 'csrf' => $u['csrf'] ?? null]);
        }

        $u = require_user();

        // ----- Utilisateurs (admin) -----
        if ($path === '/users' && $method === 'GET') {
            json_out(array_map('PT\public_user', all('SELECT * FROM users ORDER BY name')));
        }
        if ($path === '/users' && $method === 'POST') {
            require_admin();
            $b = body();
            $name = str_or_null($b['name'] ?? null, 120);
            $login = str_or_null($b['login'] ?? null, 190);
            $password = (string)($b['password'] ?? '');
            if (!$name || !$login || strlen($password) < 8) throw new HttpError(422, 'Nom, identifiant et mot de passe (8+) obligatoires.');
            $role = ($b['role'] ?? '') === 'admin' ? 'admin' : 'contributor';
            q('INSERT INTO users (name, login, password_hash, role, company) VALUES (?,?,?,?,?)',
                [$name, strtolower($login), password_hash($password, PASSWORD_ARGON2ID), $role, str_or_null($b['company'] ?? null, 120)]);
            $id = (int)db()->lastInsertId();
            audit((int)$u['id'], 'create', 'user', (string)$id, $login);
            json_out(public_user(one('SELECT * FROM users WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'PATCH') {
            require_admin();
            $b = body();
            $target = one('SELECT * FROM users WHERE id = ?', [(int)$m[1]]);
            if (!$target) throw new HttpError(404, 'Utilisateur introuvable.');
            if (isset($b['role']) && $target['role'] === 'admin' && $b['role'] !== 'admin') {
                $admins = (int)one("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND is_active = 1")['c'];
                if ($admins <= 1) throw new HttpError(422, 'Impossible : il doit rester au moins un administrateur.');
            }
            [$sets, $params] = build_update($b, ['name', 'role', 'company', 'is_active']);
            if (isset($b['password']) && strlen((string)$b['password']) >= 8) {
                $sets[] = 'password_hash = ?';
                $params[] = password_hash((string)$b['password'], PASSWORD_ARGON2ID);
            }
            if ($sets) {
                $params[] = (int)$m[1];
                q('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            }
            audit((int)$u['id'], 'update', 'user', $m[1]);
            json_out(public_user(one('SELECT * FROM users WHERE id = ?', [(int)$m[1]])));
        }
        if (preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
            require_admin();
            $target = one('SELECT * FROM users WHERE id = ?', [(int)$m[1]]);
            if (!$target) throw new HttpError(404, 'Utilisateur introuvable.');
            if ((int)$target['id'] === (int)$u['id']) throw new HttpError(422, 'Vous ne pouvez pas supprimer votre propre compte.');
            if ($target['role'] === 'admin') {
                $admins = (int)one("SELECT COUNT(*) c FROM users WHERE role = 'admin'")['c'];
                if ($admins <= 1) throw new HttpError(422, 'Impossible : il doit rester au moins un administrateur.');
            }
            q('DELETE FROM users WHERE id = ?', [(int)$m[1]]);
            audit((int)$u['id'], 'delete', 'user', $m[1], $target['login']);
            json_out(['ok' => true]);
        }

        // ----- Référentiels -----
        if ($path === '/metiers' && $method === 'GET') json_out(array_map('PT\metier_out', all('SELECT * FROM metiers ORDER BY nom')));
        if ($path === '/metiers' && $method === 'POST') {
            $b = body();
            $id = str_or_null($b['id'] ?? null, 40);
            $nom = str_or_null($b['nom'] ?? null, 80);
            if (!$id || !$nom) throw new HttpError(422, 'id et nom obligatoires.');
            q('INSERT INTO metiers (id, nom, couleur) VALUES (?,?,?)', [$id, $nom, (string)($b['couleur'] ?? '')]);
            json_out(metier_out(one('SELECT * FROM metiers WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/metiers/([\w-]+)$#', $path, $m)) {
            if ($method === 'PATCH') {
                $b = body();
                [$sets, $params] = build_update($b, ['nom', 'couleur']);
                if ($sets) { $params[] = $m[1]; q('UPDATE metiers SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
                json_out(metier_out(one('SELECT * FROM metiers WHERE id = ?', [$m[1]])));
            }
            if ($method === 'DELETE') {
                q('DELETE FROM metiers WHERE id = ?', [$m[1]]);
                json_out(['ok' => true]);
            }
        }

        if ($path === '/postes' && $method === 'GET') json_out(array_map('PT\poste_out', all('SELECT * FROM postes ORDER BY metier_id, sort_order')));
        if ($path === '/postes' && $method === 'POST') {
            $b = body();
            $id = str_or_null($b['id'] ?? null, 40);
            if (!$id || !str_or_null($b['nom'] ?? null) || !str_or_null($b['metier_id'] ?? null)) throw new HttpError(422, 'id, metier_id et nom obligatoires.');
            q('INSERT INTO postes (id, metier_id, nom, actif, color_hex, sort_order) VALUES (?,?,?,?,?,?)',
                [$id, $b['metier_id'], $b['nom'], !empty($b['actif']) ? 1 : 0, str_or_null($b['color_hex'] ?? null, 7), (int)($b['sort_order'] ?? 0)]);
            json_out(poste_out(one('SELECT * FROM postes WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/postes/([\w-]+)$#', $path, $m)) {
            if ($method === 'PATCH') {
                $b = body();
                [$sets, $params] = build_update($b, ['nom', 'actif', 'color_hex', 'sort_order']);
                if ($sets) { $params[] = $m[1]; q('UPDATE postes SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
                json_out(poste_out(one('SELECT * FROM postes WHERE id = ?', [$m[1]])));
            }
            if ($method === 'DELETE') {
                q('DELETE FROM postes WHERE id = ?', [$m[1]]);
                json_out(['ok' => true]);
            }
        }

        if ($path === '/disponibilites' && $method === 'GET') {
            json_out(array_map(fn($d) => [
                'poste_id' => $d['poste_id'], 'jour_semaine' => (int)$d['jour_semaine'],
                'plages' => json_decode($d['plages'], true) ?: [], 'duree_defaut' => (int)$d['duree_defaut'],
                'durees_autorisees' => json_decode($d['durees_autorisees'], true) ?: [30, 60, 90], 'tampon' => (int)$d['tampon'],
            ], all('SELECT * FROM disponibilite_postes')));
        }
        if ($path === '/disponibilites' && $method === 'PUT') {
            $b = body();
            q('INSERT INTO disponibilite_postes (poste_id, jour_semaine, plages, duree_defaut, durees_autorisees, tampon)
               VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE plages=VALUES(plages), duree_defaut=VALUES(duree_defaut), durees_autorisees=VALUES(durees_autorisees), tampon=VALUES(tampon)',
                [(string)$b['poste_id'], (int)$b['jour_semaine'], json_encode($b['plages'] ?? []), (int)($b['duree_defaut'] ?? 60), json_encode($b['durees_autorisees'] ?? [30, 60, 90]), (int)($b['tampon'] ?? 0)]);
            json_out(['ok' => true]);
        }

        if ($path === '/exceptions' && $method === 'GET') {
            json_out(array_map(fn($e) => [
                'id' => $e['id'], 'poste_id' => $e['poste_id'], 'date' => $e['date'],
                'ferme' => (bool)$e['ferme'], 'plages_override' => $e['plages_override'] ? json_decode($e['plages_override'], true) : null,
            ], all('SELECT * FROM exception_disponibilites')));
        }

        // ----- Paramètres -----
        if ($path === '/settings' && $method === 'GET') {
            json_out([
                'jours_ouvres' => json_decode(setting('jours_ouvres') ?: '[1,2,3,4,5,6]', true),
                'heure_min' => setting('heure_min') ?: '08:00',
                'heure_max' => setting('heure_max') ?: '19:00',
            ]);
        }
        if ($path === '/settings' && $method === 'PUT') {
            $b = body();
            if (isset($b['jours_ouvres'])) set_setting('jours_ouvres', json_encode($b['jours_ouvres']));
            if (isset($b['heure_min'])) set_setting('heure_min', (string)$b['heure_min']);
            if (isset($b['heure_max'])) set_setting('heure_max', (string)$b['heure_max']);
            json_out(['ok' => true]);
        }

        // ----- Rendez-vous -----
        if ($path === '/rdvs' && $method === 'GET') {
            $rdvs = array_map('PT\rdv_out', all('SELECT * FROM rendez_vous ORDER BY debut'));
            $resp = [];
            foreach (all('SELECT appointment_id, user_id FROM appointment_responsibles') as $r) $resp[$r['appointment_id']][] = (int)$r['user_id'];
            $ints = [];
            foreach (all('SELECT appointment_id, intervenant_id FROM appointment_intervenants') as $r) $ints[$r['appointment_id']][] = (int)$r['intervenant_id'];
            json_out(['rdvs' => $rdvs, 'responsibles' => (object)$resp, 'intervenants' => (object)$ints]);
        }
        if ($path === '/rdvs' && $method === 'POST') {
            $b = body();
            if (empty($b['debut']) || empty($b['fin'])) throw new HttpError(422, 'Début et fin obligatoires.');
            $id = uuid();
            tx(function () use ($b, $id, $u) {
                q('INSERT INTO rendez_vous (id, poste_id, debut, fin, client_nom, client_tel, marque, modele, annee, vin, notes, statut, billing_responsible_user_id, source_devis_id, client_id, vehicule_id, created_by)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$id, $b['poste_id'] ?? null, mysql_dt($b['debut']), mysql_dt($b['fin']),
                        str_or_null($b['client_nom'] ?? null, 190), str_or_null($b['client_tel'] ?? null, 60),
                        str_or_null($b['marque'] ?? null, 80), str_or_null($b['modele'] ?? null, 120),
                        str_or_null($b['annee'] ?? null, 20), str_or_null($b['vin'] ?? null, 17),
                        $b['notes'] ?? null, in_array($b['statut'] ?? '', ['prevu', 'confirme', 'annule', 'noshow', 'termine'], true) ? $b['statut'] : 'prevu',
                        $b['billing_responsible_user_id'] ?? null, $b['source_devis_id'] ?? null,
                        $b['client_id'] ?? null, $b['vehicule_id'] ?? null, (int)$u['id']]);
                if (!empty($b['responsible_ids'])) sync_set('appointment_responsibles', 'appointment_id', $id, 'user_id', $b['responsible_ids']);
                if (!empty($b['intervenant_ids'])) sync_set('appointment_intervenants', 'appointment_id', $id, 'intervenant_id', $b['intervenant_ids']);
            });
            audit((int)$u['id'], 'create', 'rdv', $id);
            json_out(rdv_out(one('SELECT * FROM rendez_vous WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/rdvs/([\w-]+)$#', $path, $m)) {
            $id = $m[1];
            $existing = one('SELECT * FROM rendez_vous WHERE id = ?', [$id]);
            if (!$existing) throw new HttpError(404, 'Rendez-vous introuvable.');
            if ($method === 'PATCH') {
                $b = body();
                tx(function () use ($b, $id) {
                    [$sets, $params] = build_update($b, RDV_FIELDS, ['debut', 'fin']);
                    if ($sets) { $params[] = $id; q('UPDATE rendez_vous SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
                    if (isset($b['responsible_ids'])) sync_set('appointment_responsibles', 'appointment_id', $id, 'user_id', $b['responsible_ids']);
                    if (isset($b['intervenant_ids'])) sync_set('appointment_intervenants', 'appointment_id', $id, 'intervenant_id', $b['intervenant_ids']);
                });
                audit((int)$u['id'], 'update', 'rdv', $id);
                json_out(rdv_out(one('SELECT * FROM rendez_vous WHERE id = ?', [$id])));
            }
            if ($method === 'DELETE') {
                q('DELETE FROM rendez_vous WHERE id = ?', [$id]);
                audit((int)$u['id'], 'delete', 'rdv', $id);
                json_out(['ok' => true]);
            }
        }

        // ----- Intervenants -----
        if ($path === '/intervenants' && $method === 'GET') {
            json_out(array_map(fn($i) => ['id' => (int)$i['id'], 'nom' => $i['nom'], 'name' => $i['nom'],
                'responsable_id' => $i['responsable_id'] !== null ? (int)$i['responsable_id'] : null,
                'responsable_user_id' => $i['responsable_id'] !== null ? (int)$i['responsable_id'] : null,
                'actif' => (bool)$i['actif']],
                all('SELECT * FROM intervenants ORDER BY nom')));
        }
        if ($path === '/intervenants' && $method === 'POST') {
            $b = body();
            $nom = str_or_null($b['nom'] ?? null, 120);
            if (!$nom) throw new HttpError(422, 'Nom obligatoire.');
            q('INSERT INTO intervenants (nom, responsable_id) VALUES (?,?)', [$nom, $b['responsable_id'] ?? null]);
            json_out(['id' => (int)db()->lastInsertId()], 201);
        }
        if (preg_match('#^/intervenants/(\d+)$#', $path, $m)) {
            if ($method === 'PATCH') {
                $b = body();
                [$sets, $params] = build_update($b, ['nom', 'responsable_id', 'actif']);
                if ($sets) { $params[] = (int)$m[1]; q('UPDATE intervenants SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
                json_out(['ok' => true]);
            }
            if ($method === 'DELETE') {
                q('DELETE FROM intervenants WHERE id = ?', [(int)$m[1]]);
                json_out(['ok' => true]);
            }
        }

        // ----- Clients -----
        if ($path === '/clients' && $method === 'GET') json_out(array_map('PT\client_out', all('SELECT * FROM clients ORDER BY nom, raison_sociale')));
        if ($path === '/clients' && $method === 'POST') {
            $b = body();
            $id = uuid();
            $type = ($b['type_client'] ?? '') === 'societe' ? 'societe' : 'particulier';
            q('INSERT INTO clients (id, type_client, nom, prenom, raison_sociale, ice, telephone, telephone_secondaire, email, adresse, ville, notes_internes, statut, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [$id, $type, str_or_null($b['nom'] ?? null, 120), str_or_null($b['prenom'] ?? null, 120),
                    str_or_null($b['raison_sociale'] ?? null, 190), str_or_null($b['ice'] ?? null, 40),
                    str_or_null($b['telephone'] ?? null, 60), str_or_null($b['telephone_secondaire'] ?? null, 60),
                    str_or_null($b['email'] ?? null, 190), str_or_null($b['adresse'] ?? null, 255),
                    str_or_null($b['ville'] ?? null, 120), $b['notes_internes'] ?? null,
                    ($b['statut'] ?? '') === 'archive' ? 'archive' : 'actif', (int)$u['id']]);
            audit((int)$u['id'], 'create', 'client', $id);
            json_out(client_out(one('SELECT * FROM clients WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/clients/([\w-]+)$#', $path, $m) && $method === 'PATCH') {
            $b = body();
            [$sets, $params] = build_update($b, CLIENT_FIELDS);
            if ($sets) { $params[] = $m[1]; q('UPDATE clients SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
            $c = one('SELECT * FROM clients WHERE id = ?', [$m[1]]);
            if (!$c) throw new HttpError(404, 'Client introuvable.');
            json_out(client_out($c));
        }

        // ----- Véhicules -----
        if ($path === '/vehicules' && $method === 'GET') json_out(array_map('PT\vehicule_out', all('SELECT * FROM vehicules ORDER BY marque, modele')));
        if ($path === '/vehicules' && $method === 'POST') {
            $b = body();
            if (!str_or_null($b['marque'] ?? null) || !str_or_null($b['modele'] ?? null)) throw new HttpError(422, 'Marque et modèle obligatoires.');
            $id = uuid();
            $vin = str_or_null($b['vin'] ?? null, 17);
            if ($vin) $vin = strtoupper(preg_replace('/[\s-]/', '', $vin));
            [$plate, $plateCountry] = normalize_immatriculation($b['immatriculation'] ?? null, $b['immatriculation_pays'] ?? 'MA');
            tx(function () use ($b, $id, $vin, $plate, $plateCountry, $u) {
                q('INSERT INTO vehicules (id, vin, immatriculation, immatriculation_pays, marque, modele, annee, motorisation, carburant, boite_vitesses, kilometrage_actuel, statut, client_id, notes, created_by)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$id, $vin, $plate, $plateCountry, $b['marque'], $b['modele'],
                        $b['annee'] ?? null, str_or_null($b['motorisation'] ?? null, 120), str_or_null($b['carburant'] ?? null, 40),
                        str_or_null($b['boite_vitesses'] ?? null, 40), $b['kilometrage_actuel'] ?? null,
                        ($b['statut'] ?? '') === 'archive' ? 'archive' : 'actif', $b['client_id'] ?? null, $b['notes'] ?? null, (int)$u['id']]);
                if (!empty($b['client_id'])) {
                    q('INSERT INTO vehicule_proprietaires (id, vehicule_id, client_id, date_debut, motif, created_by) VALUES (?,?,?,UTC_TIMESTAMP(),?,?)',
                        [uuid(), $id, $b['client_id'], 'achat', (int)$u['id']]);
                }
            });
            audit((int)$u['id'], 'create', 'vehicule', $id);
            json_out(vehicule_out(one('SELECT * FROM vehicules WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/vehicules/([\w-]+)$#', $path, $m) && $method === 'PATCH') {
            $b = body();
            unset($b['client_id']); // le changement de propriétaire passe par /transfer
            if (array_key_exists('immatriculation', $b) || array_key_exists('immatriculation_pays', $b)) {
                $current = one('SELECT immatriculation, immatriculation_pays FROM vehicules WHERE id = ?', [$m[1]]);
                if (!$current) throw new HttpError(404, 'Véhicule introuvable.');
                [$b['immatriculation'], $b['immatriculation_pays']] = normalize_immatriculation(
                    array_key_exists('immatriculation', $b) ? $b['immatriculation'] : $current['immatriculation'],
                    $b['immatriculation_pays'] ?? $current['immatriculation_pays'] ?? 'MA'
                );
            }
            [$sets, $params] = build_update($b, VEHICULE_FIELDS);
            if ($sets) { $params[] = $m[1]; q('UPDATE vehicules SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
            $v = one('SELECT * FROM vehicules WHERE id = ?', [$m[1]]);
            if (!$v) throw new HttpError(404, 'Véhicule introuvable.');
            json_out(vehicule_out($v));
        }
        if (preg_match('#^/vehicules/([\w-]+)/transfer$#', $path, $m) && $method === 'POST') {
            $b = body();
            $newClient = str_or_null($b['client_id'] ?? null, 36);
            if (!$newClient) throw new HttpError(422, 'client_id obligatoire.');
            $vid = $m[1];
            if (!one('SELECT id FROM vehicules WHERE id = ?', [$vid])) throw new HttpError(404, 'Véhicule introuvable.');
            if (!one('SELECT id FROM clients WHERE id = ?', [$newClient])) throw new HttpError(404, 'Client introuvable.');
            tx(function () use ($vid, $newClient, $b, $u) {
                q('UPDATE vehicule_proprietaires SET date_fin = UTC_TIMESTAMP() WHERE vehicule_id = ? AND date_fin IS NULL', [$vid]);
                q('INSERT INTO vehicule_proprietaires (id, vehicule_id, client_id, date_debut, motif, created_by) VALUES (?,?,?,UTC_TIMESTAMP(),?,?)',
                    [uuid(), $vid, $newClient, in_array($b['motif'] ?? '', ['achat', 'transfert', 'reprise', 'autre'], true) ? $b['motif'] : 'transfert', (int)$u['id']]);
                q('UPDATE vehicules SET client_id = ? WHERE id = ?', [$newClient, $vid]);
            });
            audit((int)$u['id'], 'transfer', 'vehicule', $vid, $newClient);
            json_out(vehicule_out(one('SELECT * FROM vehicules WHERE id = ?', [$vid])));
        }

        if ($path === '/proprietaires' && $method === 'GET') json_out(array_map('PT\proprietaire_out', all('SELECT * FROM vehicule_proprietaires ORDER BY date_debut DESC')));

        // ----- Entretiens -----
        if ($path === '/entretiens' && $method === 'GET') json_out(array_map('PT\entretien_out', all('SELECT * FROM entretiens ORDER BY date_entretien DESC')));
        if ($path === '/entretiens' && $method === 'POST') {
            $b = body();
            if (empty($b['vehicule_id']) || !str_or_null($b['type_entretien'] ?? null) || empty($b['date_entretien'])) throw new HttpError(422, 'Véhicule, date et type obligatoires.');
            $id = uuid();
            q('INSERT INTO entretiens (id, vehicule_id, date_entretien, type_entretien, kilometrage, description, pieces_utilisees, realise_par, rdv_id, devis_id, cout, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [$id, $b['vehicule_id'], $b['date_entretien'], $b['type_entretien'], $b['kilometrage'] ?? null,
                    $b['description'] ?? null, $b['pieces_utilisees'] ?? null, str_or_null($b['realise_par'] ?? null, 120),
                    $b['rdv_id'] ?? null, $b['devis_id'] ?? null, $b['cout'] ?? null, (int)$u['id']]);
            json_out(entretien_out(one('SELECT * FROM entretiens WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/entretiens/([\w-]+)$#', $path, $m) && $method === 'PATCH') {
            $b = body();
            [$sets, $params] = build_update($b, ENTRETIEN_FIELDS);
            if ($sets) { $params[] = $m[1]; q('UPDATE entretiens SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
            $e = one('SELECT * FROM entretiens WHERE id = ?', [$m[1]]);
            if (!$e) throw new HttpError(404, 'Entretien introuvable.');
            json_out(entretien_out($e));
        }

        // ----- Devis -----
        if ($path === '/devis' && $method === 'GET') {
            $list = array_map('PT\devis_out', all('SELECT * FROM devis ORDER BY created_at DESC'));
            $resp = $ints = $mets = [];
            foreach (all('SELECT devis_id, user_id FROM devis_responsibles') as $r) $resp[$r['devis_id']][] = (int)$r['user_id'];
            foreach (all('SELECT devis_id, intervenant_id FROM devis_intervenants') as $r) $ints[$r['devis_id']][] = (int)$r['intervenant_id'];
            foreach (all('SELECT devis_id, metier_id FROM devis_metiers') as $r) $mets[$r['devis_id']][] = $r['metier_id'];
            json_out(['devis' => $list, 'responsibles' => (object)$resp, 'intervenants' => (object)$ints, 'metiers' => (object)$mets]);
        }
        if ($path === '/devis' && $method === 'POST') {
            $b = body();
            $id = uuid();
            tx(function () use ($b, $id, $u) {
                q('INSERT INTO devis (id, client_nom, client_tel, marque, modele, annee, vin, notes, statut, billing_responsible_user_id, assigned_user_id, client_id, vehicule_id, status_changed_at, created_by)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),?)',
                    [$id, str_or_null($b['client_nom'] ?? null, 190), str_or_null($b['client_tel'] ?? null, 60),
                        str_or_null($b['marque'] ?? null, 80), str_or_null($b['modele'] ?? null, 120),
                        str_or_null($b['annee'] ?? null, 20), str_or_null($b['vin'] ?? null, 17), $b['notes'] ?? null,
                        $b['statut'] ?? 'demande_recue', $b['billing_responsible_user_id'] ?? null,
                        $b['assigned_user_id'] ?? null, $b['client_id'] ?? null, $b['vehicule_id'] ?? null, (int)$u['id']]);
                if (!empty($b['responsible_ids'])) sync_set('devis_responsibles', 'devis_id', $id, 'user_id', $b['responsible_ids']);
                if (!empty($b['intervenant_ids'])) sync_set('devis_intervenants', 'devis_id', $id, 'intervenant_id', $b['intervenant_ids']);
                if (!empty($b['metier_ids'])) sync_set('devis_metiers', 'devis_id', $id, 'metier_id', $b['metier_ids']);
            });
            audit((int)$u['id'], 'create', 'devis', $id);
            json_out(devis_out(one('SELECT * FROM devis WHERE id = ?', [$id])), 201);
        }
        if (preg_match('#^/devis/([\w-]+)$#', $path, $m)) {
            $id = $m[1];
            $existing = one('SELECT * FROM devis WHERE id = ?', [$id]);
            if (!$existing) throw new HttpError(404, 'Devis introuvable.');
            if ($method === 'PATCH') {
                $b = body();
                tx(function () use ($b, $id, $existing) {
                    [$sets, $params] = build_update($b, DEVIS_FIELDS);
                    if (isset($b['statut']) && $b['statut'] !== $existing['statut']) {
                        $sets[] = 'status_changed_at = UTC_TIMESTAMP()';
                        if ($b['statut'] === 'envoye' && !$existing['sent_at']) $sets[] = 'sent_at = UTC_TIMESTAMP()';
                    }
                    if (isset($b['follow_up_count'])) { $sets[] = 'follow_up_count = ?'; $params[] = (int)$b['follow_up_count']; }
                    if (isset($b['last_follow_up_at'])) { $sets[] = 'last_follow_up_at = ?'; $params[] = mysql_dt($b['last_follow_up_at']); }
                    if ($sets) { $params[] = $id; q('UPDATE devis SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
                    if (isset($b['responsible_ids'])) sync_set('devis_responsibles', 'devis_id', $id, 'user_id', $b['responsible_ids']);
                    if (isset($b['intervenant_ids'])) sync_set('devis_intervenants', 'devis_id', $id, 'intervenant_id', $b['intervenant_ids']);
                    if (isset($b['metier_ids'])) sync_set('devis_metiers', 'devis_id', $id, 'metier_id', $b['metier_ids']);
                });
                audit((int)$u['id'], 'update', 'devis', $id);
                json_out(devis_out(one('SELECT * FROM devis WHERE id = ?', [$id])));
            }
            if ($method === 'DELETE') {
                q('DELETE FROM devis WHERE id = ?', [$id]);
                audit((int)$u['id'], 'delete', 'devis', $id);
                json_out(['ok' => true]);
            }
        }

        // ----- Lignes de devis -----
        if (preg_match('#^/devis/([\w-]+)/lines$#', $path, $m)) {
            if ($method === 'GET') {
                json_out(array_map(fn($l) => ['id' => $l['id'], 'devis_id' => $l['devis_id'], 'type' => $l['type'],
                    'name' => $l['name'], 'oem_reference' => $l['oem_reference'], 'internal_reference' => $l['internal_reference'],
                    'quantity' => (float)$l['quantity'],
                    'realisation_user_id' => $l['realisation_user_id'] !== null ? (int)$l['realisation_user_id'] : null,
                    'commande_user_id' => $l['commande_user_id'] !== null ? (int)$l['commande_user_id'] : null,
                    'unit_price' => (float)$l['unit_price'], 'description' => $l['description'],
                    'discount_amount' => (float)$l['discount_amount'], 'discount_percent' => (float)$l['discount_percent'],
                    'sort_order' => (int)$l['sort_order'], 'created_at' => iso($l['created_at'])],
                    all('SELECT * FROM devis_lines WHERE devis_id = ? ORDER BY sort_order', [$m[1]])));
            }
            if ($method === 'PUT') {
                // Remplacement complet des lignes du devis
                $b = body();
                $lines = $b['lines'] ?? [];
                if (!is_array($lines)) throw new HttpError(422, 'Lignes invalides.');
                tx(function () use ($m, $lines) {
                    q('DELETE FROM devis_lines WHERE devis_id = ?', [$m[1]]);
                    foreach (array_values($lines) as $i => $l) {
                        $name = str_or_null($l['name'] ?? null, 255);
                        if (!$name) continue;
                        q('INSERT INTO devis_lines (id, devis_id, type, name, oem_reference, internal_reference, quantity, realisation_user_id, commande_user_id, unit_price, description, discount_amount, discount_percent, sort_order)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                            [uuid(), $m[1], ($l['type'] ?? '') === 'service' ? 'service' : 'produit', $name,
                                str_or_null($l['oem_reference'] ?? null, 120), str_or_null($l['internal_reference'] ?? null, 120),
                                (float)($l['quantity'] ?? 1), $l['realisation_user_id'] ?? null, $l['commande_user_id'] ?? null,
                                (float)($l['unit_price'] ?? 0), $l['description'] ?? null,
                                (float)($l['discount_amount'] ?? 0), (float)($l['discount_percent'] ?? 0), $i]);
                    }
                });
                json_out(['ok' => true]);
            }
        }

        // ----- Commentaires devis -----
        if (preg_match('#^/devis/([\w-]+)/comments$#', $path, $m)) {
            if ($method === 'GET') {
                json_out(array_map('PT\comment_out', all(
                    'SELECT c.*, u.name user_name FROM devis_comments c JOIN users u ON u.id = c.user_id WHERE c.devis_id = ? ORDER BY c.created_at', [$m[1]])));
            }
            if ($method === 'POST') {
                $b = body();
                $content = trim((string)($b['content'] ?? ''));
                if ($content === '') throw new HttpError(422, 'Contenu vide.');
                $cid = uuid();
                q('INSERT INTO devis_comments (id, devis_id, user_id, content) VALUES (?,?,?,?)', [$cid, $m[1], (int)$u['id'], $content]);
                json_out(comment_out(one('SELECT c.*, u.name user_name FROM devis_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [$cid])), 201);
            }
        }
        if (preg_match('#^/comments/([\w-]+)$#', $path, $m)) {
            $c = one('SELECT * FROM devis_comments WHERE id = ?', [$m[1]]);
            if (!$c) throw new HttpError(404, 'Commentaire introuvable.');
            if ((int)$c['user_id'] !== (int)$u['id'] && $u['role'] !== 'admin') throw new HttpError(403, 'Commentaire d\'un autre utilisateur.');
            if ($method === 'PATCH') {
                $b = body();
                $content = trim((string)($b['content'] ?? ''));
                if ($content === '') throw new HttpError(422, 'Contenu vide.');
                q('UPDATE devis_comments SET content = ? WHERE id = ?', [$content, $m[1]]);
                json_out(['ok' => true]);
            }
            if ($method === 'DELETE') {
                q('DELETE FROM devis_comments WHERE id = ?', [$m[1]]);
                json_out(['ok' => true]);
            }
        }

        throw new HttpError(404, 'Route inconnue.');
    } catch (HttpError $e) {
        json_out(['error' => $e->getMessage(), 'details' => $e->details], $e->status);
    } catch (\Throwable $e) {
        error_log($e);
        json_out(['error' => 'Erreur interne.'], 500);
    }
}
