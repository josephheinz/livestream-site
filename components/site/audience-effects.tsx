"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { useReducedMotion } from "motion/react";

import { api } from "@/convex/_generated/api";

type Effect = { _id: string; kind: "confetti" | "imageRain"; sentAt: number };

function sample(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

function ConfettiBurst() {
  React.useEffect(() => {
    void import("@hiseb/confetti").then(({ default: confetti }) => {
      confetti({
        position: { x: window.innerWidth / 2, y: window.innerHeight * 0.2 },
        count: 160,
        velocity: 280,
        fade: true,
      });
    });
  }, []);

  return null;
}

function ImageRain({ effect, imageUrls }: { effect: Effect; imageUrls: string[] }) {
  const layer = React.useRef<HTMLDivElement>(null);
  const images = imageUrls.length > 0 ? imageUrls : ["/favicon.ico"];
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setFading(true), 4300);
    return () => window.clearTimeout(timeout);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let stop = () => {};

    void import("matter-js").then(({ Bodies, Body, Engine, World }) => {
      if (cancelled) return;
      const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
      const width = window.innerWidth;
      const height = window.innerHeight;
      const bodies = Array.from({ length: 18 }, (_, index) => {
        const seed = effect.sentAt + index * 131;
        const body = Bodies.rectangle(sample(seed) * width, -40 - index * 28, 40, 40, {
          restitution: 0.55,
          friction: 0.02,
          frictionAir: 0.005,
        });
        Body.setVelocity(body, { x: (sample(seed + 1) - 0.5) * 5, y: sample(seed + 2) * 2 });
        Body.setAngularVelocity(body, (sample(seed + 3) - 0.5) * 0.18);
        return body;
      });
      const floor = Bodies.rectangle(width / 2, height + 30, width + 120, 60, { isStatic: true });
      const leftWall = Bodies.rectangle(-30, height / 2, 60, height * 2, { isStatic: true });
      const rightWall = Bodies.rectangle(width + 30, height / 2, 60, height * 2, { isStatic: true });
      World.add(engine.world, [...bodies, floor, leftWall, rightWall]);

      const nodes = layer.current?.querySelectorAll<HTMLElement>("[data-physics-image]") ?? [];
      const tick = () => {
        Engine.update(engine, 1000 / 60);
        bodies.forEach((body, index) => {
          const node = nodes[index];
          if (node) {
            node.style.transform = `translate3d(${body.position.x - 20}px, ${body.position.y - 20}px, 0) rotate(${body.angle}rad)`;
          }
        });
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      stop = () => {
        cancelAnimationFrame(frame);
        World.clear(engine.world, false);
        Engine.clear(engine);
      };
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [effect]);

  return (
    <div
      ref={layer}
      className={`pointer-events-none fixed inset-0 z-[80] overflow-hidden transition-opacity duration-1000 ${fading ? "opacity-0" : ""}`}
      aria-hidden
    >
      {Array.from({ length: 18 }, (_, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- custom Convex-storage image URL
        <img
          key={index}
          data-physics-image
          src={images[index % images.length]}
          alt=""
          className="absolute h-10 w-10 object-contain"
        />
      ))}
    </div>
  );
}

export function AudienceEffects() {
  const effects = useQuery(api.settings.listAudienceEffects);
  const emojis = useQuery(api.emojis.list) ?? [];
  const reducedMotion = useReducedMotion();
  const initialized = React.useRef(false);
  const seen = React.useRef(new Set<string>());
  const timeouts = React.useRef<number[]>([]);
  const [active, setActive] = React.useState<Effect[]>([]);

  React.useEffect(() => {
    if (effects === undefined) return;
    if (!initialized.current) {
      initialized.current = true;
      effects.forEach((effect) => seen.current.add(effect._id));
      return;
    }
    const newEffects = effects.filter((effect) => !seen.current.has(effect._id));
    if (newEffects.length === 0) return;
    newEffects.forEach((effect) => seen.current.add(effect._id));
    setActive((current) => [...current, ...newEffects]);
    newEffects.forEach((effect) => {
      const timeout = window.setTimeout(() => {
        setActive((current) => current.filter((activeEffect) => activeEffect._id !== effect._id));
      }, effect.kind === "confetti" ? 3000 : 5500);
      timeouts.current.push(timeout);
    });
  }, [effects]);

  React.useEffect(() => () => timeouts.current.forEach((timeout) => window.clearTimeout(timeout)), []);

  if (active.length === 0 || reducedMotion) return null;

  const imageUrls = emojis.flatMap((emoji) => (emoji.imageUrl === null ? [] : [emoji.imageUrl]));
  return active.map((effect) =>
    effect.kind === "confetti" ? (
      <ConfettiBurst key={effect._id} />
    ) : (
      <ImageRain key={effect._id} effect={effect} imageUrls={imageUrls} />
    ),
  );
}
