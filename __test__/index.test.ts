import { tpl } from '../src';

it('static', () => {
  const s = tpl<void>`somethings`;
  expect(s.render()).toBe('somethings');
});

it('print', () => {
  const p = tpl.print<string>(ctx => `print ${ctx}`);
  expect(p.render('test')).toBe('print test');
});

it('nested', () => {
  const a = tpl<void>`a`;
  const b = tpl`b ${a}`;
  expect(b.render()).toBe('b a');
});

it('nested nested', () => {
  const a = tpl<void>`a`;
  const b = tpl`b ${a}`;
  const c = tpl`c ${b}`;
  expect(c.render()).toBe('c b a');
});

it('nested print', () => {
  const a = tpl.print<string>(ctx => `print ${ctx}`);
  const b = tpl`b ${a}`;
  expect(b.render('test')).toBe('b print test');
});

it('nested print array', () => {
  const a = tpl.print<string>(ctx => `print ${ctx}`);
  const b = tpl`b ${[a, a]} ${a}`;
  expect(b.render('test')).toBe('b print testprint test print test');
});

it('if', () => {
  const a = tpl.print<string>(ctx => (ctx.startsWith('a') ? ctx : ''));
  const b = tpl`b ${a}`;
  expect(b.render('test')).toBe('b ');
  expect(b.render('a')).toBe('b a');
});
