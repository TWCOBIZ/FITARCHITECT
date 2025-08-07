declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    flat?: boolean;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null>;
    reset(): void;
    create(canvas: HTMLCanvasElement, options?: any): ConfettiFunction;
  }

  const confetti: ConfettiFunction;
  export = confetti;
}