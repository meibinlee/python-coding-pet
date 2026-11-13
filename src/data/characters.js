// Image files supplied by the user (256px pixel art); sources remain in reference_img/ (not deployed).
export const characters = [
  {
    "id": "chiikawa",
    "name": "치이카와",
    "images": {
      "egg": {
        "normal": "egg-normal.png",
        "sleep": "egg-sleep.png"
      },
      "baby": {
        "happy": "baby-happy.png",
        "play": "baby-play.png",
        "clean": "baby-clean.png",
        "normal": "baby-normal.png",
        "sleep": "baby-sleep.png",
        "hungry": "baby-hungry.png"
      },
      "adult": {
        "hungry": "adult-hungry.png",
        "sleep": "adult-sleep.png",
        "play": "adult-play.png",
        "clean": "adult-clean.png",
        "happy": "adult-happy.png",
        "normal": "adult-normal.png"
      }
    }
  },
  {
    "id": "hachiware",
    "name": "하치와레",
    "images": {
      "egg": {
        "normal": "egg-normal.png",
        "sleep": "egg-sleep.png"
      },
      "baby": {
        "play": "baby-play.png",
        "normal": "baby-normal.png",
        "sleep": "baby-sleep.png",
        "clean": "baby-clean.png",
        "hungry": "baby-hungry.png",
        "happy": "baby-happy.png"
      },
      "adult": {
        "hungry": "adult-hungry.png",
        "happy": "adult-happy.png",
        "clean": "adult-clean.png",
        "normal": "adult-normal.png",
        "play": "adult-play.png",
        "sleep": "adult-sleep.png"
      }
    }
  },
  {
    "id": "usagi",
    "name": "우사기",
    "images": {
      "egg": {
        "normal": "egg-normal.png",
        "sleep": "egg-sleep.png"
      },
      "baby": {
        "play": "baby-play.png",
        "normal": "baby-normal.png",
        "sleep": "baby-sleep.png",
        "hungry": "baby-hungry.png",
        "clean": "baby-clean.png",
        "happy": "baby-happy.png"
      },
      "adult": {
        "happy": "adult-happy.png",
        "play": "adult-play.png",
        "clean": "adult-clean.png",
        "normal": "adult-normal.png",
        "sleep": "adult-sleep.png",
        "hungry": "adult-hungry.png"
      }
    }
  }
];

// From reference_img/pixel_accessories_12/accessory_layout.json (user supplied). 256px frame.
// Each accessory: slot point, layer, width relative to the face, anchor and drawn size inside its 256px canvas.
export const accessoryAssets = {"bowtie":{"slot":"neck","layer":"front","ratio":0.34,"anchor":[128,128],"size":[208,106]},"cape":{"slot":"shoulder","layer":"back","ratio":1.1,"anchor":[128,78.4],"size":[208,124],"front":["cape_front"]},"cloud":{"slot":"temple","layer":"front","ratio":0.28,"anchor":[128,128],"size":[208,112]},"clover":{"slot":"temple","layer":"front","ratio":0.24,"anchor":[128,128],"size":[194,208]},"crown":{"slot":"forehead","layer":"front","ratio":0.5,"anchor":[128,185],"size":[208,114]},"flower":{"slot":"temple","layer":"front","ratio":0.27,"anchor":[128,128],"size":[208,184]},"medal":{"slot":"neck","layer":"front","ratio":0.42,"anchor":[128,33],"size":[208,189]},"rainbow":{"slot":"forehead","layer":"front","ratio":0.55,"anchor":[128,188],"size":[208,120]},"ribbon":{"slot":"temple","layer":"front","ratio":0.35,"anchor":[128,127.5],"size":[208,129]},"scarf":{"slot":"neck","layer":"front","ratio":0.61,"anchor":[128,103],"size":[208,100]},"sprout":{"slot":"forehead","layer":"front","ratio":0.25,"anchor":[128,185],"size":[208,115]},"starband":{"slot":"band","layer":"front","ratio":0.86,"anchor":[128,127.5],"size":[208,49]},"cape_front":{"slot":"neck","layer":"front","ratio":0.52,"anchor":[128,112.75],"size":[208,59]}};
// Adult landmarks per mood: [cheek center x, cheek center y, face width]. Feet stand at y=218.
export const adultLandmarks = {"chiikawa":{"clean":[128.37,126.56,145.69],"hungry":[121.66,133.12,155.1],"happy":[126.96,115.37,159.33],"normal":[126.85,129.55,157.02],"play":[134.37,130.96,140.46],"sleep":[126.47,121.65,146.05]},"usagi":{"clean":[132.17,137.07,112.66],"hungry":[126.28,139.69,116.53],"happy":[126.49,140.14,120.64],"normal":[126.51,140.1,121.23],"play":[130.74,138.74,120.25],"sleep":[126.8,145.59,91.76]},"hachiware":{"clean":[130.81,125.14,141.88],"hungry":[122.96,130.24,149.1],"happy":[127.29,127.65,150.49],"normal":[126.89,127.78,152.58],"play":[128.06,128.28,149.34],"sleep":[127.23,133.39,120.08]}};

