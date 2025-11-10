// apps/web/lib/fonts.ts
import { Outfit, Manrope } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-brand" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-brand" });

// Pick the look you want here:
const ACTIVE_FONT = "outfit";

const fonts = {
  outfit,
  manrope,
} as const;

export const brand = fonts[ACTIVE_FONT as keyof typeof fonts];