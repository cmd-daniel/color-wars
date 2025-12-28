// src/actions/ActionFactory.ts
import type { ActionData } from "@color-wars/shared/src/types/turnActionRegistry";
import type { IExecutable } from "./core";
import { HexHop, IncrMoney, RollDice, DecrMoney, DrawCardsAction, ResolveSelectionAction } from "./actions";

export class ActionFactory {
  static create(data: ActionData): IExecutable {
    switch (data.type) {
      case 'MOVE_PLAYER':
        return new HexHop(data.payload);
        
      case 'ROLL_DICE':
        return new RollDice(data.payload);

      case 'INCR_MONEY':
        return new IncrMoney(data.payload);
      
      case 'DECR_MONEY':
        return new DecrMoney(data.payload);
      
      case 'DRAW_3_REWARD_CARDS':
        return new DrawCardsAction(data.payload)

      case 'SELECT_CARD':
        return new ResolveSelectionAction(data.payload)

      default:
        throw new Error(`Unknown Action Type, unable to create action: ${JSON.stringify(data)}`);
    }
  }
}
