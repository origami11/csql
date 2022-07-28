#!/usr/bin/node

import * as fs from "fs";
import { parseSQL, SQLParser } from "./src/parse.mjs";
import { evalSQL } from "./src/eval.mjs";
import { parseArgs, getArg } from "./src/args.mjs";
import { printCSV, printJSON, printTable } from "./src/print.mjs";

function executeSQL(s, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, config);
}

let opt = parseArgs(process.argv.slice(2));

let arg = {
    "s": 'csv separator',
    "h": 'csv header',
    "o": 'output format "csv" or "json", default "table"',
    "i": 'input format "csv" or "json", default "json"'
};

if (getArg(opt, '-ast')) {
    let p = new SQLParser();
    let tok = p.tokenizeSQL(getArg(opt, '_'));
    console.log('TOKENS', tok);

    let ast = parseSQL(query);
    console.log('AST', JSON.stringify(ast, null, 2));
} else {
    let result = executeSQL(getArg(opt, '_'), opt);
    
    result.then((data) => {   
        let out = getArg(opt, '-o');
        if (out == 'csv') {
            printCSV(data);
        } else if (out == 'json') {
            printJSON(data);
        } else {
    //        console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
            printTable(data);
        }
    });
}
