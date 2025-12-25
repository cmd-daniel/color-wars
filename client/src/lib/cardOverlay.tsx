import { useEffect, useRef } from "react";
import gsap from "@/lib/gsap";
import { useCardStore } from "@/stores/cardSelectionStore";
import { ResolveSelectionAction } from "@/actions/actions";

import { Swiper, SwiperSlide, type SwiperClass } from "swiper/react";
import { EffectCards, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";

import "hover-tilt/web-component";
import type { HoverTiltProps } from "hover-tilt/types";
import { Button } from "@/components/ui/button";
import { GameEventBus } from "./managers/GameEventBus";

declare class HoverTiltElement extends HTMLElement {
  /**
   * Typed props bag mirroring the web component's configurable options.
   * This is primarily for IDE intellisense when accessing the element via JS.
   */
  props?: HoverTiltProps;
}

declare module "react" {
  interface HTMLElementTagNameMap {
    "hover-tilt": HoverTiltElement;
  }

  namespace JSX {
    interface IntrinsicElements {
      /**
       * HoverTilt web component.
       *
       * When using React/Preact with TypeScript, import this module somewhere
       * in your app (e.g. `import 'hover-tilt/web-component';`) to enable
       * typed props and JSX support for `<hover-tilt>...</hover-tilt>`.
       */
      "hover-tilt": HoverTiltProps & JSX.IntrinsicElements["div"];
    }
  }
}

const Card = ({ id, onClick }: { id: string; onClick: (id: string) => void }) => {
  const phase = useCardStore((s) => s.phase);
  const colors = {
    a: "bg-red-800",
    b: "bg-blue-800",
    c: "bg-green-800",
  } as {[id:string]:string};
  return (
    <div id={id} className="card-wrapper relative flex h-full w-full justify-center rounded-xl select-none">
      <style>{`
        .glare-rounded::part(tilt)::before {
            border-radius: calc(var(--radius) + 4px);
        }
        .hoverr::part(container),
        .hoverr::part(tilt)
        {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
      `}</style>
      <hover-tilt
        glareMask="url(/aztec-pattern.webp)"
        glareMaskMode="luminance"
        className="hoverr glare-rounded h-full w-full overflow-visible"
        tilt-factor="1.5"
        scale-factor="1.1"
        onClick={() => phase === "interacting" && onClick(id)}
      >
        <div className={`flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl ${colors[id]} p-4`}>
          <h2 className="text-2xl font-bold">Card {id}</h2>
        </div>
      </hover-tilt>
    </div>
  );
};

const Thumb = ({ id }: { id: string }) => {
  const selectedCardId = useCardStore((s) => s.selectedCardId);
  const setSelectedCardId = useCardStore((s) => s.setSelectedCardId);
  const handleOnClick = () => {
    setSelectedCardId(id);
  };
  return (
    <div
      onClick={handleOnClick}
      className={`card-wrapper flex h-16 w-16 cursor-pointer items-center justify-center rounded-md bg-zinc-700 text-white select-none ${selectedCardId == id ? "border-3 border-white" : ""}`}
    >
      {id}
    </div>
  );
};

// --- Main Overlay ---
export const CardSelectionOverlay = () => {
  // Using selector to prevent unnecessary re-renders if other parts of store change
  const cardIds = useCardStore((s) => s.cardIds);
  const phase = useCardStore((s) => s.phase);
  const selectedCardId = useCardStore((s) => s.selectedCardId);
  const swiperRef = useRef<SwiperClass | null>(null);
  const setPhase = useCardStore((s) => s.setPhase);
  const reset = useCardStore((s) => s.reset);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleCardSelect = () => {
    if (!selectedCardId){
      GameEventBus.emit('TOAST',{
        content:'please select a card !!!',
        type:'error'
      })
      return
    };
    console.log("action created", selectedCardId);
    new ResolveSelectionAction({ selectedCardId: "c" }).execute();
    // Example: sendSelectCardOp(id);
  };

  useEffect(() => {
    const activeIndex = cardIds.findIndex((v) => v == selectedCardId);
    if (swiperRef.current?.activeIndex !== activeIndex) {
      swiperRef.current?.slideTo(activeIndex, 200);
    }
  }, [selectedCardId]);

  // 1. Reveal Animation
  useEffect(() => {
    if (phase === "drawing" && containerRef.current) {
      const wrappers = Array.from(containerRef.current.querySelectorAll(".card-wrapper")).reverse();
      gsap.fromTo(
        wrappers,
        { y: -800, opacity: 0, rotateZ: 15 },
        {
          y: 0,
          opacity: 1,
          rotateZ: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "elastic.out(1, 0.8)",
          onComplete: () => {
            setPhase("interacting");
          },
        },
      );
    }
  }, [phase, setPhase]);

  // 2. Exit Animation
  useEffect(() => {
    console.log(phase === "resolving", containerRef.current, selectedCardId);
    if (phase === "resolving" && containerRef.current && selectedCardId) {
      console.log("Starting exit animation for selected card:", selectedCardId);
      const wrappers = Array.from(containerRef.current.querySelectorAll(".card-wrapper")).reverse() as HTMLElement[];
      const selectedWrapper = wrappers.find((el) => el.id === `${selectedCardId}`);
      const others = wrappers.filter((el) => el !== selectedWrapper);

      const tl = gsap.timeline({
        onComplete: () => reset(), // This sets phase to 'idle', unlocking the Action Queue
      });

      // Animate unselected cards away
      tl.to(others, {
        opacity: 0,
        y: 500,
        scale: 0.9,
        duration: 0.3,
        stagger: 0.05,
        ease: "power2.in",
      });

      // Animate selected card
      if (selectedWrapper) {
        tl.to(selectedWrapper, {
          y: -100,
          opacity: 0,
          duration: 0.3,
          delay: 0.2,
          ease: "power2.in",
        });
      }
    }
  }, [phase, selectedCardId, reset]);

  if (phase === "idle") return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-100 flex h-full w-full flex-col items-center justify-center gap-12 bg-black/80 backdrop-blur-sm perspective-[2000px]">
      <style>
        {`
          .swiper.first {
            width: 60vw;
            height: 45vh;
          }

          .swiper,
          .swiper-wrapper,
          .swiper-slide {
            overflow:visible !important;
          }

          .swiper-slide {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            font-size: 22px;
            font-weight: bold;
            color: #fff;
          }
      `}
      </style>

      <Swiper
        className="first"
        effect="cards"
        modules={[EffectCards, Thumbs]}
        onSwiper={(s) => (swiperRef.current = s)}
        grabCursor={true}
        allowTouchMove={false}
        simulateTouch={false}
        cardsEffect={{
          slideShadows: false,
        }}
      >
        {cardIds.map((id) => (
          <SwiperSlide>
            <Card key={id} id={id} onClick={handleCardSelect} />
          </SwiperSlide>
        ))}
      </Swiper>

      <Swiper allowTouchMove={false} slidesPerView={3} watchSlidesProgress spaceBetween={12} className="mt-4 w-72">
        {cardIds.map((id) => (
          <SwiperSlide key={id}>
            <Thumb id={id} />
          </SwiperSlide>
        ))}
      </Swiper>
      <Button className="card-wrapper relative transition-none" onClick={handleCardSelect} size="lg" variant="outline">
        Confirm Selection
      </Button>
    </div>
  );
};
