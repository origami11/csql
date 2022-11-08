import { loadCSV, parseCSV, loadJSON, klawSync } from './files.mjs';
import { getArg } from './args.mjs';
import * as process from "process";


// Описание таблицы 
class Table {
    // Данные
    data = [];
    // Альтернативные названия
    info = {
        alias: {}
    };
}

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
        let name = item[key]; // getItem
        if (!result.hasOwnProperty(name)) {
            result[name] = {'_group_': []};
            result[name][key] = name;
        }

        result[name]['_group_'].push(item);
    }

    return Object.values(result);
}

function orderBy(arr, key, dir) {
    function compare (a, b) {
        if (typeof b[key] == 'number' && typeof a[key] == 'number') {
            return b[key] - a[key];
        }
        return b[key].toString().localeCompare(a[key]);
    }
    
    if (dir == 'ASC') {
        arr.sort(compare);
    } else {
        arr.sort(function (a, b) {
            return compare(b, a);
        });
    }
    return arr;
}

function evalExpr(item, expr, info) {
    if (isObject(expr)) {
        let op = expr['op'];
        if (op == 'call') {
            if (expr['fn'] == 'row_number') {
                return state.index;
            }
            if (expr['fn'] == 'trim') {
                return evalExpr(item, expr['args'][0], info).trim();
            }

            if (expr['fn'] == 'concat') {
                let args = expr['args'].map(arg => evalExpr(item, arg, info));
                return args.join('');
            }

            // Загрузка csv
            if (expr['fn'] == 'csv') {
                let args = expr['args'].map(arg => evalExpr(item, arg, info));
                return loadCSV.apply(null, args);
            }

            if (expr['fn'] == 'json') {
                let args = expr['args'].map(arg => evalExpr(item, arg, info));            
                return loadJSON.apply(null, args);
            }

            // Загрузка директории
            if (expr['fn'] == 'files') {
                let args = expr['args'].map(arg => evalExpr(item, arg, info));
                let result = klawSync(args[0], { nodir: true });
                return result;
            }
    
            if (expr['fn'] == 'strlen') {
                return evalExpr(item, expr['args'][0], info).length;
            }

            if (expr['fn'] == 'contains') {
                let str = evalExpr(item, expr['args'][0], info);
                let val = evalExpr(item, expr['args'][1], info);
                return str.indexOf(val) >= 0;
            }

            if (expr['fn'] == 'starts_with') {
                let str = evalExpr(item, expr['args'][0], info);
                let val = evalExpr(item, expr['args'][1], info);
                return str.startsWith(val);
            }

            if (expr['fn'] == 'ends_with') {
                let str = evalExpr(item, expr['args'][0], info);
                let val = evalExpr(item, expr['args'][1], info);
                return str.endsWith(val);
            }
    
            if (expr['fn'] == 'date') {
                let d = new Date(evalExpr(item, expr['args'][0], info) * 1000);
                return d.toLocaleDateString();
            }

            return false;
        }
        if (op == 'NOT') {
            return !evalExpr(item, expr['first'], info);
        }    
        if (op == 'OR') {
            return evalExpr(item, expr['first'], info) || evalExpr(item, expr['second'], info);
        }
        if (op == '+') {
            return evalExpr(item, expr['first'], info) + evalExpr(item, expr['second'], info);
        }
        if (op == '-') {
            return evalExpr(item, expr['first'], info) - evalExpr(item, expr['second'], info);
        }
        if (op == '*') {
            return evalExpr(item, expr['first'], info) * evalExpr(item, expr['second'], info);
        }
        if (op == '/') {
            return evalExpr(item, expr['first'], info) / evalExpr(item, expr['second'], info);
        }
        if (op == 'IN') {
            let v = evalExpr(item, expr['first'], info);
            for(let data of expr['list']) {
                if (v == evalExpr(item, data, info)) {
                    return true;
                }
            }
            return false;
        }
        if (op == 'AND') {
            return evalExpr(item, expr['first'], info) && evalExpr(item, expr['second'], info);
        }    
        if (op == 'LIKE') {
            let str = evalExpr(item, expr['first'], info);
            return str?.indexOf(evalExpr(item, expr['second'], info)) >= 0;
        }
        if (op == 'NOT-LIKE') {
            let str = evalExpr(item, expr['first'], info);
            return str?.indexOf(evalExpr(item, expr['second'], info)) < 0;
        }
        if ((op == '<>' || op == '!=')) {
            return evalExpr(item, expr['first'], info) != evalExpr(item, expr['second'], info);
        }
        if (op == '=') {       
            return evalExpr(item, expr['first'], info) == evalExpr(item, expr['second'], info);
        }
        if (op == '>') {
            return evalExpr(item, expr['first'], info) > evalExpr(item, expr['second'], info);
        }
        if (op == '>=') {
            return evalExpr(item, expr['first'], info) >= evalExpr(item, expr['second'], info);
        }
        if (op == '<') {
            return evalExpr(item, expr['first'], info) < evalExpr(item, expr['second'], info);
        }
        if (op == '~=') {
            let str = evalExpr(item, expr['first'], info);
            return str?.indexOf(evalExpr(item, expr['second'], info)) > 0;
        }
        if (op == 'prop') {
            let key = expr['names'];
            let value = item;
            let first = key[0];
            if (isAlias(info, first)) {
                if (info.alias[first] === true) {
                    value = item;
                } else {
                    value = item[info.alias[first]];
                }
            } else {
                value = getItem(value, first);
            }
            for(let n = 1; n < key.length; n++) {
                value = value[key[n]];
            }            
            return value;
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
    return getItem(item, expr);
}

function isAlias(table, name) {
    return table.alias.hasOwnProperty(name);
}

function getItem(item, key) {
    if (item.hasOwnProperty(key)) {
        return item[key];
    }
    if (item.hasOwnProperty('$0')) {
        return item['$0'][key];
    }
    throw new Error('undefined key' + key);
}

function evalAgg(data, k, info) {
    // AVG, MIN, MAX
    if (k['op'] == 'call' && ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'].includes(k['fn'])) {
        if (k['fn'] == 'IF') {
            if (evalExpr(data, k['args'][0], info)) {
                return evalExpr(data, k['args'][1], info);
            } else {
                return evalExpr(data, k['args'][2], info);
            }
            return 0;
        }
        if (k['fn'] == 'COUNT') {
            return data.length;
        }
        if (k['fn'] == 'MAX') {
            let val = evalExpr(data[0], k['args'][0], info);
            for(let i = 1; i < data.length; i++) {
                val = Math.max(val, evalExpr(data[i], k['args'][0], info));
            }
    
            return val;
        }
        if (k['fn'] == 'MIN') {
            let val = evalExpr(data[0], k['args'][0], info);
            for(let i = 1; i < data.length; i++) {
                val = Math.min(val, evalExpr(data[i], k['args'][0], info));
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
        throw new Error('Not implemented ' + k['fn']);
    }
    return evalExpr(data, k, info);
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
    if (table.data == null) {
        throw new Error('No data');
    }

    if (ast.hasOwnProperty('join')) {
        let tableA = loadJSON(ast['join']['table'], config);
            
        table.info.alias[ast['join']['table']] = '$0';
        if (ast['from']['alias']) {
            table.info.alias[ast['join']['alias']] = '$0';
        }

        let key = ast['join']['using'];
        //let result = [];
        for(let item of table.data) {
            for(let itemA of tableA) {
                if (item.hasOwnProperty(key) && itemA.hasOwnProperty(key) && (item[key] == itemA[key])) {
                    item['$0'] = itemA;
                    // result.push(Object.assign({}, item, itemA));
                }
            }
        }
        //table.data = result;
    }

    if (ast.hasOwnProperty('where')) {
        let result = [];
        for(let n = 0; n < table.data.length; n++) {
            state.index = n + 1;
            let item = table.data[n];
            if (evalExpr(item, ast['where'], table.info)) {
                result.push(item);
            }
        }
        table.data = result;
    }

    if (ast.hasOwnProperty('group')) {
        group = true;
        table.data = groupBy(table.data, ast['group']['field']);
    }

    if (ast.hasOwnProperty('order')) {
        table.data = orderBy(table.data, ast['order']['field'], ast['order']['dir']);
    }

    if (ast.hasOwnProperty('limit')) {
        table.data = table.data.splice(0, parseInt(ast['limit']['count'], 10));
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
                    row[out] = evalAgg(table, k, table.info);
                }
            }
            result = [row];
        } else {
            for(let n = 0; n < table.data.length; n++) {
                let row = table.data[n];
                let item = {};
                state.index = n + 1;
                for(let j in keys) {
                    let key = keys[j];
                    let k = key['input'];
                    let out = key['output'] ? key['output'] : key['input'];
                    if (isObject(k)) {
                        out = key['output'] ? key['output'] : 'out' + j;
                        item[out] = evalAgg(row.hasOwnProperty('_group_') ? row['_group_'] : row, k, table.info);
                    } else if (k == '*') {
                        item = Object.assign({}, item, row); // row.$0
                        delete item['_group_'];
                    } else {
                        item[out] = getItem(row, k);
                    }
                }
                result[n] = item;
            }
        }
        table.data = result;
    }

    return table.data;
}

export function evalSQL(ast, config, data) {
    return new Promise((resolve, reject) => {
        if (ast.hasOwnProperty('from')) {
            let table = new Table();

            if (ast['from']['alias']) {
                table.info.alias[ast['from']['alias']] = true;
            }
            if (isObject(ast['from']['table'])) {
                table.data = evalExpr({}, ast['from']['table'], table.info);   
            } else {
                table.data = loadJSON(ast['from']['table'], config);
                table.info.alias[ast['from']['table']] = true;
            }
            resolve(evalData(ast, table, config));
        } else if (data) {
            let table = new Table();
            table.data = data;
            resolve(evalData(ast, table, config));
        } else {
            let buff = '';
            process.stdin.on('data', data => {
                buff += data;
            }).on('end', () => {
                //console.log(buff);
                let input = getArg(config, '-i');
                let table = new Table();
                if (input == 'csv') {
                    table.data = parseCSV(buff.split("\n"), getArg(config, '-s', ';'), getArg(config, '-h')); 
                } else {
                    table.data = JSON.parse(buff);
                } 
                
                resolve (evalData(ast, table, config));
            });
        }
    });
}
