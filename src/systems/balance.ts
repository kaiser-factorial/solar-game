/** All gameplay tuning lives here — tweak with the nephews! */
export const BALANCE = {
  playerSpeed: 230,
  // Jump is a FIXED launch velocity, not a fixed peak height — peak height
  // = jumpVelocity^2 / (2 * gravity.y) falls out naturally, so real relative
  // planetary gravity actually changes how high you can jump (heavier =
  // lower jumps, lighter = soaring ones), instead of every planet secretly
  // reaching the same height with just a different arc speed.
  jumpVelocity: 630,
  attackCooldownMs: 340,
  attackDurationMs: 140,
  attackReach: 40,
  iframesMs: 1000,
  knockback: 260,
  hitstunMs: 220, // player's own held-direction input is briefly suppressed so knockback is actually visible
  stompDamage: 2, // squish the lil guys in one hop
  stompBounce: 380,
  stompMinFallSpeed: 20,
  stompTopTolerance: 22,
  enemyHitContactCooldownMs: 2000,
  startHearts: 3,
  maxHeartsCap: 10,
  monsterAggroRange: 300,
  bossTelegraphMs: 650,
  bossChargeCooldownMs: 3200,
  bossChargeSpeedMult: 3.2,
  bossRockCooldownMs: 2800,
  bossRockSpeed: 220,
  bossRockDamage: 1,
  bossBarrageSpreadDeg: 22,
  bossGroundPoundRadius: 110,
  bossGroundPoundDamage: 1,
  bossMinionCooldownMs: 9000,
  // Speed of a flame dropped straight down by a flame-dropper robot.
  flameDropSpeed: 190,
  tile: 32,
  worldHeight: 540,
  // Eating food at full health powers you up instead of doing nothing.
  powerupMs: 8000,
  powerupSpeedMult: 1.4,
  // Floating platforms for verticality — a chance every so many columns.
  platformChance: 0.35,
  platformMinGapCols: 10,
  platformMaxGapCols: 22,
};
