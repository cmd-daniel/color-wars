import * as PIXI from "pixi.js";
import { PlayerSprite } from "../units/playerSprite";
import { pixiTargetLocator } from "@/animation/target-locator";

export class TokenLayer extends PIXI.Container {
  private units: Map<string, PlayerSprite> = new Map();

  constructor() {
    super();
  }

  public addToken(id: string, color: number, x: number, y: number) {
    if (this.units.has(id)) {
      console.warn(`TokenLayer: Unit ${id} already exists.`);
      return;
    }

    const unit = new PlayerSprite(id, color);
    unit.position.set(x, y);

    this.addChild(unit);
    this.units.set(id, unit);

    pixiTargetLocator.register(id, unit);
  }

  public deleteToken(id: string) {
    const unit = this.units.get(id);
    if (!unit) return;

    pixiTargetLocator.unregister(id);

    this.removeChild(unit);
    unit.destroy({ children: true });
    this.units.delete(id);
  }

  public getToken(id: string) {
    return this.units.get(id);
  }

  public clear() {
    this.units.forEach((unit) => {
      pixiTargetLocator.unregister(unit.id);
      unit.destroy({ children: true });
    });
    this.units.clear();
    this.removeChildren();
  }
}
