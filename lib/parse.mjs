export class SQLParser {
    constructor() {
        this.pos = 0;
        this.tokens = [];
    }
    tokenizeSQL(s) {
        let tokens = s.match(new RegExp("[A-Za-z][\\w_]*|(?<Number>\\d+(\\.\\d*)?)|\\*|\\+|-|\\/|!=|~=|=|<>|,|\\.|>=|<=|>|<|\\(|\\)|\\'[^\\']*\\'", 'g'));
        return tokens;
    }
    getTok(n = 0) {
        if ((this.i + n) < this.tokens.length) {
            return this.tokens[this.i + n];
        }
        return null;
    }
    nextTok() {
        this.i += 1;
        this.getTok();
    }
    ifTok(name) {
        let result = this.getTok();
        if (Array.isArray(name) && name.includes(result)) {
            this.nextTok();
            return result;
        }
        if (result == name) {
            this.nextTok();
            return result;
        }
        return false;
    }
    reqTok(name) {
        if (this.getTok() != name) {
            throw new Error('Expected token ' + name);
        }
        this.nextTok();
    }
    isId(tok) {
        return typeof tok == 'string' && tok.match(/^\w+/);
    }
    isVar(obj) {
        return obj.op == 'prop';
    }
    parseId() {
        let id = this.getTok();
        if (!this.isId(id)) {
            throw new Error('Expected identifier');
        }
        this.nextTok();
        return id;
    }
    parseArg() {
        let input = this.parseExpr(), alias = null;
        if (this.ifTok('AS')) {
            alias = this.parseId();
        }
        return { 'input': input, 'output': alias };
    }
    parseVar(tok) {
        if (this.ifTok('.') && this.isId(tok)) {
            let access = { op: 'prop', names: [tok] };
            do {
                tok = this.parseId();
                access.names.push(tok);
            } while (this.ifTok('.'));
            return access;
        }
        return tok;
    }
    parseVal() {
        if (this.ifTok('(')) {
            let expr = this.parseExpr();
            this.reqTok(')');
            return expr;
        }
        // Только внутри SELECT?
        if (this.ifTok('*')) {
            return '*';
        }
        let tok = this.getTok();
        if (tok != ')') {
            this.nextTok();
            let result = this.parseVar(tok);
            if ((this.isVar(result) || this.isId(result)) && this.ifTok('(')) {
                let args = this.parseExprList();
                this.reqTok(')');
                return { 'op': 'call', 'fn': tok, 'args': args };
            }
            return result;
        }
        return null;
    }
    parseSQLArgs() {
        let fields = [this.parseArg()];
        while (!['FROM', 'WHERE', 'ORDER', 'GROUP', null].includes(this.getTok())) {
            this.reqTok(',');
            fields.push(this.parseArg());
        }
        return fields;
    }
    parseExprList() {
        let args = [];
        let first = this.parseExpr();
        if (first) {
            args.push(first);
            while (this.ifTok(',')) {
                args.push(this.parseExpr());
            }
        }
        return args;
    }
    parseUnary() {
        if (this.ifTok('NOT')) {
            return { 'op': 'NOT', 'first': this.parseUnary() };
        }
        let r = this.parseVal();
        return r;
    }
    parseFactor() {
        let first = this.parseUnary(), op;
        if (this.ifTok('IN')) {
            this.reqTok('(');
            let args = this.parseExprList();
            this.reqTok(')');
            return { 'op': 'IN', 'first': first, 'list': args };
        }
        else if (this.ifTok('NOT')) {
            if (this.ifTok('LIKE')) {
                return { 'op': 'NOT-LIKE', 'first': first, 'second': this.parseFactor() };
            }
            throw new Error("Expected LIKE");
        }
        else if (op = this.ifTok(['>=', '<=', '>', '<', '<>', '!=', '=', '~=', 'LIKE'])) {
            return { 'op': op, 'first': first, 'second': this.parseFactor() };
        }
        return first;
    }
    parseMul() {
        let result = this.parseFactor(), op;
        while (op = this.ifTok(['*', '/'])) {
            result = { 'op': op, 'first': result, 'second': this.parseFactor() };
        }
        return result;
    }
    parseSum() {
        let result = this.parseMul(), op;
        while (op = this.ifTok(['+', '-'])) {
            result = { 'op': op, 'first': result, 'second': this.parseMul() };
        }
        return result;
    }
    parseBool() {
        let result = this.parseSum(), op;
        while (op = this.ifTok(['AND', 'OR'])) {
            result = { 'op': op, 'first': result, 'second': this.parseSum() };
        }
        return result;
    }
    parseExpr() {
        return this.parseBool();
    }
    parseSQL() {
        let ast = {};
        // Опциональный select
        if (this.ifTok('SELECT')) { }
        ast['select'] = this.parseSQLArgs();
        if (this.ifTok('FROM')) {
            let tok = this.parseId(), expr, alias = null;
            if (this.ifTok('(')) {
                let args = this.parseExprList();
                this.reqTok(')');
                expr = { 'op': 'call', 'fn': tok, 'args': args };
            }
            else {
                expr = tok;
            }
            if (this.ifTok('AS')) {
                alias = this.parseId();
            }
            ast['from'] = { 'table': expr, 'alias': alias };
        }
        if (this.ifTok('JOIN')) {
            let tok = this.parseId(), alias = null;
            if (this.ifTok('AS')) {
                alias = this.parseId();
            }
            ast['join'] = { 'table': tok, 'alias': alias };
            if (this.ifTok('USING')) {
                ast['join']['using'] = this.parseId();
            }
            else {
                throw new Error('Expected token USING ');
            }
        }
        if (this.ifTok('WHERE')) {
            ast['where'] = this.parseBool();
        }
        if (this.ifTok('GROUP')) {
            this.reqTok('BY');
            ast['group'] = { 'field': this.parseId() };
        }
        if (this.ifTok('ORDER')) {
            this.reqTok('BY');
            ast['order'] = { 'field': this.parseId(), 'dir': 'ASC' };
            let tok;
            if (tok = this.ifTok(['ASC', 'DESC'])) {
                ast['order']['dir'] = tok;
            }
        }
        if (this.ifTok('LIMIT')) {
            ast['limit'] = { 'count': this.getTok() };
            this.nextTok();
        }
        let tok = this.getTok();
        if (tok) {
            throw new Error('Unexpected token ' + tok);
        }
        return ast;
    }
    parse(s) {
        this.tokens = this.tokenizeSQL(s);
        this.i = 0;
        return this.parseSQL();
    }
}
export function parseSQL(s) {
    let p = new SQLParser();
    let ast = p.parse(s);
    return ast;
}
