#!/usr/bin/node

require_once __DIR__ . "./parse";
require_once __DIR__ . "./eval";
require_once __DIR__ . "./print";

function executeSQL($s, $fn, $config) {
    $ast = parseSQL($s);
    return evalSQL($ast, $fn, $config);
}

function loadTable($name, $config) {
    $path = "./" . $name . ".csv";
//  echo "open ", $path, "\n";
    $data = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $result = [];
    $first = array_shift($data);
    $first = explode(";", $first);

    foreach($data as $item) {
        $item = explode(";", $item);
        foreach($first as $n => $key) {
            $row[$key] = $item[$n];
        }
        $result [] = $row;
    }

    return $result;
}

function loadJSON($name, $config) {
    $path = getenv('HOME') . "/" . $name . ".json";
    if (!file_exists($path))  {
        $path = $name . ".json";
    }
//    echo "open ", $path, "\n";
    $result = json_decode(file_get_contents($path), true);

    return $result;
}

$query = $argv[1];
if (isset($argv[2]) && $argv[2] == 'ast') {
    $p = new SQLParser();
    $tok = $p->tokenizeSQL($query);
    print_r($tok);

    $ast = parseSQL($query);
    print_r($ast);

    exit(0);
}

$result = executeSQL($query, 'loadJSON', []);

//print_r($result);

if (isset($argv[2]) && $argv[2] == 'csv') {
    printCSV($result);
} else if (isset($argv[2]) && $argv[2] == 'json') {
    printJson($result);
} else {
    printTable($result);
}
