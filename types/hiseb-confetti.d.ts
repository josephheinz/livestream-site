declare module "@hiseb/confetti" {
  type ConfettiOptions = {
    position?: { x: number; y: number };
    count?: number;
    size?: number;
    velocity?: number;
    fade?: boolean;
  };

  export default function confetti(options?: ConfettiOptions): void;
}
