#!/usr/bin/node

import * as fs from "fs";
import { parseSQL, SQLParser } from "./src/parse.mjs";
import { evalSQL } from "./src/eval.mjs";
import { printCSV, printJSON, printTable } from "./src/print.mjs";

function executeSQL(s, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, config);
}

let query = process.argv[2];
if (process.argv.length > 3 && process.argv[3] == 'ast') {
    let p = new SQLParser();
    let tok = p.tokenizeSQL(query);
    console.log('TOKENS', tok);

    let ast = parseSQL(query);
    console.log('AST', JSON.stringify(ast, null, 2));
} else {
    let result = executeSQL(query, []);
    
    result.then((data) => {   
        if (process.argv.length > 3 && process.argv[3] == 'csv') {
            printCSV(data);
        } else if (process.argv.length > 3 && process.argv[3] == 'json') {
            printJSON(data);
        } else {
    //        console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
            printTable(data);
        }
    });
}
