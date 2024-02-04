export interface ITpl<T = any> {
  render(ctx: T): string;
}

export type ITplResolver<T> = (ctx: T) => string | ITpl<T>;

export function tpl<T>(strings: TemplateStringsArray, ...datas: (ITplResolver<T> | ITpl<T> | ITpl<T>[])[]): ITpl<T> {
  return {
    render(ctx: T) {
      return strings.reduce((acc, cur, idx) => {
        let _s = acc + cur;
        const _d = datas[idx];

        if (_d) {
          if (Array.isArray(_d)) _s += _d.map(_d0 => _d0.render(ctx)).join('');
          else if (typeof _d === 'function') _s += _d(ctx);
          else _s += _d.render(ctx);
        }

        return _s;
      }, '');
    },
  };
}

/** print */
tpl.print = function <T>(resolve: ITplResolver<T>): ITpl<T> {
  return {
    render(ctx: T) {
      const res = resolve(ctx);
      return typeof res === 'string' ? res : res.render(ctx);
    },
  };
};
