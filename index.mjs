
import { parseSQL } from "./lib/parse.mjs";
import { evalSQL } from "./lib/eval.mjs";
export { parseSQL } from "./lib/parse.mjs";

export function executeSQL(s, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, config);
}
