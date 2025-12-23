export type RewardID = 
  | "INSTANT_CASH_500" 
  | "INSTANT_CASH_2000"
  | "GIVE_CARD_KILL"
  | "GIVE_CARD_SHIELD"
  | "LOAN_2000_DEBT_400" // Complex: Cash now, penalty later
  | "PASSIVE_REVENUE_500";

export type PenaltyID = 
  | "INSTANT_LOSE_CASH_500" 
  | "INSTANT_LOSE_CASH_2000"
  | "LOSE_ALL_CARDS"
  | "lOSE_RANDOM_CARD"
  | "DEBT_400_FOR_6_TURNS" // Complex: No immediate effect, penalty later

export type CardID = "KILL" | "SHIELD" | "MISSILE";

export type StatusEffectID = "DEBT" | "INCOME";