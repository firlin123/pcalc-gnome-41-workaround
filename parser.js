const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
let Lexer = Me.imports.lexer.Lexer;
let {
  TOK_UNKNOWN, TOK_END, TOK_NUM, TOK_ADD, TOK_SUB, TOK_MUL, TOK_DIV, TOK_EXP,
  TOK_LPAREN, TOK_RPAREN, TOK_IDENT, TOK_COMMA
} = Me.imports.lexer;

function reassignGlobals() {
  Lexer = Me.imports.lexer.Lexer;
  TOK_UNKNOWN = Me.imports.lexer.TOK_UNKNOWN;
  TOK_END = Me.imports.lexer.TOK_END;
  TOK_NUM = Me.imports.lexer.TOK_NUM;
  TOK_ADD = Me.imports.lexer.TOK_ADD;
  TOK_SUB = Me.imports.lexer.TOK_SUB;
  TOK_MUL = Me.imports.lexer.TOK_MUL;
  TOK_DIV = Me.imports.lexer.TOK_DIV;
  TOK_EXP = Me.imports.lexer.TOK_EXP;
  TOK_LPAREN = Me.imports.lexer.TOK_LPAREN;
  TOK_RPAREN = Me.imports.lexer.TOK_RPAREN;
  TOK_IDENT = Me.imports.lexer.TOK_IDENT;
  TOK_COMMA = Me.imports.lexer.TOK_COMMA;
}

// Parser exceptions------------------------------------------------------------
// note: if add or delete an exception then update imports in calculator.js

const NoExpression = class NoExpression {};

const UndefinedIdent = class UndefinedIdent {
  constructor (ident) {
    this.ident = ident; // identifier string
  }
};

const CantConvertNumber = class CantConvertNumber {
  constructor (numStr) {
    this.numStr = numStr;
  }
};

// Parser-----------------------------------------------------------------------
// evaluates expressions

