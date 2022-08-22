
export class SQLParser {
    pos = 0;

    tokenizeSQL(s) {
        let tokens = s.match(new RegExp("[A-Za-z][\\w_]*|(?<Number>\\d+(\\.\\d*)?)|\\*|\\+|-|\\/|!=|~=|=|<>|,|>=|<=|>|<|\\(|\\)|\\'[^\\']*\\'", 'g'));
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
        return tok.match(/^\w+/);
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

        return {'input': input, 'output': alias};
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
        
            if (this.isId(tok) && this.ifTok('(')) {
                let args = this.parseExprList();                 
                this.reqTok(')');
                return {'op': 'call', 'fn': tok, 'args': args};
            }
            return tok;
        }        
        return null;
    }

    parseSQLArgs() {
        let fields = [ this.parseArg() ];
        while(!['FROM', 'WHERE', 'ORDER', 'GROUP', null].includes(this.getTok())) {
            this.reqTok(',');
            fields.push(this.parseArg());
        }
        return fields;
    }

    parseExprList() {
        let args = [ ];
        let first = this.parseExpr()
        if (first) {
            args.push(first);
            while(this.ifTok(',')) {
                args.push(this.parseExpr());
            }           
        }         
        return args;        
    }

    parseUnary() {            
        if (this.ifTok('NOT')) {
            return {'op': 'NOT', 'first': this.parseUnary()};
        }
        let r = this.parseVal()
        return r;
    }

    parseTerm() {    
        let first = this.parseUnary(), op;
        if (this.ifTok('IN')) {
            this.reqTok('('); 
            let args = this.parseExprList(); 
            this.reqTok(')');
                               
            return {'op': 'IN', 'first': first, 'list': args};
        } else if (this.ifTok('NOT')) {
            if (this.ifTok('LIKE')) {
                return {'op': 'NOT-LIKE', 'first': first, 'second': this.parseTerm()};
            }
            throw new Exception("Expected LIKE");
        } else if (op = this.ifTok(['>=', '<=', '>', '<', '<>' , '!=', '=', '~=', 'LIKE'])) {
            return {'op': op, 'first': first, 'second': this.parseTerm()};
        }
        return first;
    }

    parseMul() {
        let first = this.parseTerm(), op;        
        if (op = this.ifTok(['*', '/'])) {
            return {'op': op, 'first': first, 'second': this.parseMul()};
        }
        return first;
    }

    parseSum() {
        let first = this.parseMul(), op;                
        if (op = this.ifTok(['+', '-'])) {
            return {'op': op, 'first': first, 'second': this.parseSum()};
        }
        return first;
    }

    parseBool() {
        let first = this.parseSum(), op;
        if (op = this.ifTok(['AND', 'OR'])) {
            return {'op': op, 'first': first, 'second': this.parseBool()};
        }
        return first;
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
                expr = {'op': 'call', 'fn': tok, 'args': args};
            } else {
                expr = tok;
            }

            if (this.ifTok('AS')) {
                alias = this.parseId();
            }
                        
            ast['from'] = {'table': expr, 'as': alias};
        }

        if (this.ifTok('JOIN')) {
            ast['join'] = {'table': this.parseId()};

            if (this.ifTok('USING')) {
                ast['join']['using'] = this.parseId();
            } else {
                throw new Exception('Expected token USING ');
            }
        }
         
        
        if (this.ifTok('WHERE')) {
            ast['where'] = this.parseBool();
        }

        if (this.ifTok('GROUP')) {
            this.reqTok('BY');
            ast['group'] = {'field': this.parseId()};
        }

        if (this.ifTok('ORDER')) {
            this.reqTok('BY');
            ast['order'] = {'field': this.parseId(), 'dir': 'ASC'};
            let tok;
            if (tok = this.ifTok(['ASC', 'DESC'])) {
                ast['order']['dir'] = tok;
            }
        }

        if (this.ifTok('LIMIT')) {
            ast['limit'] = {'count': this.getTok()};
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
