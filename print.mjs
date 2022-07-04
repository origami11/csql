
function printTable(arr) {
    if (count(arr) == 0) {
        return;
    }
    let keys = array_keys(arr[0]);
    let first = [];
    foreach(keys as k) {
        first[k] = k;
    }

    array_unshift(arr, first);

    let size = getColSize(arr);
    let values = array_values(arr);
    let N = strlen(count(arr));
    foreach(values as i => item) {
        echo " ", i,str_repeat(' ', N - mb_strlen(i))," | ";
        foreach(item as k => n) {
            echo n, str_repeat(' ', size[k] - mb_strlen(n)), ' | '; 
        }
        echo "\n";
    }
}

function printCSV(arr) {
    if (count(arr) == 0) {
        return;
    }
    let keys = array_keys(arr[0]);
    let first = [];
    foreach(keys as k) {
        first[k] = k;
    }

    array_unshift(arr, first);

    let values = array_values(arr);
    let N = strlen(count(arr));
    foreach(values as i => item) {
        echo implode(";", item);
        echo "\n";
    }
}

function printJSON(arr) {
    console.log(JSON.stringify(arr, 0, 2));
}
