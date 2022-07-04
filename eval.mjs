function groupBy($arr, $key) {
    $result = [];
    foreach($arr as $item) {
        $name = $item[$key];
        if (!isset($result[$name])) {
            $result[$name] = ['_group_' => []];
            $result[$name][$key] = $name;
        }

        $result[$name]['_group_'][] = $item;
    }

    return array_values($result);
}

function select($fn, $arr) {
    return array_map($fn, $arr);
}

function orderBy($arr, $key, $dir) {
    if ($dir == 'ASC') {
        usort($arr, function ($a, $b) use($key) {
    //        return strnatcmp($b[$key], $a[$key]);
            return strnatcmp($b[$key], $a[$key]);
        });
    } else {
        usort($arr, function ($a, $b) use($key) {
            return strnatcmp($a[$key], $b[$key]);
        });
    }
    return $arr;
}

function getColSize($arr) {
    $size = [];
    foreach($arr as $item) {
        foreach($item as $k => $n) {
            if (!isset($size[$k])) $size[$k] = 0;
            $size[$k] = max($size[$k], mb_strlen($n));
        }
    }
    return $size;
}

function evalExpr($item, $expr) {
    if (is_array($expr)) {
        $op = $expr['op'];
        if ($op == 'call') {
            if ($expr['fn'] == 'trim') {
                return trim(evalExpr($item, $expr['args'][0]));
            }
    
            if ($expr['fn'] == 'strlen') {
                return strlen(evalExpr($item, $expr['args'][0]));
            }
    
            if ($k['fn'] == 'date') {
                return date('d.m.Y H:i', evalExpr($item, $k['args'][0]));
            }

            return false;
        }
        if ($op == 'OR') {
            return evalExpr($item, $expr['first']) || evalExpr($item, $expr['second']);
        }
        if ($op == '+') {
            return evalExpr($item, $expr['first']) + evalExpr($item, $expr['second']);
        }
        if ($op == '-') {
            return evalExpr($item, $expr['first']) - evalExpr($item, $expr['second']);
        }
        if ($op == '*') {
            return evalExpr($item, $expr['first']) * evalExpr($item, $expr['second']);
        }
        if ($op == '/') {
            return evalExpr($item, $expr['first']) / evalExpr($item, $expr['second']);
        }
        if ($op == 'IN') {
            $v = evalExpr($item, $expr['first']);
            foreach($expr['list'] as $expr) {
                if ($v == evalExpr($item, $expr)) {
                    return true;
                }
            }
            return false;
        }
        if ($op == 'AND') {
            return evalExpr($item, $expr['first']) && evalExpr($item, $expr['second']);
        }    
        if ($op == 'LIKE') {
            return strpos(evalExpr($item, $expr['first']), evalExpr($item, $expr['second'])) !== false;
        }
        if ($op == 'NOT-LIKE') {
            return strpos(evalExpr($item, $expr['first']), evalExpr($item, $expr['second'])) === false;
        }
        if (($op == '<>' || $op == '!=')) {
            return evalExpr($item, $expr['first']) != evalExpr($item, $expr['second']);
        }
        if ($op == '=') {
            return evalExpr($item, $expr['first']) == evalExpr($item, $expr['second']);
        }
        if ($op == '>') {
            return evalExpr($item, $expr['first']) > evalExpr($item, $expr['second']);
        }
        if ($op == '<') {
            return evalExpr($item, $expr['first']) < evalExpr($item, $expr['second']);
        }
        if ($op == '~=') {
            return strpos(evalExpr($item, $expr['first']), evalExpr($item, $expr['second'])) !== false;
        }
    }

    if ($expr == 'false') {
        return false;
    }

    if ($expr == 'true') {
        return true;
    }

    if (is_numeric($expr)) {
        return floatval($expr);
    }
    if ($expr[0] == '\'' && $expr[strlen($expr) - 1] == '\'') {
        return substr($expr, 1, -1);
    }
    return $item[$expr];
}