const Parser = class Parser {
  constructor () {
    reassignGlobals();
    this._last_val = 0.0;
  }

  eval (expr) {
    this._lexer = new Lexer(expr);
    if (this._lexer.peekToken().id === TOK_END) {
      throw new NoExpression();
    }
    const val = this._expression();
    if (this._lexer.peekToken().id !== TOK_END) {
      throw new SyntaxError();
    }
    this._last_val = val;
    return val;
  }

  _expression () {
    // <_expression> ::= <_multiplicitiveExpr> [ ( "+" | "-" ) <_multiplicitiveExpr> ]...
    let lhs = this._multiplicitiveExpr();
    for (;;) {
      if (this._lexer.peekToken().id === TOK_ADD) {
        this._lexer.getToken();
        lhs += this._multiplicitiveExpr();
      } else if (this._lexer.peekToken().id === TOK_SUB) {
        this._lexer.getToken();
        lhs -= this._multiplicitiveExpr();
      } else {
        break;
      }
    }
    return lhs;
  }

  _multiplicitiveExpr () {
    // <_multiplicitiveExpr> ::= <_exponentialExpr> [ ( "*" | "/" ) <_exponentialExpr> ]...
    let lhs = this._exponentialExpr();
    for (;;) {
      if (this._lexer.peekToken().id === TOK_MUL) {
        this._lexer.getToken();
        lhs *= this._exponentialExpr();
      } else if (this._lexer.peekToken().id === TOK_DIV) {
        this._lexer.getToken();
        lhs /= this._exponentialExpr();
      } else {
        break;
      }
    }
    return lhs;
  }

  _exponentialExpr () {
    // <_exponentialExpr> ::= ( "+" | "-" ) <_exponentialExpr>
    //                      | <_baseExpr> [ ( "**" | "^" ) <_exponentialExpr> ]
    // note: exponentation is right-associative
    if (this._lexer.peekToken().id === TOK_ADD) {
      this._lexer.getToken();
      return +this._exponentialExpr();
    }

    if (this._lexer.peekToken().id === TOK_SUB) {
      this._lexer.getToken();
      return -this._exponentialExpr();
    }

    let lhs = this._baseExpr();
    if (this._lexer.peekToken().id === TOK_EXP) {
      this._lexer.getToken();
      lhs **= this._exponentialExpr();
    }
    return lhs;
  }

  _baseExpr () {
    // <_baseExpr> ::= <number> | <_groupExpr> | <_identExpr>
    const id = this._lexer.peekToken().id;
    if (id === TOK_NUM) { // <number>
      const val = +this._lexer.peekToken().val; // converts to internal numeric
      if (isNaN(val)) {
        throw new CantConvertNumber(this._lexer.peekToken().val);
      }
      this._lexer.getToken();
      return val;
    }
    if (id === TOK_LPAREN) {
      return this._groupExpr();
    }
    return this._identExpr();
  }

  _groupExpr () {
    // <_groupExpr> ::= "(" <_expression> ")"
    if (this._lexer.getToken().id !== TOK_LPAREN) {
      throw new SyntaxError();
    }
    const val = this._expression();
    if (this._lexer.getToken().id !== TOK_RPAREN) {
      throw new SyntaxError();
    }
    return val;
  }

  _emptyGroupExpr () {
    // <_emptyGroupExpr> ::= "()"
    if (this._lexer.getToken().id !== TOK_LPAREN || this._lexer.getToken().id !== TOK_RPAREN) {
      throw new SyntaxError();
    }
  }

  _binaryGroupExpr () {
    if (this._lexer.getToken().id !== TOK_LPAREN) {
      throw new SyntaxError();
    }
    const arg1 = this._expression();
    if (this._lexer.getToken().id !== TOK_COMMA) {
      throw new SyntaxError();
    }
    const arg2 = this._expression();
    if (this._lexer.getToken().id !== TOK_RPAREN) {
      throw new SyntaxError();
    }
    return { arg1, arg2 };
  }

  _identExpr () {
    // <_identExpr> ::= "pi" | "e" | "last" | <function call>
    // <function call> ::= <nullary fn ident> <_emptyGroupExpr>
    //                   | <unary fn ident> <_groupExpr>
    //                   | <binary fn ident> <_binaryGroupExpr>
    const token = this._lexer.getToken();
    if (token.id !== TOK_IDENT) {
      throw new SyntaxError();
    }

    switch (token.val) {
      case 'pi':
        return Math.PI;
      case 'e':
        return Math.E;
      case 'last':
        return this._last_val;
      case 'abs':
        return Math.abs(this._groupExpr());
      case 'acos':
        return Math.acos(this._groupExpr());
      case 'acosh':
        return Math.acosh(this._groupExpr());
      case 'asin':
        return Math.asin(this._groupExpr());
      case 'asinh':
        return Math.asinh(this._groupExpr());
      case 'atan':
        return Math.atan(this._groupExpr());
      case 'atan2': {
        const args = this._binaryGroupExpr();
        return Math.atan2(args.arg1, args.arg2);
      }
      case 'atanh':
        return Math.atanh(this._groupExpr());
      case 'cbrt':
        return Math.cbrt(this._groupExpr());
      case 'ceil':
        return Math.ceil(this._groupExpr());
      case 'cos':
        return Math.cos(this._groupExpr());
      case 'cosh':
        return Math.cosh(this._groupExpr());
      case 'exp':
        return Math.exp(this._groupExpr());
      case 'floor':
        return Math.floor(this._groupExpr());
      case 'log':
      case 'ln':
        return Math.log(this._groupExpr());
      case 'random':
        this._emptyGroupExpr(); return Math.random();
      case 'round':
        return Math.round(this._groupExpr());
      case 'sin':
        return Math.sin(this._groupExpr());
      case 'sinh':
        return Math.sinh(this._groupExpr());
      case 'sqrt':
        return Math.sqrt(this._groupExpr());
      case 'tan':
        return Math.tan(this._groupExpr());
      case 'tanh':
        return Math.tanh(this._groupExpr());
      case 'trunc':
        return Math.trunc(this._groupExpr());
      default:
        throw new UndefinedIdent(token.val);
    }
  }
};
