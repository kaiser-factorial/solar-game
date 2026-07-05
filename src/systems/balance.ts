/** All gameplay tuning lives here — tweak with the nephews! */
export const BALANCE = {
  playerSpeed: 230,
  jumpHeight: 215, // px — arc shape varies with planet gravity, height stays fair
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
  tile: 32,
  worldHeight: 540,
};
