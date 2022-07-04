
function printTable($arr) {
    if (count($arr) == 0) {
        return;
    }
    $keys = array_keys($arr[0]);
    $first = [];
    foreach($keys as $k) {
        $first[$k] = $k;
    }

    array_unshift($arr, $first);

    $size = getColSize($arr);
    $values = array_values($arr);
    $N = strlen(count($arr));
    foreach($values as $i => $item) {
        echo " ", $i,str_repeat(' ', $N - mb_strlen($i))," | ";
        foreach($item as $k => $n) {
            echo $n, str_repeat(' ', $size[$k] - mb_strlen($n)), ' | '; 
        }
        echo "\n";
    }
}

function printCSV($arr) {
    if (count($arr) == 0) {
        return;
    }
    $keys = array_keys($arr[0]);
    $first = [];
    foreach($keys as $k) {
        $first[$k] = $k;
    }

    array_unshift($arr, $first);

    $values = array_values($arr);
    $N = strlen(count($arr));
    foreach($values as $i => $item) {
        echo implode(";", $item);
        echo "\n";
    }
}

function printJSON($arr) {
    echo json_encode($arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
