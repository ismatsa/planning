<?php
declare(strict_types=1);
// Front controller — seul fichier PHP exposé (dossier api/). Le reste est privé dans ../app.
$root = getenv('POWERTECH_ROOT') ?: dirname(__DIR__) . '/app';
require $root . '/src/routes.php';

PT\handle_request();
