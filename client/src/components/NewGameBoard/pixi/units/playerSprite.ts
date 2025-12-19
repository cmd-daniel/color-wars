import gsap from "@/lib/gsap";
import * as PIXI from "pixi.js";

export class PlayerSprite extends PIXI.Container {
  public id: string;
  // Track where this unit logically belongs
  public currentTileId: string | null = null; 
  public isAnimating: boolean = false; // Prevents resize from snapping mid-animation
  private pulseTl?: gsap.core.Timeline;
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
    this.graphics.circle(0, 0, 10).fill({ color }).stroke({ width: 2, color: 0xffffff });

    this.graphics.eventMode = "static";
    this.graphics.cursor = "pointer";

    this.addChild(this.graphics);
  }

  public setSelected(selected: boolean) {
    this.graphics.tint = selected ? 0xffff00 : 0xffffff;
  }

  public startPulse(){
    if(this.pulseTl) {
      console.log('start pulse, oh no')
      this.pulseTl.kill()
    }
    
    this.pulseTl = gsap.timeline()

    this.pulseTl.to(this.graphics, {
      pixi: {
        scale: 0.85,
      },
      duration: 0.3,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  public stopPulse(){
    this.pulseTl?.kill()
    this.pulseTl = undefined
    gsap.to(this.graphics, {
      pixi: {
        scale: 1,
      },
      duration: 0.2,
      ease: "power1.inOut",
    });
  }

  destroy(_?: PIXI.DestroyOptions): void {
    this.pulseTl?.kill()
    this.pulseTl = undefined
  }
}