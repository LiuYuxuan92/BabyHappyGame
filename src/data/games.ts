export interface GameInfo {
  key: string;
  label: string;
  iconKey: string;
  color: number;
  category: '认知' | '逻辑' | '艺术' | '音乐' | '观察' | '生活';
  guide: string;
}

export const GAME_CATALOG: GameInfo[] = [
  { key: 'SortingGame', label: '动物分类', iconKey: 'icon_sorting', color: 0xFF9800, category: '认知', guide: '把每个动物拖进正确的家。' },
  { key: 'PuzzleGame', label: '趣味拼图', iconKey: 'icon_puzzle', color: 0x2196F3, category: '逻辑', guide: '观察影子，把动物放到一样的位置。' },
  { key: 'MatchingGame', label: '记忆配对', iconKey: 'icon_matching', color: 0x4CAF50, category: '逻辑', guide: '翻开两张卡片，找到相同的小动物。' },
  { key: 'ColoringGame', label: '涂色画画', iconKey: 'icon_coloring', color: 0xE91E63, category: '艺术', guide: '选择颜色，给图案涂上喜欢的颜色。' },
  { key: 'ShapeGame', label: '形状认知', iconKey: 'icon_shape', color: 0x3F51B5, category: '认知', guide: '把形状拖到对应的轮廓里。' },
  { key: 'CountingGame', label: '数一数', iconKey: 'icon_counting', color: 0x009688, category: '认知', guide: '数清楚动物数量，再点正确数字。' },
  { key: 'SizeSortGame', label: '大小排序', iconKey: 'icon_sizesort', color: 0xE040FB, category: '逻辑', guide: '从左到右，把动物按小到大排好。' },
  { key: 'CompareGame', label: '比多少', iconKey: 'icon_compare', color: 0x673AB7, category: '认知', guide: '看哪边更多，点出正确答案。' },
  { key: 'PianoGame', label: '小钢琴', iconKey: 'icon_piano', color: 0xFF4081, category: '音乐', guide: '点按琴键，听听每个音的变化。' },
  { key: 'RhythmGame', label: '节奏大师', iconKey: 'icon_rhythm', color: 0x00BCD4, category: '音乐', guide: '跟着节奏点按，听准声音再行动。' },
  { key: 'ConnectDotsGame', label: '连线画', iconKey: 'icon_connectdots', color: 0xFFAB40, category: '艺术', guide: '按顺序连接数字点，完成图案。' },
  { key: 'MazeGame', label: '走迷宫', iconKey: 'icon_maze', color: 0x8D6E63, category: '逻辑', guide: '拖动小动物，找到通往终点的路。' },
  { key: 'FindDiffGame', label: '找不同', iconKey: 'icon_finddiff', color: 0xFF5722, category: '观察', guide: '认真看两边图片，点出不一样的地方。' },
  { key: 'ShadowMatchGame', label: '影子配对', iconKey: 'icon_shadowmatch', color: 0x607D8B, category: '观察', guide: '把物品拖到它对应的影子上。' },
  { key: 'StickerGame', label: '贴纸装饰', iconKey: 'icon_sticker', color: 0x26A69A, category: '艺术', guide: '选择贴纸，装饰自己的小作品。' },
  { key: 'DressUpGame', label: '换装游戏', iconKey: 'icon_dressup', color: 0x8BC34A, category: '生活', guide: '点选衣服和配饰，搭配喜欢的造型。' },
  { key: 'FoodSortGame', label: '食物分类', iconKey: 'icon_foodsort', color: 0xF44336, category: '生活', guide: '把食物放进正确的分类篮子。' },
];

export function getGameInfo(gameKey: string): GameInfo | undefined {
  return GAME_CATALOG.find(game => game.key === gameKey);
}
