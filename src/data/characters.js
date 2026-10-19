// Image files supplied by the user; originals remain in src/ref_img.
export const characters = [
  {
    "id": "chiikawa",
    "name": "치이카와",
    "images": {
      "egg": {
        "normal": "egg-normal.png"
      },
      "baby": {
        "happy": "baby-happy.png",
        "play": "baby-play.png",
        "clean": "baby-clean.png",
        "normal": "baby-normal.png",
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
        "normal": "egg-normal.png"
      },
      "baby": {
        "play": "baby-play.png",
        "normal": "baby-normal.png",
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
        "normal": "egg-normal.png"
      },
      "baby": {
        "play": "baby-play.png",
        "normal": "baby-normal.png",
        "hungry": "baby-hungry.png",
        "clean": "baby-clean.png",
        "happy": "baby-happy.png"
      },
      "adult": {
        "happy": "adult-happy.png",
        "play": "adult-play.png",
        "clean": "adult-clean.png",
        "normal": "adult-normal.png",
        "hungry": "adult-hungry.png"
      }
    }
  }
];

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
