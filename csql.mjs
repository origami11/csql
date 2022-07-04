#!/usr/bin/node

import * as fs from "fs";
import { parseSQL, SQLParser } from "./parse";
import { evalSQL } from "./eval";
import { printCSV, printJson, printTable } from "./print";

function executeSQL(s, fn, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, fn, config);
}

function loadTable(name, config) {
    path = "./" + name + ".csv";
//  echo "open ", path, "\n";
    data = file(path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    result = [];
    first = array_shift(data);
    first = explode(";", first);

    foreach(data as item) {
        item = explode(";", item);
        foreach(first as n => key) {
            row[key] = item[n];
        }
        result [] = row;
    }

    return result;
}

function loadJSON(name, config) {
    let path = getenv('HOME') + "/" + name + ".json";
    if (!file_exists(path))  {
        path = name + ".json";
    }
//    echo "open ", path, "\n";
    let result = json_decode(file_get_contents(path), true);

    return result;
}

let query = argv[1];
if (isset(argv[2]) && argv[2] == 'ast') {
    let p = new SQLParser();
    let tok = p.tokenizeSQL(query);
    console.log(tok);

    ast = parseSQL(query);
    console.log(ast);

    exit(0);
}

let result = executeSQL(query, 'loadJSON', []);

//print_r(result);

if (isset(argv[2]) && argv[2] == 'csv') {
    printCSV(result);
} else if (isset(argv[2]) && argv[2] == 'json') {
    printJson(result);
} else {
    printTable(result);
}
