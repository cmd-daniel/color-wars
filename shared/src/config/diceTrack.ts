export const TILE_TYPES = {
    START: "START",
    EMPTY: "EMPTY",
    INCOME: "INCOME",
    TAX: "TAX",
    REWARD: "REWARD",
    PENALTY: "PENALTY",
    SURPRISE: "SURPRISE"
  } as const;
  
  export type TileType = typeof TILE_TYPES[keyof typeof TILE_TYPES];
  
  export const DICE_TRACK: TileType[] = [
    "START",     
    "EMPTY",     
    "INCOME",    
    "TAX",       
    "SURPRISE",  
    "PENALTY",   
    "REWARD",    
    "EMPTY",     
    "INCOME",    
    "TAX",       
    "SURPRISE",  
    "EMPTY",     
    "PENALTY",   
    "INCOME",    
    "EMPTY",     
    "REWARD",    
    "TAX",       
    "SURPRISE",  
    "EMPTY",     
    "TAX",       
    "REWARD",    
    "EMPTY",     
    "INCOME",    
    "PENALTY",   
    "SURPRISE",  
    "EMPTY",     
    "TAX",       
    "INCOME",    
    "EMPTY",     
    "REWARD",    
    "PENALTY",   
    "SURPRISE",  
    "EMPTY",     
    "PENALTY"    
  ] as const;
  