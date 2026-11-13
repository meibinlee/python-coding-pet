// 12×12 pixel icons drawn to match the 256px pixel art (replaces colour emoji, 2026-11-13).
// Each row is 12 characters; '.' is empty and every other letter is a colour below.
const COLORS = {
  k: '#3d2520', w: '#ffffff', n: '#2f3b2a', y: '#ffd447', o: '#f08a3c', r: '#e5534b', p: '#f4a6b8',
  b: '#86c3e3', l: '#cfe9f7', m: '#8b5a3c', t: '#d9b48c', v: '#9a86d0', c: '#cbbfb4', g: '#7bb36a',
};

const ICONS = {
  rice: ['....kkkk....', '...kwwwwk...', '..kwwwwwwk..', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwwwwwwwwk.', 'kwwwwwwwwwwk', 'kwwwnnnnwwwk', 'kwwwnnnnwwwk', 'kwwwnnnnwwwk', '.kkkkkkkkkk.'],
  broom: ['.........km.', '........kmk.', '.......kmk..', '......kmk...', '.....kmk....', '...kkkkkk...', '..kyyyyyyk..', '..kyoyoyyk..', '.kyoyoyoyk..', '.kyoyoyoyk..', 'kyoyoyoyok..', 'kkkkkkkkkk..'],
  bear: ['.kk......kk.', 'kmmk....kmmk', 'kmmkkkkkkmmk', '.kmmmmmmmmk.', 'kmmmmmmmmmmk', 'kmmkmmmmkmmk', 'kmmmmttmmmmk', 'kmmmtkktmmmk', '.kmmmttmmmk.', '..kkkkkkkk..'],
  bubble: ['..kkkk......', '.kllllk.....', 'kllwlllk....', 'klwllllk....', 'kllllllk.kk.', 'kllllllkkllk', '.kllllk.klwk', '..kkkk..kllk', '.........kk.', '...kkk......', '..klwlk.....', '...kkk......'],
  star: ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkkyykkkkk', 'kyyyyyyyyyyk', '.kyyyyywyyk.', '..kyyyyyyk..', '..kyyyyyyk..', '.kyyykkyyyk.', '.kyykk.kkyyk', 'kyykk...kkyk', 'kkk.......kk'],
  pencil: ['.........kk.', '........kppk', '.......kcckk', '......kyyyk.', '.....kyyyk..', '....kyyyk...', '...kyyyk....', '..kyyyk.....', '.ktyyk......', '.kttk.......', '.kkk........'],
  moon: ['....kkkk....', '..kkyyyk....', '.kyyyyk.....', '.kyyyk......', 'kyyyk.......', 'kyyyk.......', 'kyyyk.......', 'kyyyyk......', '.kyyyyk...k.', '.kyyyyykkkyk', '..kkyyyyyyk.', '....kkkkkk..'],
  calendar: ['..k.....k...', '.kkkkkkkkkk.', 'krrrrrrrrrrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwkwkwkwkwwk', 'kwwwwwwwwwwk', 'kwkwkwkwkwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk'],
  fire: ['.....k......', '....kok.....', '....kook....', '...kooook.k.', '..koooookkok', '..kooyoooook', '.kooyyyoook.', '.koyyyyyook.', 'kooyywyyook.', 'kooyyyyyook.', '.kooyyyook..', '..kkkkkkk...'],
  ribbon: ['kk........kk', 'kpkk....kkpk', 'kpppk..kpppk', 'kppppkkppppk', 'kpppkppkpppk', 'kppppkkppppk', 'kpppk..kpppk', 'kpkk.kk.kkpk', 'kk..kppk..kk', '...kpk.kpk..', '...kk...kk..'],
  cap: ['.....kk.....', '...kkvvkk...', '.kkvvvvvvkk.', 'kvvvvvvvvvvk', '.kkvvvvvvkky', '...kkvvkk.ky', '...kvkkvk.ky', '...kvvvvk.yy', '...kvvvvk...', '....kkkk....'],
  poop: ['.....k......', '....kmk.....', '...kmmmk....', '...kkkkk....', '..kmmmmmk...', '..kwkmmwkk..', '.kmmmmmmmmk.', '.kkkkkkkkkk.', 'kmmmmmmmmmmk', 'kmmmmmmmmmmk', '.kkkkkkkkkk.'],
  user: ['....kkkk....', '...kwwwwk...', '..kwwwwwwk..', '..kwwwwwwk..', '..kwwwwwwk..', '...kwwwwk...', '....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk'],
  eye: ['............', '............', '....kkkk....', '..kkwwwwkk..', '.kwwwkkwwwk.', 'kwwwkkkkwwwk', 'kwwwkkkkwwwk', '.kwwwkkwwwk.', '..kkwwwwkk..', '....kkkk....'],
  eyeOff: ['..........rr', '.........rr.', '....kkkkrr..', '..kkwwwrrk..', '.kwwwkrrwwk.', 'kwwwkrrkwwwk', 'kwwwrrkkwwwk', '.kwrrkkwwwk.', '..rrwwwwkk..', '.rrkkkkk....', 'rr..........'],
  heart: ['.kkk....kkk.', 'kpppk..kpppk', 'kpwppkkppppk', 'kppppppppppk', 'kppppppppppk', '.kppppppppk.', '..kppppppk..', '...kppppk...', '....kppk....', '.....kk.....'],
  cross: ['....kkkk....', '....krrk....', '....krrk....', 'kkkkkrrkkkkk', 'krrrrrrrrrrk', 'krrrrrrrrrrk', 'kkkkkrrkkkkk', '....krrk....', '....krrk....', '....kkkk....'],
  sun: ['.....yy.....', '.y...yy...y.', '..y.kkkk.y..', '...kyyyyk...', '..kyyyyyyk..', 'yykyyyyyykyy', 'yykyyyyyykyy', '..kyyyyyyk..', '...kyyyyk...', '..y.kkkk.y..', '.y...yy...y.', '.....yy.....'],
  cup: ['......kk....', '.....kk.....', '.kkkkkkkkk..', '.kbbbbbbbk..', '.kwwwwwwwk..', '..kbbbbbk...', '..kbbbbbk...', '..kwwwwwk...', '...kbbbk....', '...kkkkk....'],
  leaf: ['.........kk.', '......kkkok.', '....kkooook.', '...kooooook.', '..kooookook.', '.kooookook..', '.koookook...', '.kookook....', '.kokkkk.....', '.kk.........', 'k...........'],
  paper: ['.kkkkkkk....', '.kwwwwwkk...', '.kwkkkwwkk..', '.kwwwwwwwk..', '.kwkkkkkwk..', '.kwwwwwwwk..', '.kwkkkkkwk..', '.kwwwwwwwk..', '.kwkkkkwwk..', '.kwwwwwwwk..', '.kkkkkkkkk..'],
  roll: ['..kkkkkkk...', '.kwwwwwwwk..', 'kwwkkkwwwwk.', 'kwkcckwwwwk.', 'kwwkkkwwwwk.', '.kwwwwwwwwk.', '.kwwwwwwwwkk', '.kwwwwwwwwwk', '.kkkkkkkkwwk', '.........kwk', '.........kkk'],
  sparkle: ['.....k......', '.....y......', '....kyk.....', '....yyy.....', 'kyyyywyyyyk.', '....yyy.....', '....kyk.....', '.....y......', '.....k......'],
};

// One <rect> per horizontal run of the same colour, centred vertically in the 12×12 box.
const RECTS = Object.fromEntries(Object.entries(ICONS).map(([name, rows]) => {
  const top = Math.floor((12 - rows.length) / 2), rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < 12;) {
      const color = row[x];
      let end = x + 1;
      while (end < 12 && row[end] === color) end++;
      if (color && color !== '.') rects.push([x, y + top, end - x, COLORS[color]]);
      x = end;
    }
  });
  return [name, rects];
}));

export const iconNames = Object.keys(ICONS);

export function PixelIcon({ name, size = '1.25em', className = '' }) {
  const rects = RECTS[name];
  if (!rects) return null;
  return <svg className={`pixel-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    {rects.map(([x, y, w, fill], i) => <rect key={i} x={x} y={y} width={w} height="1" fill={fill} />)}
  </svg>;
}

// Emoji in text (guide, notices) shown as pixel icons.
const EMOJI = { '🍙': 'rice', '🧹': 'broom', '🧸': 'bear', '🫧': 'bubble', '⭐': 'star', '✏️': 'pencil', '🌙': 'moon', '📅': 'calendar', '🔥': 'fire', '🎀': 'ribbon', '🎓': 'cap', '💩': 'poop', '👤': 'user', '☀': 'sun' };
const PATTERN = new RegExp(`(${Object.keys(EMOJI).join('|')})️?`, 'u');
export function iconText(text) {
  if (typeof text !== 'string') return text;
  return text.split(PATTERN).map((part, i) => i % 2 ? <PixelIcon key={i} name={EMOJI[part]} size="1.15em" /> : part);
}
