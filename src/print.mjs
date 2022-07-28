import { PrettyTable } from './pretty.mjs';

export function printTable(arr) {
    if (arr.length == 0) {
        return;
    }

    let pt = new PrettyTable();
    pt.fromJson(arr);
    pt.print();
}

export function printCSV(arr, sep = ';') {
    if (arr.length == 0) {
        return;
    }
    let keys = Object.keys(arr[0]);
    let first = [];
    for(let k of keys) {
        first[k] = k;
    }

    arr.unshift(first);

    let values = arr;
    for(let i in values) {
        let item = values[i];
        console.log(Object.values(item).join(sep));
    }
}

export function printJSON(arr) {
    console.log(JSON.stringify(arr, 0, 2));
}
