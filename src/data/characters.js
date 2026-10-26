// Image files supplied by the user; originals remain in src/ref_img.
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

// Adult head-top and neck lines, plus accessory widths fitted to each body, as a percentage of the 1254px sprite.
// `moods` adjusts poses that move the head or body: centers (headX, neckX, capeX), rotations in degrees.
const lying = { headTop: 30, headX: 38, headRot: -15, neck: 61, neckX: 62, neckRot: -70, clothesWidth: 46, capeX: 60, capeTop: 55, capeWidth: 76 };
export const accessoryAnchors = {
  chiikawa: { headTop: 17, neck: 62, headWidth: 58, clothesWidth: 60, capeWidth: 72,
    moods: { sleep: { ...lying, headWidth: 50 } } },
  hachiware: { headTop: 26, neck: 62, headWidth: 60, clothesWidth: 60, capeWidth: 72,
    moods: { play: { headX: 55, neck: 64, neckX: 46, clothesWidth: 52 }, clean: { headX: 52, neckX: 52, clothesWidth: 54 }, sleep: { ...lying, headWidth: 52 } } },
  usagi: { headTop: 30, neck: 69, headWidth: 48, clothesWidth: 54, capeWidth: 66,
    moods: { happy: { headX: 52, neck: 70, neckX: 53 }, play: { headX: 45, neckX: 43, clothesWidth: 48 }, clean: { headX: 46, neckX: 43, clothesWidth: 48 } } },
};
export function accessoryAnchor(id, mood) {
  const anchor = accessoryAnchors[id];
  if (!anchor) return null;
  const { moods, ...base } = anchor;
  const fit = { headX: 50, neckX: 50, headRot: 0, neckRot: 0, capeRot: 0, ...base, ...moods?.[mood] };
  return { ...fit, capeX: fit.capeX ?? fit.neckX, capeTop: fit.capeTop ?? fit.neck - 4 };
}

export const isCharacterId = id => characters.some(character => character.id === id);
export const characterFor = id => characters.find(character => character.id === id) ?? null;
export function characterImage(id, level, mood = 'normal', base = './') {
  const stage = ['egg','baby','adult'][level - 1] ?? 'egg';
  const character = characterFor(id);
  if (!character) return `${base}pets/${stage}.svg`;
  const filename = character.images[stage][mood] ?? character.images[stage].normal;
  return `${base}pets/characters/${id}/${filename}`;
}

export function petMood(pet, { sleeping=false, cleaning=false, sick=false, vacation=false, playing=false, petted=false } = {}) {
  if (sleeping) return 'sleep';
  if (cleaning) return 'clean';
  if (sick || vacation) return 'normal';
  if (playing) return 'play';
  if (petted) return 'happy';
  if (pet.hunger < 30) return 'hungry';
  return pet.affection >= 85 ? 'happy' : 'normal';
}
