import { loadCSV, parseCSV, loadJSON, klawSync } from './files.mjs';
import { getArg } from './args.mjs';
import * as process from "process";

function isNumber(s) {
    return s.match(/^\d+(\.\d+)?$/);
}

let isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};

let state = {index: 0}

﻿function groupBy(arr, key) {
    let result = [];
    for(let item of arr) {
        let name = item[key];
        if (!result.hasOwnProperty(name)) {
            result[name] = {'_group_': []};
            result[name][key] = name;
        }

        result[name]['_group_'].push(item);
    }

    return Object.values(result);
}

function select(fn, arr) {
    return array_map(fn, arr);
}

function orderBy(arr, key, dir) {
    if (dir == 'ASC') {
        arr.sort(function (a, b) {
            if (typeof b[key] == 'number' && typeof a[key] == 'number') {
                return b[key] - a[key];
            }
            return b[key].toString().localeCompare(a[key]);
        });
    } else {
        arr.sort(function (a, b) {
            if (typeof b[key] == 'number' && typeof a[key] == 'number') {
                return a[key] - b[key];
            }
            return a[key].toString().localeCompare(b[key]);
        });
    }
    return arr;
}

function evalExpr(item, expr) {
    if (isObject(expr)) {
        let op = expr['op'];
        if (op == 'call') {
            if (expr['fn'] == 'row_number') {
                return state.index;
            }
            if (expr['fn'] == 'trim') {
                return evalExpr(item, expr['args'][0]).trim();
            }

            if (expr['fn'] == 'concat') {
                let args = expr['args'].map(arg => evalExpr(item, arg));            
                return args.join('');
            }

            // Загрузка csv
            if (expr['fn'] == 'csv') {
                let args = expr['args'].map(arg => evalExpr(item, arg));            
                return loadCSV.apply(null, args);
            }

            // Загрузка директории
            if (expr['fn'] == 'files') {
                let args = expr['args'].map(arg => evalExpr(item, arg));
                let result = klawSync(args[0], { nodir: true });
                return result;
            }
    
            if (expr['fn'] == 'strlen') {
                return evalExpr(item, expr['args'][0]).length;
            }

            if (expr['fn'] == 'contains') {
                let str = evalExpr(item, expr['args'][0]);
                let val = evalExpr(item, expr['args'][1]);
                return str.indexOf(val) >= 0;
            }

            if (expr['fn'] == 'starts_with') {
                let str = evalExpr(item, expr['args'][0]);
                let val = evalExpr(item, expr['args'][1]);
                return str.startsWith(val);
            }

            if (expr['fn'] == 'ends_with') {
                let str = evalExpr(item, expr['args'][0]);
                let val = evalExpr(item, expr['args'][1]);
                return str.endsWith(val);
            }
    
            if (expr['fn'] == 'date') {
                let d = new Date(evalExpr(item, expr['args'][0]) * 1000);
                return d.toLocaleDateString();
            }

            return false;
        }
        if (op == 'NOT') {
            return !evalExpr(item, expr['first']);
        }    
        if (op == 'OR') {
            return evalExpr(item, expr['first']) || evalExpr(item, expr['second']);
        }
        if (op == '+') {
            return evalExpr(item, expr['first']) + evalExpr(item, expr['second']);
        }
        if (op == '-') {
            return evalExpr(item, expr['first']) - evalExpr(item, expr['second']);
        }
        if (op == '*') {
            return evalExpr(item, expr['first']) * evalExpr(item, expr['second']);
        }
        if (op == '/') {
            return evalExpr(item, expr['first']) / evalExpr(item, expr['second']);
        }
        if (op == 'IN') {
            let v = evalExpr(item, expr['first']);
            for(let data of expr['list']) {
                if (v == evalExpr(item, data)) {
                    return true;
                }
            }
            return false;
        }
        if (op == 'AND') {
            return evalExpr(item, expr['first']) && evalExpr(item, expr['second']);
        }    
        if (op == 'LIKE') {
            let str = evalExpr(item, expr['first'])
            return str.indexOf(evalExpr(item, expr['second'])) >= 0;
        }
        if (op == 'NOT-LIKE') {
            let str = evalExpr(item, expr['first'])
            return str.indexOf(evalExpr(item, expr['second'])) < 0;
        }
        if ((op == '<>' || op == '!=')) {
            return evalExpr(item, expr['first']) != evalExpr(item, expr['second']);
        }
        if (op == '=') {       
            return evalExpr(item, expr['first']) == evalExpr(item, expr['second']);
        }
        if (op == '>') {
            return evalExpr(item, expr['first']) > evalExpr(item, expr['second']);
        }
        if (op == '>=') {
            return evalExpr(item, expr['first']) >= evalExpr(item, expr['second']);
        }
        if (op == '<') {
            return evalExpr(item, expr['first']) < evalExpr(item, expr['second']);
        }
        if (op == '~=') {
            return strpos(evalExpr(item, expr['first']), evalExpr(item, expr['second'])) !== false;
        }
    }

    if (expr == 'false') {
        return false;
    }

    if (expr == 'true') {
        return true;
    }

    if (isNumber(expr)) {
        return parseFloat(expr);
    }
    if (expr.charAt(0) == '\'' && expr.charAt(expr.length - 1) == '\'') {
        let s = expr.substring(1, expr.length-1);
        return s;
    }
    return item[expr];
}

