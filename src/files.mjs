import * as fs from 'fs';

export function loadcsv(path, sep = ";") {
    let data = fs.readFileSync(path, 'utf-8').split("\n");
    let result = [];
    let first = data.shift();
    first = first.split(sep);

    for(let row of data) {
        let item = row.split(sep);
        let value = {};
        for(let n in first) {
            value[first[n]] = item[n];
        }
        result.push(value);
    }

    return result;
}

export function loadJSON(name, config) {
    let path = process.env.HOME + "/" + name + ".json";
    if (!fs.existsSync(path)) {
        path = name + ".json";
    }
    let result = JSON.parse(fs.readFileSync(path, 'utf-8'), true);
    return result;
}