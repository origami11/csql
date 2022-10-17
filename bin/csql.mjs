#!/usr/bin/env node

import * as fs from "fs";
import { parseSQL, SQLParser } from "../src/parse.mjs";
import { evalSQL } from "../src/eval.mjs";
import { parseArgs, getArg } from "../src/args.mjs";
import { printCSV, printJSON, printTable } from "../src/print.mjs";

function executeSQL(sql, config) {
    let ast = sql.map(s => parseSQL(s));

    function loop(n, result) {
        if (n < ast.length) {
            return evalSQL(ast[n], config, result).then((data) => {
                return loop(n + 1, data);
            });
        }
        return result;
    }
    
    return loop(0, null);
}

let opt = parseArgs(process.argv.slice(2));

let arg = {
    "s": 'csv separator',
    "h": 'csv header',
    "f": 'output format "csv", "json", "table" (default "table")',
    "o": 'output file',
    "i": 'input format "csv","json" (default "json")',
/*    
    // Кеширование запросов в alias
    "cache": '',
    "clear": '',
    "update": '',
    // Виртуальные таблицы
    "remove": '',
    "alias": '',
    "add": '',
    "remove": '',
*/
};

let sql = getArg(opt, '_');

if (sql.length == 0) {
    for(let a in arg) {
        console.log(`  -${a} ${arg[a]}`);
    }
} else if (getArg(opt, '-ast')) {
    let p = new SQLParser();
    let tok = p.tokenizeSQL(sql[0]);
    console.log('TOKENS', tok);

    let ast = parseSQL(sql[0]);
    console.log('AST', JSON.stringify(ast, null, 2));
} else {
    let result = executeSQL(sql, opt);
    
    result.then((data) => {   
        let fmt = getArg(opt, '-f');
        let out = getArg(opt, '-o');
        let result;
        if (fmt == 'csv') {
            result = printCSV(data);
        } else if (fmt == 'json') {
            result = printJSON(data);
        } else {
    //        console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);
            result = printTable(data);
        }
        
        if (out) {
            fs.writeFileSync(out, result);
        } else {
            console.log(result);
        }
    });
}
