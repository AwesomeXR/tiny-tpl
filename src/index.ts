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

export function tpl() {}

tpl.files = new Map<string, string>();

tpl.tokenize = function (strings: TemplateStringsArray, ...datas: ITplToken$[]) {
  const tokens: ITplToken[] = [];

  for (let i = 0; i < strings.length; i++) {
    const s = strings[i];
    const d = datas[i];

    tokens.push({ type: 'literal', source: s });
    if (d) tokens.push(d);
  }

  return tokens;
};

tpl.$if = function (strings: TemplateStringsArray): ITplToken$If {
  const expression = strings[0];
  return { type: '$if', expression };
};

tpl.$else = { type: '$else' } satisfies ITplToken$Else;

tpl.$elseif = function (strings: TemplateStringsArray): ITplToken$ElseIf {
  const expression = strings[0];
  return { type: '$elseif', expression };
};

tpl.$endif = { type: '$endif' } satisfies ITplToken$EndIf;

tpl.$for = function (strings: TemplateStringsArray): ITplToken$For {
  const expRaw = strings[0].trim();
  const match = expRaw.match(/(.*?),\s*(.*?)\s+in\s+(.*)$/);
  if (!match) throw new Error(`Invalid $for expression: ${expRaw}`);

  const loopIndexSym = match[1].trim();
  const loopValueSym = match[2].trim();
  const valueSym = match[3].trim();

  return { type: '$for', loopIndexSym, loopValueSym, valueSym };
};

tpl.$endfor = { type: '$endfor' } satisfies ITplToken$EndFor;

tpl.$print = function (strings: TemplateStringsArray): ITplToken$Print {
  const expression = strings[0];
  return { type: '$print', expression };
};

tpl.$include = function (strings: TemplateStringsArray): ITplToken$Include {
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
};

tpl._runtime = {
  _includeCache: new Map<string, Function>(),

  iter: function (data: any) {
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
  },
  include: function (path: string, data: any) {
    const content = tpl.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);

    const render = tpl._runtime._includeCache.get(path) || tpl.compile(content);
    return render(data);
  },
};

tpl.makeRender = function (tokens: ITplToken[]) {
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
        script += _indent() + `for (const [${token.loopIndexSym}, ${token.loopValueSym}] of this._runtime.iter(${token.valueSym})) {\n`;
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
        script += _indent() + `${_retSym} += this._runtime.include("${token.path}", ${token.expression ?? '{}'});\n`;
        break;

      default:
        throw new Error('unknown token type: ' + (token as any).type);
    }
  }

  _t -= 1;
  script += _indent() + `}\n`;
  script += _indent() + `return ${_retSym};\n`;

  const render = new Function('ctx', script).bind(this);
  return render;
};

tpl.compile = function (input: string) {
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
    tpl.tokenize,
    tpl.$if,
    tpl.$elseif,
    tpl.$else,
    tpl.$endif,
    tpl.$for,
    tpl.$endfor,
    tpl.$print,
    tpl.$include
  );

  const render = tpl.makeRender(tokens);
  return render;
};
