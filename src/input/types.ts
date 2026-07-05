/**
 * The contract between control schemes and gameplay (PLAN.md §3.7).
 * Gameplay code reads InputIntent ONLY — never devices — so face/hand
 * schemes drop in later without touching any entity code.
 */
export interface InputIntent {
  moveX: number; // -1..1
  aimX: number; // -1..1, for attack direction
  aimY: number; // -1..1, for attack direction
  jump: boolean;
  attack: boolean;
  interact: boolean;
}

export interface ControlScheme {
  update(): InputIntent;
  destroy(): void;
}
