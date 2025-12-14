import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import { Flip } from "gsap/Flip";


PixiPlugin.registerPIXI(PIXI);
gsap.registerPlugin(Flip);
gsap.registerPlugin(PixiPlugin);

export default gsap
export {Flip}