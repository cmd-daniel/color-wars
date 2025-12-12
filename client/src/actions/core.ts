import type { ActionHandle } from "@animation/driver/AnimationHandle";

export interface IExecutable {
  execute(): ActionHandle;
}

export class ActionQueue {
  private queue: IExecutable[] = [];
  private isRunning = false;
  private currentAction: ActionHandle | null = null;

  public enqueue(action: IExecutable) {
    this.queue.push(action);
    this.process();
  }

  clear(type: "kill" | "complete") {
    if (this.currentAction) {
      if (type === "kill") {
        this.currentAction.cancel();
      } else {
        this.currentAction.complete();
      }
    }

    for (const queued of this.queue) {
      if (type == "kill") {
        queued.execute().complete();
      }
    }

    this.queue = [];
    this.currentAction = null;
  }

  private async process() {
    if (this.isRunning) return;
    if (this.queue.length == 0) return;

    this.isRunning = true;

    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        try {
          const currentAction = action.execute();
          this.currentAction = currentAction;
          await currentAction.finished;
        } catch (error) {
          console.error("Action Failed: ", error);
        }
      }
    }
    this.isRunning = false;
  }
}

export abstract class BaseAction<TPayload> implements IExecutable {
  protected payload: TPayload;
  constructor(payload: TPayload) {
    this.payload = payload;
  }

  abstract execute(): ActionHandle;
}

/**
 * Concrete Composite Action
 * Can be used directly as a generic group, or extended for specific sequences.
 */
// export class CompositeAction implements IExecutable {
//   protected subActions: IExecutable[] = [];
//   private mode: "SERIAL" | "PARALLEL" = "SERIAL";

//   /**
//    * Adds an action (Atomic or Composite) to the list.
//    */
//   public add(action: IExecutable): this {
//     this.subActions.push(action);
//     return this;
//   }

//   /**
//    * Sets execution mode to Serial (Sequence).
//    * Actions play one after another.
//    */
//   public runSerial(){
//     this.mode = "SERIAL";
//   }

//   /**
//    * Sets execution mode to Parallel (Batch).
//    * Actions play simultaneously.
//    */
//   public runParallel() {
//     this.mode = "PARALLEL";
//   }

//   /**
//    * Execution Logic
//    */
//   async execute(): Promise<void> {
//     if (this.subActions.length === 0) return;

//     if (this.mode === "SERIAL") {
//       for (const action of this.subActions) {
//         await action.execute();
//       }
//     } else {
//       await Promise.all(this.subActions.map((action) => action.execute()));
//     }
//   }
// }
