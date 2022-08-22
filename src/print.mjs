import { PrettyTable } from './pretty.mjs';

export function printTable(arr) {
    if (arr.length == 0) {
        return;
    }

    let pt = new PrettyTable();
    pt.fromJson(arr);
    return pt.toString();
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
    let result = [];
    for(let i in values) {
        let item = values[i];
        result.push(Object.values(item).join(sep));
    }
    return result.join('\n');
}

export function printJSON(arr) {
    return JSON.stringify(arr, 0, 2);
}