function evalAgg($data, $k) {
    // AVG, MIN, MAX
    if ($k['op'] == 'call' && in_array($k['fn'], ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'])) {
        if ($k['fn'] == 'IF') {
            if (evalExpr($data, $k['args'][0])) {
                return evalExpr($data, $k['args'][1]);
            } else {
                return evalExpr($data, $k['args'][2]);
            }
            return 0;
        }
        if ($k['fn'] == 'COUNT') {
            return count($data);
        }
        if ($k['fn'] == 'MAX') {
            $val = evalExpr($data[0], $k['args'][0]);
            for($i = 1; $i < count($data); $i++) {
                $val = max($val, evalExpr($data[$i], $k['args'][0]));
            }
    
            return $val;
        }
        if ($k['fn'] == 'MIN') {
            $val = evalExpr($data[0], $k['args'][0]);
            for($i = 1; $i < count($data); $i++) {
                $val = min($val, evalExpr($data[$i], $k['args'][0]));
            }
    
            return $val;
        }
        if ($k['fn'] == 'SUM') {
            $sum = 0;
            foreach($data as $item)  {
                $sum += $item[$k['args'][0]];
            }
    
            return $sum;
        }
        throw new Exception('Not implemented ' . $k['fn']);
    }
    return evalExpr($data, $k);
}

function isAggregate($keys) {
    foreach ($keys as $k) {
        if (is_array($k['input']) 
            && $k['input']['op'] == 'call' 
            && in_array($k['input']['fn'], ['COUNT', 'SUM', 'MIN', 'MAX', 'AVG'])) 
        {
            return true;
        }
    }
    return false;
}

function evalSQL($ast, $fn, $config) {
    $group = false;
    if (isset($ast['from'])) {
        $table = call_user_func($fn, $ast['from']['table'], $config);
    } else {
        $table = json_decode(stream_get_contents(fopen('php://stdin', 'r')), true);
    }

    if (empty($table)) {
        throw new Exception('No data');
    }

    if (isset($ast['join'])) {
        $tableA = call_user_func($fn, $ast['join']['table'], $config);

        $key = $ast['using'];
        $result = [];
        foreach($table as $item) {
            foreach($tableA as $itemA) {
                if (isset($item[$key]) && isset($itemA[$key]) && ($item[$key] == $itemA[$key])) {
                    $result[] = array_merge($item, $itemA);
                }
            }
        }
        $table = $result;
    }

    if (isset($ast['where'])) {
        $result = [];
        foreach($table as $item) {
            if (evalExpr($item, $ast['where'])) {
                $result[] = $item;
            }
        }
        $table = $result;
    }

    if (isset($ast['group'])) {
        $group = true;
        $table = groupBy($table, $ast['group']['field']);
    }

    if (isset($ast['order'])) {
        $table = orderBy($table, $ast['order']['field'], $ast['order']['dir']);
    }

    if (isset($ast['limit'])) {
        $table = array_splice($table, 0, intval($ast['limit']['count']));
    }

    if (isset($ast['select'])) {
        $result = [];
        $keys = $ast['select'];

        if (isAggregate($keys) && !$group) {
            $row = [];
            foreach($keys as $n => $key) {
                $k = $key['input'];
                $out = $key['output'] ? $key['output'] : $key['input'];
                if (is_array($k)) {
                    $out = $key['output'] ? $key['output'] : 'out' . $n;
                    $row[$out] = evalAgg($table, $k);
                }
            }
            $result = [$row];
        } else {
            foreach($table as $n => $row) {
                $item = [];
                foreach($keys as $j => $key) {
                    $k = $key['input'];
                    $out = $key['output'] ? $key['output'] : $key['input'];
                    if (is_array($k)) {
                        $out = $key['output'] ? $key['output'] : 'out' . $j;
                        $item[$out] = evalAgg(isset($row['_group_']) ? $row['_group_'] : $row, $k);
                    } else if ($k == '*') {
                        $item = array_merge($item, $row);
                        unset($item['_group_']);
                    } else {
                        $item[$out] = $row[$k];
                    }
                }
                $result[$n] = $item;
            }
        }
        $table = $result;
    }

    return $table;
}
