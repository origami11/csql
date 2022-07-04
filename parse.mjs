<?php

class SQLParser {
    public $pos = 0;

    function debug($pref = '') {
        echo '<', $pref;
        print_r(this.getTok());
        echo '>';       
    }

    function tokenizeSQL($s) {
        $tokens = array();
        preg_match_all('/\w+|\*|\+|-|\/|!=|~=|=|<>|,|>|<|\(|\)|\'[^\']*\'/', $s, $tokens);
        return $tokens[0];
    }

    function getTok($n = 0) {
        if ((this.i + $n) < count(this.tokens)) {
            return this.tokens[this.i + $n];
        }
        return null;
    } 

    function nextTok() {
        this.i += 1;
        this.getTok();
    } 

    function ifTok($name) {
        $result = this.getTok();
        if (is_array($name) && in_array($result, $name)) {
            this.nextTok();
            return $result;
        }           
        if ($result == $name) {
            this.nextTok();
            return $result;
        }
        return false;
    }

    function reqTok($name) {
        if (this.getTok() != $name) {
            throw new Exception('Expected token ' . $name);
        }       
        this.nextTok(); 
    }

    function isId($tok) {
        // number or word
        return preg_match('/^\w+$/', $tok);
    }

    function parseId() {
        $id = this.getTok();
        if (!this.isId($id)) {
            throw new Exception('Expected identifier');
        }
        this.nextTok();
        return $id;
    }

    function parseArg() {
        $input = this.parseExpr();
        if (this.ifTok('AS')) {
            return ['input' => $input, 'output' => this.parseId()];
        }

        return ['input' => $input, 'output' => null];
    }

    function parseVal() {
        if (this.ifTok('(')) {
            $expr = this.parseExpr(); 
            this.reqTok(')');
            return $expr;
        }

        // Только внутри SELECT?
        if (this.ifTok('*')) {
            return '*';
        }

        $tok = this.getTok();
        this.nextTok();
        
        if (this.isId($tok) && this.ifTok('(')) {
            $args = this.parseExprList(); 
            this.reqTok(')');
            return ['op' => 'call', 'fn' => $tok, 'args' => $args];
        }
        
        return $tok;
    }

    function parseSQLArgs() {
        $fields = [ this.parseArg() ];
        while(!in_array(this.getTok(), ['FROM', 'WHERE', 'ORDER', 'GROUP', null])) {
            this.reqTok(',');
            $fields[] = this.parseArg();
        }
        return $fields;
    }

    function parseExprList() {
        $args = [ this.parseExpr() ];

        while(this.ifTok(',')) {
            $args[] = this.parseExpr();
        }                    
        return $args;
    }

    function parseTerm() {    
        $first = this.parseVal();
        if (this.ifTok('IN')) {
            this.reqTok('('); 
            $args = this.parseExprList(); 
            this.reqTok(')');
                                
            return ['op' => 'IN', 'first' => $first, 'list' => $args];
        } else if (this.ifTok('NOT')) {
            if (this.ifTok('LIKE')) {
                return ['op' => 'NOT-LIKE', 'first' => $first, 'second' => this.parseExpr()];
            }
            throw new Exception("Expected LIKE");
        } else if ($op = this.ifTok(['>', '<', '<>' , '!=', '=', '~=', 'LIKE'])) {
            return ['op' => $op, 'first' => $first, 'second' => this.parseExpr()];
        }
        return $first;
    }

    function parseMul() {
        $first = this.parseTerm();        
        if ($op = this.ifTok(['*', '/'])) {
            return ['op' => $op, 'first' => $first, 'second' => this.parseMul()];
        }
        return $first;
    }

    function parseSum() {
        $first = this.parseMul();        
        if ($op = this.ifTok(['+', '-'])) {
            return ['op' => $op, 'first' => $first, 'second' => this.parseSum()];
        }
        return $first;
    }

    function parseBool() {
        $first = this.parseSum();        
        if ($op = this.ifTok(['AND', 'OR'])) {
            return ['op' => $op, 'first' => $first, 'second' => this.parseBool()];
        }
        return $first;
    }

    function parseExpr() {
        return this.parseBool();
    }

    function parseSQL() {
        $ast = [];
        if (this.ifTok('SELECT')) {
            $ast['select'] = this.parseSQLArgs();

            if (this.ifTok('FROM')) {
                $ast['from'] = ['table' => this.parseId()];
            }

            if (this.ifTok('JOIN')) {
                $ast['join'] = ['table' => this.parseId()];

                if (this.ifTok('USING')) {
                    $ast['using'] = this.parseId();
                } else {
                    throw new Exception('Expected token USING ');
                }
            }
        } 
        
        if (this.ifTok('WHERE')) {
            $ast['where'] = this.parseBool();
        }

        if (this.ifTok('GROUP')) {
            this.reqTok('BY');
            $ast['group'] = ['field' => this.parseId()];
        }

        if (this.ifTok('ORDER')) {
            this.reqTok('BY');
            $ast['order'] = ['field' => this.parseId(), 'dir' => 'ASC'];
            
            if ($tok = this.ifTok(['ASC', 'DESC'])) {
                $ast['order']['dir'] = $tok;
            }
        }

        if (this.ifTok('LIMIT')) {
            $ast['limit'] = ['count' => this.getTok()];
            this.nextTok();
        }

        $tok = this.getTok();
        if ($tok) {
            throw new Exception('Unexpected token ' . $tok);
        }
        return $ast;
    }

    function parse($s) {
        this.tokens = this.tokenizeSQL($s);
        this.i = 0;
        return this.parseSQL();
    }
}

function parseSQL($s) {
    $p = new SQLParser();
    $ast = $p->parse($s);
    return $ast;
}

