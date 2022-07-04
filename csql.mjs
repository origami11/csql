#!/usr/bin/node

import * as fs from "fs";
import { parseSQL, SQLParser } from "./parse.mjs";
import { evalSQL } from "./eval.mjs";
import { printCSV, printJSON, printTable } from "./print.mjs";

function executeSQL(s, fn, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, fn, config);
}

function loadTable(name, config) {
    let path = "./" + name + ".csv";

    let data = fs.readFileSync(path, 'utf-8').split(';');
    let result = [];
    let first = data.shift();
    first = first.split(';');

    for(let item of data) {
        let item = item.split(';');
        for(let n in first) {
            row[first[n]] = item[n];
        }
        result.push(row);
    }

    return result;
}

function loadJSON(name, config) {
    let path = process.env.HOME + "/" + name + ".json";
    if (!fs.existsSync(path)) {
        path = name + ".json";
    }
    let result = JSON.parse(fs.readFileSync(path, 'utf-8'), true);
    return result;
}

let query = process.argv[2];
if (process.argv.length > 3 && process.argv[3] == 'ast') {
    let p = new SQLParser();
    let tok = p.tokenizeSQL(query);
    console.log('TOKENS', tok);

    let ast = parseSQL(query);
    console.log('AST', JSON.stringify(ast, null, 2));
} else {
    let result = executeSQL(query, loadJSON, []);

    if (process.argv.length > 3 && process.argv[3] == 'csv') {
        printCSV(result);
    } else if (process.argv.length > 3 && process.argv[3] == 'json') {
        printJSON(result);
    } else {
        console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
        printTable(result);
    }
}