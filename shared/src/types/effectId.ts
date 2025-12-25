export type RewardID = 
  | "GET_500_CASH" 
  | "GET_2000_CASH"
  | "GET_KILL_CARD"
  | "GET_SHIELD_CARD"

export type PenaltyID = 
  | "INSTANT_LOSE_CASH_500" 
  | "INSTANT_LOSE_CASH_2000"
  | "LOSE_ALL_CARDS"
  | "lOSE_RANDOM_CARD"

export type CardID = "KILL" | "SHIELD" | "MISSILE";

export type StatusEffectID = "DEBT" | "INCOME";