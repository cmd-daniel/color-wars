import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

PixiPlugin.registerPIXI(PIXI);
gsap.registerPlugin(PixiPlugin);

export default gsap