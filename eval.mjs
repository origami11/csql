function groupBy(arr, key) {
    let result = [];
    for(let item of arr) {
        name = item[key];
        if (!isset(result[name])) {
            result[name] = {'_group_': []};
            result[name][key] = name;
        }

        result[name]['_group_'].push(item);
    }

    return array_values(result);
}

function select(fn, arr) {
    return array_map(fn, arr);
}

function orderBy(arr, key, dir) {
    if (dir == 'ASC') {
        sort(arr, function (a, b) {
    //        return strnatcmp(b[key], a[key]);
            return strnatcmp(b[key], a[key]);
        });
    } else {
        sort(arr, function (a, b) {
            return strnatcmp(a[key], b[key]);
        });
    }
    return arr;
}

function evalExpr(item, expr) {
    if (Array.isArray(expr)) {
        let op = expr['op'];
        if (op == 'call') {
            if (expr['fn'] == 'trim') {
                return trim(evalExpr(item, expr['args'][0]));
            }
    
            if (expr['fn'] == 'strlen') {
                return strlen(evalExpr(item, expr['args'][0]));
            }
    
            if (k['fn'] == 'date') {
                return date('d.m.Y H:i', evalExpr(item, k['args'][0]));
            }

            return false;
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
            v = evalExpr(item, expr['first']);
            for(let expr of expr['list']) {
                if (v == evalExpr(item, expr)) {
                    return true;
                }
            }
            return false;
        }
        if (op == 'AND') {
            return evalExpr(item, expr['first']) && evalExpr(item, expr['second']);
        }    
        if (op == 'LIKE') {
            return strpos(evalExpr(item, expr['first']), evalExpr(item, expr['second'])) !== false;
        }
        if (op == 'NOT-LIKE') {
            return strpos(evalExpr(item, expr['first']), evalExpr(item, expr['second'])) === false;
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

    if (is_numeric(expr)) {
        return floatval(expr);
    }
    if (expr[0] == '\'' && expr[strlen(expr) - 1] == '\'') {
        return substr(expr, 1, -1);
    }
    return item[expr];
}

function evalAgg(data, k) {
    // AVG, MIN, MAX
    if (k['op'] == 'call' && in_array(k['fn'], ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'])) {
        if (k['fn'] == 'IF') {
            if (evalExpr(data, k['args'][0])) {
                return evalExpr(data, k['args'][1]);
            } else {
                return evalExpr(data, k['args'][2]);
            }
            return 0;
        }
        if (k['fn'] == 'COUNT') {
            return count(data);
        }
        if (k['fn'] == 'MAX') {
            val = evalExpr(data[0], k['args'][0]);
            for(let i = 1; i < count(data); i++) {
                val = max(val, evalExpr(data[i], k['args'][0]));
            }
    
            return val;
        }
        if (k['fn'] == 'MIN') {
            val = evalExpr(data[0], k['args'][0]);
            for(let i = 1; i < count(data); i++) {
                val = min(val, evalExpr(data[i], k['args'][0]));
            }
    
            return val;
        }
        if (k['fn'] == 'SUM') {
            sum = 0;
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
        if (Array.isArray(k['input']) 
            && k['input']['op'] == 'call' 
            && in_array(k['input']['fn'], ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'])) 
        {
            return true;
        }
    }
    return false;
}

export function evalSQL(ast, fn, config) {
    let group = false, table = [];
    if (ast.hasOwnProperty('from')) {
        table = fn.call(null, ast['from']['table'], config);
    } else {
        // table = json_decode(stream_get_contents(fopen('php://stdin', 'r')), true);
        /* const process = require("process")
        process.stdin.on('data', data => {
            console.log(data.toString())
        })
        */
    }

    if (table == null) {
        throw new Error('No data');
    }

    if (ast.hasOwnProperty('json')) {
        let tableA = fn.call(null, ast['join']['table'], config);

        let key = ast['using'];
        let result = [];
        for(let item of table) {
            for(let itemA of tableA) {
                if (isset(item[key]) && isset(itemA[key]) && (item[key] == itemA[key])) {
                    result.push(array_merge(item, itemA));
                }
            }
        }
        table = result;
    }

    if (ast.hasOwnProperty('where')) {
        let result = [];
        for(let item of table) {
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
        table = table.splice(0, intval(ast['limit']['count']));
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
                if (Array.isArray(k)) {
                    out = key['output'] ? key['output'] : 'out' + n;
                    row[out] = evalAgg(table, k);
                }
            }
            result = [row];
        } else {
            for(let n in table) {
                let row = table[n];
                let item = [];
                for(let j in keys) {
                    let key = keys[j];
                    let k = key['input'];
                    let out = key['output'] ? key['output'] : key['input'];
                    if (Array.isArray(k)) {
                        out = key['output'] ? key['output'] : 'out' + j;
                        item[out] = evalAgg(isset(row['_group_']) ? row['_group_'] : row, k);
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
