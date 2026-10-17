import { readFileSync } from "node:fs";
import { join } from "node:path";

const fontsDir = join(process.cwd(), "app/fonts");

/** Literata and DM Mono TTF buffers for next/og (loaded once at module scope). */
export const literataOg = readFileSync(join(fontsDir, "literata-400.ttf"));
export const dmMonoOg = readFileSync(join(fontsDir, "dm-mono-400.ttf"));
