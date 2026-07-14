"use client";

import * as React from "react";
import type { Body as MatterBody, Engine as MatterEngine } from "matter-js";
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

function ImageRain({ effects, imageUrls }: { effects: Effect[]; imageUrls: string[] }) {
  const layer = React.useRef<HTMLDivElement>(null);
  const nodes = React.useRef(new Map<string, HTMLImageElement>());
  const matter = React.useRef<typeof import("matter-js") | null>(null);
  const physics = React.useRef<{ engine: MatterEngine; bodies: Map<string, MatterBody> } | null>(null);
  const effectsRef = React.useRef(effects);
  const knownEffects = React.useRef(new Set<string>());
  const fadeTimers = React.useRef(new Map<string, number>());
  const [fadingEffects, setFadingEffects] = React.useState<Set<string>>(new Set());

  effectsRef.current = effects;
  const images = imageUrls.length > 0 ? imageUrls : ["/favicon.ico"];

  const syncPhysics = () => {
    if (physics.current === null || matter.current === null) return;
    const { Bodies, Body, World } = matter.current;
    const activeKeys = new Set<string>();
    for (const effect of effectsRef.current) {
      for (let index = 0; index < 18; index++) {
        const key = `${effect._id}-${index}`;
        activeKeys.add(key);
        if (physics.current.bodies.has(key)) continue;
        const seed = effect.sentAt + index * 131;
        const body = Bodies.rectangle(sample(seed) * window.innerWidth, -40 - index * 28, 40, 40, {
          restitution: 0.55,
          friction: 0.02,
          frictionAir: 0.005,
        });
        Body.setVelocity(body, { x: (sample(seed + 1) - 0.5) * 5, y: sample(seed + 2) * 2 });
        Body.setAngularVelocity(body, (sample(seed + 3) - 0.5) * 0.18);
        physics.current.bodies.set(key, body);
        World.add(physics.current.engine.world, body);
      }
    }
    for (const [key, body] of physics.current.bodies) {
      if (!activeKeys.has(key)) {
        World.remove(physics.current.engine.world, body);
        physics.current.bodies.delete(key);
        nodes.current.delete(key);
      }
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    let frame = 0;

    void import("matter-js").then((loadedMatter) => {
      if (cancelled) return;
      const { Bodies, Engine, World } = loadedMatter;
      const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
      physics.current = { engine, bodies: new Map() };
      matter.current = loadedMatter;
      const floor = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth + 120, 60, { isStatic: true });
      const leftWall = Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight * 2, { isStatic: true });
      const rightWall = Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight * 2, { isStatic: true });
      World.add(engine.world, [floor, leftWall, rightWall]);
      syncPhysics();

      const tick = () => {
        Engine.update(engine, 1000 / 60);
        physics.current?.bodies.forEach((body, key) => {
          const node = nodes.current.get(key);
          if (node) {
            node.style.transform = `translate3d(${body.position.x - 20}px, ${body.position.y - 20}px, 0) rotate(${body.angle}rad)`;
          }
        });
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (physics.current !== null && matter.current !== null) {
        matter.current.World.clear(physics.current.engine.world, false);
        matter.current.Engine.clear(physics.current.engine);
      }
      physics.current = null;
      matter.current = null;
    };
  }, []);

  React.useEffect(() => {
    syncPhysics();
    for (const effect of effects) {
      if (knownEffects.current.has(effect._id)) continue;
      knownEffects.current.add(effect._id);
      fadeTimers.current.set(
        effect._id,
        window.setTimeout(() => {
          setFadingEffects((current) => new Set(current).add(effect._id));
        }, 4300),
      );
    }
  }, [effects]);

  React.useEffect(() => () => fadeTimers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <div
      ref={layer}
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      aria-hidden
    >
      {effects.flatMap((effect) =>
        Array.from({ length: 18 }, (_, index) => {
          const key = `${effect._id}-${index}`;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- custom Convex-storage image URL
            <img
              key={key}
              ref={(node) => {
                if (node) nodes.current.set(key, node);
                else nodes.current.delete(key);
              }}
              src={images[index % images.length]}
              alt=""
              className={`absolute h-10 w-10 object-contain transition-opacity duration-1000 ${fadingEffects.has(effect._id) ? "opacity-0" : ""}`}
            />
          );
        }),
      )}
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
  const imageEffects = active.filter((effect) => effect.kind === "imageRain");
  return (
    <>
      {active.filter((effect) => effect.kind === "confetti").map((effect) => <ConfettiBurst key={effect._id} />)}
      {imageEffects.length > 0 && <ImageRain effects={imageEffects} imageUrls={imageUrls} />}
    </>
  );
}
