export type GradeId = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export interface AvatarConfig {
  character: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  shirt: string;
  pants: string;
  shoes: string;
  accessory: string;
  pet: string;
}

export interface Settings {
  musicVolume: number;
  soundVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  reducedMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
  colorBlindSafe: boolean;
  readAloud: boolean;
  showCaptions: boolean;
  invertY: boolean;
  cameraSensitivity: number;
}

export interface User {
  id: number;
  email: string;
  role: 'student' | 'guardian' | 'admin';
  displayName: string;
  grade: GradeId;
  gradeLabel: string;
  avatar: AvatarConfig;
  settings: Settings;
  coins: number;
  lifetimeCoins: number;
  onboarded: boolean;
  streak: number;
  bestStreak: number;
  ownedItems: string[];
}

export interface Progress {
  grade: GradeId;
  currentLevel: number;
  currentChallenge: number;
  xp: number;
  difficultyOffset: number;
  stars: Record<string, number>;
  completedLevels: number[];
  levelCorrect: number;
  levelAnswered: number;
  challengesPerLevel: number;
  levelsPerGrade: number;
}

export interface Palette {
  sky: string; horizon: string; fog: string;
  ground: string; groundAlt: string; path: string;
  accent: string; structure: string; structureAlt: string;
}

export interface WorldSummary {
  id: string; name: string; tagline: string; emoji: string;
  levels: number[]; palette: Palette;
  unlocked: boolean; unlockLevel: number; complete: boolean;
  stars: number; maxStars: number;
}

export interface LevelSummaryInfo {
  level: number; name: string; intro: string;
  worldId: string; worldName: string; isFinal: boolean; challengeCount: number;
}

export interface Stats {
  totalAnswered: number; totalCorrect: number; accuracy: number;
  puzzlesCompleted: number; designsCompleted: number;
  levelsCompleted: number; perfectLevels: number; worldsCompleted: number;
  bestStreak: number; currentStreak: number; lifetimeCoins: number;
  bestNoHintStreak: number;
}

export interface Achievement {
  id: string; name: string; icon: string; description: string;
  goal: number; progress: number; earned: boolean;
}

export interface CatalogItem {
  id: string; name?: string; hex?: string; emoji?: string;
  cost?: number; unlockLevel?: number; blurb?: string; build?: string;
}

export interface Catalog {
  characters: CatalogItem[];
  skinTones: CatalogItem[];
  hairStyles: CatalogItem[];
  hairColors: CatalogItem[];
  shirts: CatalogItem[];
  pants: CatalogItem[];
  shoes: CatalogItem[];
  accessories: CatalogItem[];
  pets: CatalogItem[];
}

export interface ShopItem {
  key: string; slot: string; id: string; name: string;
  cost: number; unlockLevel: number; hex: string | null; emoji: string | null;
}

export interface GameState {
  user: User;
  progress: Progress;
  worlds: WorldSummary[];
  levels: LevelSummaryInfo[];
  currentLevel: { level: number; name: string; intro: string; worldId: string; worldName: string; isFinal: boolean };
  stats: Stats;
  achievements: Achievement[];
  grades: { id: GradeId; label: string; topics: string[] }[];
  catalog: Catalog;
  shop: ShopItem[];
}

export interface Station {
  id: string; name: string; kind: 'npc' | 'object' | 'sign' | 'door';
  character: string; lines: string[]; pos: [number, number];
}

export interface WorldScene {
  world: {
    id: string; name: string; tagline: string; emoji: string;
    palette: Palette; ambience: string;
    props: { kind: string; count: number; spread: number }[];
    stations: Station[];
  };
  level: { level: number; name: string; intro: string; isFinal: boolean; challengeCount: number };
  activeStationId: string;
  progress: Progress;
}

export type QuestionType =
  | 'multiple-choice' | 'numeric' | 'text' | 'order' | 'match' | 'number-line';

export interface QuestionVisual {
  kind: string;
  [key: string]: unknown;
}

export interface Question {
  generatorId: string;
  topic: string;
  skill: string;
  difficulty: number;
  grade: GradeId;
  type: QuestionType;
  prompt: string;
  choices: string[] | null;
  items: string[] | null;
  left: string[] | null;
  right: string[] | null;
  min: number | null;
  max: number | null;
  step: number | null;
  unit: string | null;
  placeholder: string | null;
  visual: QuestionVisual | null;
  hintCount: number;
  hints: string[];
  hintsUsed: number;
}

export interface PuzzleTrayItem {
  type: string; label: string; color: string;
  count?: number; w?: number; h?: number; shape?: string;
}

export interface PuzzleData {
  puzzleId: string;
  name: string;
  kind: 'block-canvas' | 'shape-canvas' | 'pattern' | 'sorting' | 'maze' | 'spatial' | 'parts-canvas';
  difficulty: number;
  band: 'easy' | 'medium' | 'hard';
  instruction: string;
  detail: string;
  canvas?: { width?: number; height?: number; cols?: number; rows?: number };
  gap?: { from: number; to: number };
  tray?: any[];
  requirements?: any;
  sequence?: any[];
  blanks?: number;
  answer?: string[];
  bins?: { id: string; label: string }[];
  items?: { id: string; label: string; bin: string }[];
  grid?: number[][];
  start?: [number, number];
  end?: [number, number];
  target?: { w: number; h: number; cells: [number, number][] };
  freeform?: boolean;
}

export interface Challenge {
  id: string;
  grade: GradeId;
  level: number;
  levelName: string;
  challengeIndex: number;
  challengeCount: number;
  isMilestone: boolean;
  station: Station | null;
  puzzle: PuzzleData | null;
  puzzleDone: boolean;
  puzzleSummary: { puzzleId: string; name: string; kind: string; difficulty: number } | null;
  question: Question | null;
  attempts: number;
}

export interface LevelSummary {
  level: number;
  levelName: string;
  correct: number;
  total: number;
  accuracy: number;
  accuracyPercent: number;
  xpEarned: number;
  coinsEarned: number;
  stars: number;
  seconds: number;
  skills: { topic: string; attempted: number; correct: number }[];
  nextLevel: number | null;
  nextLevelName: string | null;
  gradeComplete: boolean;
  unlockedWorld: { id: string; name: string; emoji: string; tagline: string } | null;
}

export interface AnswerResult {
  ok: boolean;
  correct: boolean;
  retry: boolean;
  attempts: number;
  reward?: { xp: number; coins: number };
  explanation?: string;
  correctAnswer?: string | null;
  levelComplete?: boolean;
  levelSummary?: LevelSummary | null;
  achievements?: Achievement[];
  progress?: Progress;
  coins?: number;
  stats?: Stats;
  hints?: string[];
  hintsUsed?: number;
  message?: string;
}