function evalAgg(data, k) {
    // AVG, MIN, MAX
    if (k['op'] == 'call' && ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'].includes(k['fn'])) {
        if (k['fn'] == 'IF') {
            if (evalExpr(data, k['args'][0])) {
                return evalExpr(data, k['args'][1]);
            } else {
                return evalExpr(data, k['args'][2]);
            }
            return 0;
        }
        if (k['fn'] == 'COUNT') {
            return data.length;
        }
        if (k['fn'] == 'MAX') {
            val = evalExpr(data[0], k['args'][0]);
            for(let i = 1; i < data.length; i++) {
                val = max(val, evalExpr(data[i], k['args'][0]));
            }
    
            return val;
        }
        if (k['fn'] == 'MIN') {
            val = evalExpr(data[0], k['args'][0]);
            for(let i = 1; i < data.length; i++) {
                val = min(val, evalExpr(data[i], k['args'][0]));
            }
    
            return val;
        }
        if (k['fn'] == 'SUM') {
            let sum = 0;
            for(let item of data) {
                sum += item[k['args'][0]];
            }
    
            return sum;
        }
        throw new Exception('Not implemented ' + k['fn']);
    }
    return evalExpr(data, k);
}

function isAggregate(keys) {
    for (let k of keys) {
        if (isObject(k['input']) 
            && k['input']['op'] == 'call' 
            && ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'].includes(k['input']['fn'])) 
        {
            return true;
        }
    }
    return false;
}

function evalData(ast, table, config) {
    let group = false;
    if (table == null) {
        throw new Error('No data');
    }

    if (ast.hasOwnProperty('json')) {
        let tableA = loadJSON(ast['join']['table'], config);

        let key = ast['using'];
        let result = [];
        for(let item of table) {
            for(let itemA of tableA) {
                if (item.hasOwnProperty(key) && itemA.hasOwnProperty(key) && (item[key] == itemA[key])) {
                    result.push(array_merge(item, itemA));
                }
            }
        }
        table = result;
    }

    if (ast.hasOwnProperty('where')) {
        let result = [];
        for(let n = 0; n < table.length; n++) {
            state.index = n + 1;
            let item = table[n];
            if (evalExpr(item, ast['where'])) {
                result.push(item);
            }
        }
        table = result;
    }

    if (ast.hasOwnProperty('group')) {
        group = true;
        table = groupBy(table, ast['group']['field']);
    }

    if (ast.hasOwnProperty('order')) {
        table = orderBy(table, ast['order']['field'], ast['order']['dir']);
    }

    if (ast.hasOwnProperty('limit')) {
        table = table.splice(0, parseInt(ast['limit']['count'], 10));
    }

    if (ast.hasOwnProperty('select')) {
        let result = [];
        let keys = ast['select'];
        
        if (isAggregate(keys) && !group) {
            let row = [];
            
            for(let n in keys) {
                let key = keys[n];
                let k = key['input'];
                let out = key['output'] ? key['output'] : key['input'];
                if (isObject(k)) {
                    out = key['output'] ? key['output'] : 'out' + n;
                    row[out] = evalAgg(table, k);
                }
            }
            result = [row];
        } else {
            for(let n = 0; n < table.length; n++) {
                let row = table[n];
                let item = {};
                state.index = n + 1;
                for(let j in keys) {
                    let key = keys[j];
                    let k = key['input'];
                    let out = key['output'] ? key['output'] : key['input'];
                    if (isObject(k)) {
                        out = key['output'] ? key['output'] : 'out' + j;
                        item[out] = evalAgg(row.hasOwnProperty('_group_') ? row['_group_'] : row, k);
                    } else if (k == '*') {
                        item = Object.assign({}, item, row);
                        delete item['_group_'];
                    } else {
                        item[out] = row[k];
                    }
                }
                result[n] = item;
            }
        }
        table = result;
    }

    return table;
}

export function evalSQL(ast, config) {
    return new Promise((resolve, reject) => {
        if (ast.hasOwnProperty('from')) {
            let table = [];
            if (isObject(ast['from']['table'])) {
                table = evalExpr({}, ast['from']['table']);   
            } else {
                table = loadJSON(ast['from']['table'], config);
            }
            resolve(evalData(ast, table, config));
        } else {
            let buff = '';
            process.stdin.on('data', data => {
                buff += data;
            }).on('end', () => {
                //console.log(buff);
                let input = getArg(config, '-i');
                let table;
                if (input == 'csv') {
                    table = parseCSV(buff.split("\n"), getArg(config, '-s', ';'), getArg(config, '-h')); 
                } else {
                    table = JSON.parse(buff);
                } 
                
                resolve(evalData(ast, table, config));
            });
        }
    });
}
