
class SQLParser {
    pos = 0;

    tokenizeSQL(s) {
        let tokens = array();
        preg_match_all('/\w+|\*|\+|-|\/|!=|~=|=|<>|,|>|<|\(|\)|\'[^\']*\'/', s, tokens);
        return tokens[0];
    }

    getTok(n = 0) {
        if ((this.i + n) < count(this.tokens)) {
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
        if (Array.isArray(name) && in_array(result, name)) {
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
            throw new Exception('Expected token ' + name);
        }       
        this.nextTok(); 
    }

     isId(tok) {
        // number or word
        return preg_match('/^\w+/', tok);
    }

    parseId() {
        let id = this.getTok();
        if (!this.isId(id)) {
            throw new Exception('Expected identifier');
        }
        this.nextTok();
        return id;
    }

    parseArg() {
        let input = this.parseExpr();
        if (this.ifTok('AS')) {
            return ['input' => input, 'output' => this.parseId()];
        }

        return ['input' => input, 'output' => null];
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
        this.nextTok();
        
        if (this.isId(tok) && this.ifTok('(')) {
            let args = this.parseExprList(); 
            this.reqTok(')');
            return ['op' => 'call', 'fn' => tok, 'args' => args];
        }
        
        return tok;
    }

    parseSQLArgs() {
        let fields = [ this.parseArg() ];
        while(!in_array(this.getTok(), ['FROM', 'WHERE', 'ORDER', 'GROUP', null])) {
            this.reqTok(',');
            fields[] = this.parseArg();
        }
        return fields;
    }

     parseExprList() {
        let args = [ this.parseExpr() ];

        while(this.ifTok(',')) {
            args[] = this.parseExpr();
        }                    
        return args;
    }

    parseTerm() {    
        let first = this.parseVal();
        if (this.ifTok('IN')) {
            this.reqTok('('); 
            args = this.parseExprList(); 
            this.reqTok(')');
                                
            return ['op' => 'IN', 'first' => first, 'list' => args];
        } else if (this.ifTok('NOT')) {
            if (this.ifTok('LIKE')) {
                return ['op' => 'NOT-LIKE', 'first' => first, 'second' => this.parseExpr()];
            }
            throw new Exception("Expected LIKE");
        } else if (op = this.ifTok(['>', '<', '<>' , '!=', '=', '~=', 'LIKE'])) {
            return ['op' => op, 'first' => first, 'second' => this.parseExpr()];
        }
        return first;
    }

    parseMul() {
        let first = this.parseTerm();        
        if (op = this.ifTok(['*', '/'])) {
            return ['op' => op, 'first' => first, 'second' => this.parseMul()];
        }
        return first;
    }

    parseSum() {
        let first = this.parseMul();        
        if (op = this.ifTok(['+', '-'])) {
            return ['op' => op, 'first' => first, 'second' => this.parseSum()];
        }
        return first;
    }

    parseBool() {
        let first = this.parseSum();        
        if (op = this.ifTok(['AND', 'OR'])) {
            return ['op' => op, 'first' => first, 'second' => this.parseBool()];
        }
        return first;
    }

    parseExpr() {
        return this.parseBool();
    }

     parseSQL() {
        let ast = [];
        if (this.ifTok('SELECT')) {
            ast['select'] = this.parseSQLArgs();

            if (this.ifTok('FROM')) {
                ast['from'] = ['table' => this.parseId()];
            }

            if (this.ifTok('JOIN')) {
                ast['join'] = ['table' => this.parseId()];

                if (this.ifTok('USING')) {
                    ast['using'] = this.parseId();
                } else {
                    throw new Exception('Expected token USING ');
                }
            }
        } 
        
        if (this.ifTok('WHERE')) {
            ast['where'] = this.parseBool();
        }

        if (this.ifTok('GROUP')) {
            this.reqTok('BY');
            ast['group'] = ['field' => this.parseId()];
        }

        if (this.ifTok('ORDER')) {
            this.reqTok('BY');
            ast['order'] = ['field' => this.parseId(), 'dir' => 'ASC'];
            
            if (tok = this.ifTok(['ASC', 'DESC'])) {
                ast['order']['dir'] = tok;
            }
        }

        if (this.ifTok('LIMIT')) {
            ast['limit'] = ['count' => this.getTok()];
            this.nextTok();
        }

        tok = this.getTok();
        if (tok) {
            throw new Exception('Unexpected token ' + tok);
        }
        return ast;
    }

    parse(s) {
        this.tokens = this.tokenizeSQL(s);
        this.i = 0;
        return this.parseSQL();
    }
}

function parseSQL(s) {
    p = new SQLParser();
    ast = p.parse(s);
    return ast;
}

