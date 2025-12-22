// src/actions/ActionFactory.ts
import type { ActionData, ActionRegistry, ActionType } from "@color-wars/shared/src/types/registry";
import type { IExecutable } from "./core";
import { HexHop, IncrMoney, RollDice, DecrMoney } from "./actions";

export class ActionFactory {
  static create<T extends ActionType>(data: ActionData<T>): IExecutable {
    switch (data.type) {
      case 'MOVE_PLAYER':
        return new HexHop(data.payload as ActionRegistry['MOVE_PLAYER']);
        
      case 'ROLL_DICE':
        return new RollDice(data.payload as ActionRegistry['ROLL_DICE']);

      case 'INCR_MONEY':
        return new IncrMoney(data.payload as ActionRegistry['INCR_MONEY']);
      
      case 'DECR_MONEY':
        return new DecrMoney(data.payload as ActionRegistry['DECR_MONEY']);

      default:
        throw new Error(`Unknown Action Type: ${data.type}`);
    }
  }
}
