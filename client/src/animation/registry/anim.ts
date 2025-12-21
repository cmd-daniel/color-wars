import * as PIXI from "pixi.js";
import gsap from "@/lib/gsap";
import { PlayerSprite } from "@/components/NewGameBoard/pixi/units/playerSprite";

/**
 * Animation Recipe: token hop
 */
export function animateUnitHop(unit: PlayerSprite, pathTiles: PIXI.Sprite[]) {
  const tl = gsap.timeline();

  // We start from the unit's current position (or the first tile in the path if we want to be strict)
  // But usually, the path[0] is the tile the unit is currently on.
  for (let i = 0; i < pathTiles.length - 1; i++) {
    const startTile = pathTiles[i];
    const endTile = pathTiles[i + 1];

    // Helper object to tween 'progress' from 0 to 1
    const tweenObj = { t: 0 };

    tl.to(tweenObj, {
      duration: 0.3,
      t: 1,
      ease: "power1.inOut",
      onStart: () => {
        // Optional: Update logical ID at start of hop, or end?
        // Usually safer to update at end, or update strictly purely visual here.
      },
      onUpdate: () => {
        // LINEAR INTERPOLATION (Lerp)
        // Calculate position based on where the tiles are RIGHT NOW.
        // If tiles move due to resize, this formula accounts for it instantly.
        unit.x = startTile.x + (endTile.x - startTile.x) * tweenObj.t;
        unit.y = startTile.y + (endTile.y - startTile.y) * tweenObj.t;
      },
      onComplete: () => {
        // Snap explicitly to ensure precision at end of step
        console.log("completed hop to tile: ", endTile.label);
        unit.position.copyFrom(endTile.position);
        unit.currentTileId = endTile.label; // Update logical position step-by-step
      },
    });
  }

  return tl;
}

export function ToXY(target: PIXI.Sprite, endPos: { x: number; y: number }) {
  return gsap.to(target, {
    x: endPos.x,
    y: endPos.y,
    duration: 0.5,
    onUpdate: () => {
      console.log("updating,", target.x);
    },
  });
}

export function animateCoinConfettiToDom(sprite: PIXI.Sprite, targetEl: HTMLElement, app: PIXI.Application, count = 12) {
  const confettiEls: HTMLElement[] = [];
  const meta: { burstOffset: { x: number; y: number } }[] = [];
  const coinSize = sprite.width / 4;
  const global = sprite.getGlobalPosition();
  const canvasRect = app.canvas.getBoundingClientRect();
  const baseX = canvasRect.left + global.x - coinSize / 2;
  const baseY = canvasRect.top + global.y - coinSize / 2;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.width = `${coinSize}px`;
    el.style.height = `${coinSize}px`;
    el.style.background = "gold";
    el.style.borderRadius = "50%";
    el.style.border = "1px solid #262626";
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.zIndex = "10";

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * coinSize * 3;

    el.style.transform = `translate(${baseX}px, ${baseY}px)`;
    document.body.appendChild(el);

    meta.push({
      burstOffset: {
        x: baseX + Math.cos(angle) * radius,
        y: baseY + Math.sin(angle) * radius,
      },
    });

    confettiEls.push(el);
  }

  const rect = targetEl.getBoundingClientRect();
  const endX = rect.left + rect.width / 2;
  const endY = rect.top + rect.height / 2;
  return gsap
    .timeline()
    .to(confettiEls, {
      transform: (i) => {
        const { burstOffset } = meta[i];
        return `translate(${burstOffset.x}px, ${burstOffset.y}px)`;
      },
      stagger: 0.002,
      duration: 0.4,
      ease: "power2.out",
    })
    .to(confettiEls, {
      transform: () => {
        return `translate(${endX}px, ${endY}px)`;
      },
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      stagger: 0.005,
      onComplete: () => {
        confettiEls.forEach((el) => el.remove());
      },
    });
}

export function createFloatingDiff(container: HTMLElement, diff: number) {
  const diffEl = document.createElement("div");

  diffEl.textContent = `${diff > 0 ? "+" : ""}${diff}`;

  // Tailwind utility classes:
  diffEl.className = `absolute left-[-20] top-0 font-bold pointer-events-none`.trim();

  diffEl.style.color = diff > 0 ? "green" : "red";

  container.appendChild(diffEl);

  const tl = gsap.timeline();

  tl.fromTo(
    diffEl,
    {
      y: 0,
      opacity: 0,
    },
    {
      y: -20,
      opacity: 1,
      duration: 0.4,
    },
  )
    .to(diffEl, { duration: 1 }) // <— wait 1 second
    .to(diffEl, {
      y: -60,
      opacity: 0,
      duration: 0.4,
      ease: "power1.out",
      onComplete: () => diffEl.remove(),
    });
  return tl;
}

export function animateCounter(el: HTMLSpanElement, animatedValue: { val: number }, target: number) {
  return gsap.to(animatedValue, {
    val: target,
    duration: 0.6,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = Math.floor(animatedValue.val).toString();
    },
  });
}
