// src/animation/driver/AnimationHandle.ts
export class ActionHandle {
  private _finished: Promise<void>;
  private _kill: () => void;
  private _complete: () => void;

  constructor(promise: Promise<void>, killFn: () => void, completeFn: () => void) {
    this._finished = promise;
    this._kill = killFn;
    this._complete = completeFn;
  }

  /**
   * Await this to wait for the animation to naturally finish
   * or be completed.
   */
  get finished() {
    return this._finished;
  }

  /**
   * Stops the animation immediately in its current state.
   * The promise will NOT resolve (or will reject, depending on pref).
   * Usually used for cleanup.
   */
  cancel() {
    this._kill();
  }

  /**
   * Forces the animation to jump strictly to its end state
   * and resolves the promise immediately.
   */
  complete() {
    this._complete();
  }

  static attachCallBack(anim: gsap.core.Animation, fn?: () => Promise<void>): ActionHandle {
    const promise = new Promise<void>(async (resolve) => {
      // If already finished (duration 0), resolve immediately
      if (anim.progress() === 1) {
        (async () => {
          if (fn) await fn();
          resolve();
        })();
        return;
      }
      anim.eventCallback("onComplete", () => {
        (async () => {
          if (fn) await fn();
          resolve();
        })();
      });
    });

    return new ActionHandle(
      promise,
      () => anim.kill(), // cancel
      () => anim.progress(1).kill(), // complete (jump to end, then kill to free memory)
    );
  }
}
