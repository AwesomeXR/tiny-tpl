export interface ITpl<T = any> {
  render(ctx: T): string;
}

export function tpl<T>(strings: TemplateStringsArray, ...datas: (ITpl<T> | ITpl<T>[])[]): ITpl<T> {
  return {
    render(ctx: T) {
      return strings.reduce((acc, cur, idx) => {
        let _s = acc + cur;
        const _d = datas[idx];

        if (_d) {
          if (Array.isArray(_d)) _s += _d.map(_d0 => _d0.render(ctx)).join('');
          else _s += _d.render(ctx);
        }

        return _s;
      }, '');
    },
  };
}

/** print */
tpl.print = function <T>(resolve: (ctx: T) => string | ITpl<T>): ITpl<T> {
  return {
    render(ctx: T) {
      const res = resolve(ctx);
      return typeof res === 'string' ? res : res.render(ctx);
    },
  };
};
