// src/actions/ActionFactory.ts
import type { ActionData, ActionRegistry, ActionType } from "@color-wars/shared/src/types/registry";
import type { IExecutable } from "./core";
import { HexHop, RollDice } from "./actions";

export class ActionFactory {
  static create<T extends ActionType>(data: ActionData<T>): IExecutable {
    switch (data.type) {
      case 'MOVE_PLAYER':
        return new HexHop(data.payload as ActionRegistry['MOVE_PLAYER']);
        
      case 'ROLL_DICE':
        return new RollDice(data.payload as ActionRegistry['ROLL_DICE']);

      default:
        throw new Error(`Unknown Action Type: ${data.type}`);
    }
  }
}
