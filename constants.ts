export const INITIAL_BALANCE = 1000;
export const PRE_DIVE_DURATION = 5000; // 5 seconds betting window
export const POST_DIVE_DELAY = 4000; // 4 seconds before next round

// FIX: Add missing NPC_NAMES constant to resolve error in useDiveControl.ts.
export const NPC_NAMES = [
  "Walrus", "Orca", "Narwhal", "Beluga", "Dolphin", "Seal", "Marlin",
];

export const TREASURE_MARKER_DEFINITIONS = [
  { base: 3, range: 0.5 },    // ~3.00x
  { base: 5, range: 1 },   // ~5.00x
  { base: 10, range: 2 },  // ~10.00x
];

export const TREASURE_BONUS = 0.25; // +25% bonus
