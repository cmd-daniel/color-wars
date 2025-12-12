// src/actions/ActionFactory.ts
import type { ActionData, ActionRegistry, ActionType } from "@color-wars/shared/src/types/registry";
import type { IExecutable } from "./core";
import { HexHop } from "./actions";

export class ActionFactory {
  static create<T extends ActionType>(data: ActionData<T>): IExecutable {
    switch (data.type) {
      case "ANIMATE_HEX_HOP":
        return new HexHop(data.payload as ActionRegistry["ANIMATE_HEX_HOP"]);
      // ... others
      default:
        throw new Error(`Unknown Action Type: ${data.type}`);
    }
  }
}
