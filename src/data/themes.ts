export interface Theme {
  id: string;
  name: string;
  animals: string[];
  bgColor1: number;
  bgColor2: number;
}

const themes: Theme[] = [
  {
    id: 'farm',
    name: '农场',
    animals: ['animal_cow', 'animal_sheep', 'animal_dog', 'animal_cat'],
    bgColor1: 0x8BC34A,
    bgColor2: 0xC8E6C9,
  },
  {
    id: 'ocean',
    name: '海洋',
    animals: ['fish_blue', 'fish_green', 'fish_orange', 'fish_brown', 'fish_grey'],
    bgColor1: 0x03A9F4,
    bgColor2: 0xB3E5FC,
  },
  {
    id: 'wild',
    name: '野生',
    animals: ['animal_elephant', 'animal_giraffe', 'animal_monkey', 'animal_zebra', 'animal_kangaroo'],
    bgColor1: 0xFF9800,
    bgColor2: 0xFFE0B2,
  },
  {
    id: 'forest',
    name: '森林',
    animals: ['animal_bear', 'animal_owl'],
    bgColor1: 0x4CAF50,
    bgColor2: 0xA5D6A7,
  },
];

export function getTheme(id: string): Theme | undefined {
  return themes.find(t => t.id === id);
}

export function getRandomTheme(): Theme {
  return themes[Math.floor(Math.random() * themes.length)];
}
