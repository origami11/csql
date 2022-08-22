
import { parseSQL, SQLParser } from "./src/parse.mjs";
import { evalSQL } from "./src/eval.mjs";

export const parseSQL = parseSQL;

export function executeSQL(s, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, config);
}
