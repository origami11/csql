
import { parseSQL } from "./src/parse.mjs";
import { evalSQL } from "./src/eval.mjs";

export { parseSQL } from "./src/parse.mjs";

export function executeSQL(s, config) {
    let ast = parseSQL(s);
    return evalSQL(ast, config);
}
