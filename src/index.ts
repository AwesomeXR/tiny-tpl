export interface ITplTokenLiteral {
  type: 'literal';
  source: string;
}

// $print
export interface ITplToken$Print {
  type: '$print';
  expression: string;
}

// $if
export interface ITplToken$If {
  type: '$if';
  expression: string;
}

// $elseif
export interface ITplToken$ElseIf {
  type: '$elseif';
  expression: string;
}

// $else
export interface ITplToken$Else {
  type: '$else';
}

// $endif
export interface ITplToken$EndIf {
  type: '$endif';
}

// $for
export interface ITplToken$For {
  type: '$for';
  loopIndexSym: string;
  loopValueSym: string;
  valueSym: string;
}

// $endfor
export interface ITplToken$EndFor {
  type: '$endfor';
}

// $include
export interface ITplToken$Include {
  type: '$include';
  path: string;
  expression?: string;
}

export type ITplToken$ =
  | ITplToken$Print
  | ITplToken$If
  | ITplToken$ElseIf
  | ITplToken$Else
  | ITplToken$EndIf
  | ITplToken$For
  | ITplToken$EndFor
  | ITplToken$Include;

export type ITplToken = ITplTokenLiteral | ITplToken$;

export type ITplRender = (ctx: Record<string, any>) => string;

export class Tpl {
  files = new Map<string, string>();

  _rt_iter(data: any) {
    if (Array.isArray(data)) {
      return {
        [Symbol.iterator]: function* () {
          for (let i = 0; i < data.length; i++) {
            yield [i, data[i]];
          }
        },
      };
    }

    if (typeof data === 'object') {
      return {
        [Symbol.iterator]: function* () {
          for (const key of Object.keys(data)) {
            yield [key, data[key]];
          }
        },
      };
    }

    return data;
  }

  _rt_include(path: string, data: any) {
    const render = this.compile(path);
    return render(data);
  }

  tokenize(strings: TemplateStringsArray, ...datas: ITplToken$[]) {
    const tokens: ITplToken[] = [];

    for (let i = 0; i < strings.length; i++) {
      const s = strings[i];
      const d = datas[i];

      tokens.push({ type: 'literal', source: s });
      if (d) tokens.push(d);
    }

    return tokens;
  }

  $if(strings: TemplateStringsArray): ITplToken$If {
    const expression = strings[0];
    return { type: '$if', expression };
  }

  $else = { type: '$else' } satisfies ITplToken$Else;

  $elseif(strings: TemplateStringsArray): ITplToken$ElseIf {
    const expression = strings[0];
    return { type: '$elseif', expression };
  }

  $endif = { type: '$endif' } satisfies ITplToken$EndIf;

  $for(strings: TemplateStringsArray): ITplToken$For {
    const expRaw = strings[0].trim();
    const match = expRaw.match(/(.*?),\s*(.*?)\s+in\s+(.*)$/);
    if (!match) throw new Error(`Invalid $for expression: ${expRaw}`);

    const loopIndexSym = match[1].trim();
    const loopValueSym = match[2].trim();
    const valueSym = match[3].trim();

    return { type: '$for', loopIndexSym, loopValueSym, valueSym };
  }

  $endfor = { type: '$endfor' } satisfies ITplToken$EndFor;

  $print(strings: TemplateStringsArray): ITplToken$Print {
    const expression = strings[0];
    return { type: '$print', expression };
  }

  $include(strings: TemplateStringsArray): ITplToken$Include {
    const expRaw = strings[0].trim();

    let path: string;
    let expression: string | undefined;

    if (expRaw.indexOf(' ') > 0) {
      const match = expRaw.match(/(.*?)\s+(.*)$/);
      if (!match) throw new Error(`Invalid $include expression: ${expRaw}`);

      path = match[1].trim();
      expression = match[2].trim();
    } else {
      path = expRaw;
      expression = undefined;
    }

    return { type: '$include', path, expression };
  }

  makeRender(tokens: ITplToken[]): ITplRender {
    const _retSym = '__$$ret';

    let script: string = `
if (typeof ctx !== 'object' || ctx === null) throw new Error('ctx must be an object');

let ${_retSym} = '';
with(ctx) {
`;
    let _t = 1;

    const _indent = () => '  '.repeat(_t);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case 'literal':
          script += _indent() + `${_retSym} += "${token.source}";\n`;
          break;

        case '$if':
          script += _indent() + `if (${token.expression}) {\n`;
          _t += 1;
          break;

        case '$elseif':
          _t -= 1;
          script += _indent() + `} else if (${token.expression}) {\n`;
          _t += 1;
          break;

        case '$else':
          _t -= 1;
          script += _indent() + `} else {\n`;
          _t += 1;
          break;

        case '$endif':
          _t -= 1;
          script += _indent() + `}\n`;
          break;

        case '$for':
          script += _indent() + `for (const [${token.loopIndexSym}, ${token.loopValueSym}] of this._rt_iter(${token.valueSym})) {\n`;
          _t += 1;
          break;

        case '$endfor':
          _t -= 1;
          script += _indent() + `}\n`;
          break;

        case '$print':
          script += _indent() + `${_retSym} += String(${token.expression});\n`;
          break;

        case '$include':
          script += _indent() + `${_retSym} += this._rt_include("${token.path}", ${token.expression ?? '{}'});\n`;
          break;

        default:
          throw new Error('unknown token type: ' + (token as any).type);
      }
    }

    _t -= 1;
    script += _indent() + `}\n`;
    script += _indent() + `return ${_retSym};\n`;

    const render = new Function('ctx', script).bind(this) as ITplRender;
    return render;
  }

  _compileCache = new Map<string, ITplRender>();

  compile(path: string): ITplRender {
    const input = this.files.get(path);
    if (!input) throw new Error(`File not found: ${path}`);

    // check cache
    if (this._compileCache.has(path)) return this._compileCache.get(path)!;

    const _wrapper = new Function(
      '_tokenize',
      '_if',
      '_elseif',
      '_else',
      '_endif',
      '_for',
      '_endfor',
      '_',
      '_include',
      // body
      `return _tokenize\`${input}\`;`
    );

    const tokens: ITplToken[] = _wrapper(
      this.tokenize,
      this.$if,
      this.$elseif,
      this.$else,
      this.$endif,
      this.$for,
      this.$endfor,
      this.$print,
      this.$include
    );

    const render = this.makeRender(tokens);

    // cache
    this._compileCache.set(path, render);

    return render;
  }
}

export const tpl = new Tpl();
