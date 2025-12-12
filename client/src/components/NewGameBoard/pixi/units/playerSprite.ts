import * as PIXI from "pixi.js";

export class PlayerSprite extends PIXI.Container {
  public id: string;
  private graphics: PIXI.Graphics;
  private shadow: PIXI.Graphics;

  constructor(id: string, color: number) {
    super();
    this.id = id;

    this.shadow = new PIXI.Graphics();
    this.shadow.ellipse(0, 0, 15, 0).fill({ color: 0x0, alpha: 0.3 });
    this.shadow.position.set(0, 15);
    this.addChild(this.shadow);

    this.graphics = new PIXI.Graphics();
    this.graphics.circle(0, 0, 20).fill({ color }).stroke({ width: 2, color: 0xffffff });

    this.graphics.eventMode = "static";
    this.graphics.cursor = "pointer";

    this.addChild(this.graphics);
  }

  public setSelected(selected: boolean) {
    this.graphics.tint = selected ? 0xffff00 : 0xffffff;
  }
}
