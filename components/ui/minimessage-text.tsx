"use client";

import { useLayoutEffect, useRef } from "react";
import { MiniMessage } from "minimessage-js/dist/minimessage.esm.js";

const FORBIDDEN_TAGS = /<\/?(?:obf(?:uscated)?|head)(?::[^>]*)?>/gi;
const miniMessage = MiniMessage.builder()
  .preProcessor((text) => text.replace(FORBIDDEN_TAGS, ""))
  .strict(true)
  .build();

export function MiniMessageText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const target = ref.current;
    if (!target) return;

    target.replaceChildren();
    try {
      miniMessage.toHTML(miniMessage.deserialize(text), target);
    } catch {
      target.textContent = text.replace(/<[^>]*>/g, "");
    }

    return () => target.replaceChildren();
  }, [text]);

  return <span ref={ref} />;
}
