import { tpl } from '../src';

beforeEach(() => {
  tpl.files.clear();
});

it('if-else-endif', () => {
  const render = tpl.compile('a ${ _if`num === 1` }true${ _else }false${ _endif }');

  const s1 = render({ num: 1 });
  const s2 = render({ num: 2 });

  expect(s1).toEqual('a true');
  expect(s2).toEqual('a false');
});

it('if-elseif-else-endif', () => {
  const render = tpl.compile('test ${ _if`num === 1` }A${ _elseif`num === 2` }B${ _else }C${ _endif }');

  const s1 = render({ num: 1 });
  const s2 = render({ num: 2 });
  const s3 = render({ num: 3 });

  expect(s1).toEqual('test A');
  expect(s2).toEqual('test B');
  expect(s3).toEqual('test C');
});

it('for-endfor', () => {
  const render = tpl.compile('a ${ _for`index, name in names` }n-${_`name`}, ${ _endfor }');
  const s1 = render({ names: ['a', 'b', 'c'] });
  expect(s1).toEqual('a n-a, n-b, n-c, ');
});

it('print', () => {
  const s1 = tpl.compile('nick:${_`name`}, age:${_`age`}, next_age:${_`age + 1`}, say-hi:${_`"hi" + name`}')({ name: 'Jam', age: 18 });
  expect(s1).toEqual('nick:Jam, age:18, next_age:19, say-hi:hiJam');
});

it('include', () => {
  tpl.files.set('logo.txt', 'LOGO');
  tpl.files.set('header.txt', '[THIS IS HEADER, title=${ _`title` }, logo=${ _include`logo.txt` }]');

  const s1 = tpl.compile('${ _include`header.txt { title }` }-b, ${ _`desc` }')({ title: 'Dog', desc: 'dog site' });
  expect(s1).toEqual('[THIS IS HEADER, title=Dog, logo=LOGO]-b, dog site');
});
