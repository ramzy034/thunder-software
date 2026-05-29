<?php
/**
 * Thunder POS ← thundermaroc.com Orders Bridge
 *
 * GET /pos-orders.php?since=2025-01-01T00:00:00Z
 * Header: X-API-Key: ThunderPOS2024!
 *
 * Returns website orders grouped by session so the POS can display them.
 */

define('API_KEY',    'ThunderPOS2024!');
define('DB_HOST',    'localhost');
define('DB_NAME',    'thundermaroc_DB');
define('DB_USER',    'thundermaroc_user');
define('DB_PASS',    'thundermarocuser1');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET')     { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

$key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($key !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized — wrong API key']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// Discover a column name from a list of candidates
function discoverCol($pdo, $table, $candidates) {
    try {
        $stmt = $pdo->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION"
        );
        $stmt->execute([$table]);
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($candidates as $c) {
            if (in_array($c, $cols)) return $c;
        }
    } catch (PDOException $e) {}
    return null;
}

$sizeNameCol  = discoverCol($pdo, 'sizes',  ['name', 'label', 'size', 'title', 'value']);
$colorHexCol  = discoverCol($pdo, 'colors', ['hex', 'color', 'code', 'hexa', 'value', 'color_code', 'color_hex']);
$colorNameCol = discoverCol($pdo, 'colors', ['name', 'label', 'title']);

$sizeExpr  = $sizeNameCol  ? "s.`$sizeNameCol`"  : "CAST(o.size_id AS CHAR)";
$colorExpr = $colorHexCol  ? "c.`$colorHexCol`"  : ($colorNameCol ? "c.`$colorNameCol`" : "CAST(o.color_id AS CHAR)");

// Optional ?since= filter
$since  = $_GET['since'] ?? null;
$params = [];
$where  = '';
if ($since) {
    $ts = strtotime($since);
    if ($ts) {
        $where    = 'WHERE o.created_at > ?';
        $params[] = date('Y-m-d H:i:s', $ts);
    }
}

// Group by session_id: each cart session = one order in POS
$sql = "
    SELECT
        o.session_id,
        MIN(o.status)                                           AS status,
        MIN(o.created_at)                                       AS created_at,
        SUM(o.amount)                                           AS total_amount,
        GROUP_CONCAT(o.num_order ORDER BY o.id SEPARATOR ',')   AS num_orders,
        MIN(o.num_order)                                        AS first_num_order,
        JSON_ARRAYAGG(JSON_OBJECT(
            'order_id',    o.id,
            'num_order',   o.num_order,
            'product_id',  o.product_id,
            'product_name', COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(p.name, '$.fr')),
                JSON_UNQUOTE(JSON_EXTRACT(p.name, '$.en')),
                CONCAT('Product #', o.product_id)
            ),
            'size',        $sizeExpr,
            'color',       $colorExpr,
            'quantity',    o.quantity,
            'unit_price',  ROUND(o.amount / o.quantity, 2),
            'amount',      o.amount
        ))                                                      AS items_json
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN sizes    s ON o.size_id    = s.id
    LEFT JOIN colors   c ON o.color_id   = c.id
    $where
    GROUP BY o.session_id
    ORDER BY MIN(o.created_at) DESC
    LIMIT 200
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $e->getMessage()]);
    exit;
}

$orders = array_map(function ($row) {
    $items = json_decode($row['items_json'], true) ?: [];
    return [
        'session_id'     => (int) $row['session_id'],
        'num_order'      => $row['first_num_order'],
        'all_num_orders' => $row['num_orders'],
        'status'         => $row['status'],
        'created_at'     => $row['created_at'],
        'total'          => (float) $row['total_amount'],
        'items'          => $items,
    ];
}, $rows);

echo json_encode(['orders' => $orders, 'count' => count($orders)]);