const FLOOR_Y = 218;
// Same math as the pack's placeAccessory: each piece's box on the 256px frame, as percentages.
function place(name, [cx, cy, hw]) {
  const asset = accessoryAssets[name];
  const neck = cy + hw * 0.29;
  const point = { neck: [cx, neck], shoulder: [cx, neck - 10], temple: [cx + hw * 0.35, cy - hw * 0.25],
    forehead: [cx, cy - hw * 0.34], band: [cx, cy - hw * 0.29] }[asset.slot];
  const [bw, bh] = asset.size;
  let sx = hw * asset.ratio / bw, sy = sx;
  if (name === 'cape') sy = Math.max(16, FLOOR_Y - neck + 6) / bh;
  else if (name === 'medal') sx = sy = Math.min(sx, Math.max(15, FLOOR_Y - neck - 2) / bh);
  else if (name === 'scarf') sy = Math.min(sy, Math.max(14, FLOOR_Y - neck + 3) / bh);
  const pct = value => `${(value / 256 * 100).toFixed(2)}%`;
  return { id: name, layer: asset.layer, left: pct(point[0] - asset.anchor[0] * sx), top: pct(point[1] - asset.anchor[1] * sy), width: pct(256 * sx), height: pct(256 * sy) };
}
// Image pieces for one worn item on an adult pet in the given mood (the cape adds its front clasp).
export function accessoryPieces(characterId, mood, itemId) {
  const marks = adultLandmarks[characterId];
  if (!marks || !accessoryAssets[itemId]) return [];
  const landmark = marks[mood] ?? marks.normal;
  return [itemId, ...(accessoryAssets[itemId].front ?? [])].map(name => place(name, landmark));
}

// Usagi is drawn with a smaller head than the others. Measured widest row of the body (ears excluded):
// baby 100px vs 132–136px, adult 121px vs 152px. Scaled from the feet so all three heads match.
const FIGURE_SCALE = { usagi: { 2: 1.33, 3: 1.25 } };
export const figureScale = (id, level) => FIGURE_SCALE[id]?.[level] ?? 1;

export const isCharacterId = id => characters.some(character => character.id === id);
export const characterFor = id => characters.find(character => character.id === id) ?? null;
// Bump when the art changes so browsers do not keep showing cached old images.
export const ART_VERSION = 2;
export function characterImage(id, level, mood = 'normal', base = './') {
  const stage = ['egg','baby','adult'][level - 1] ?? 'egg';
  const character = characterFor(id);
  if (!character) return `${base}pets/${stage}.svg`;
  const filename = character.images[stage][mood] ?? character.images[stage].normal;
  return `${base}pets/characters/${id}/${filename}?v=${ART_VERSION}`;
}

export function petMood(pet, { sleeping=false, cleaning=false, sick=false, vacation=false, playing=false, eating=false, petted=false } = {}) {
  if (sleeping) return 'sleep';
  if (cleaning) return 'clean';
  if (sick || vacation) return 'normal';
  if (playing) return 'play';
  // The hungry image is the eating pose (onigiri and bowl), also used for the feeding reaction.
  if (eating) return 'hungry';
  if (petted) return 'happy';
  if (pet.hunger < 30) return 'hungry';
  return pet.affection >= 85 ? 'happy' : 'normal';
}
