import "react";

// CSS custom properties are valid in a style prop; this tells TypeScript so, without casts.
declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}
