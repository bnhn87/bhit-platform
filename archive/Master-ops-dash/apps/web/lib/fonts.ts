// apps/web/lib/fonts.ts
import { Outfit, Manrope, Geist } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-brand" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-brand" });
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-brand" });

// Pick the look you want here:
const ACTIVE_FONT: "outfit" | "manrope" | "geist" = "outfit";

export const brand =
  ACTIVE_FONT === "manrope" ? manrope : ACTIVE_FONT === "geist" ? geist : outfit;
