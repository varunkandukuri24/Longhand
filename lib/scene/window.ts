import type { Condition, Light } from "./types";

/** DESIGN.md sky keys use "golden"; app Light uses "goldenHour". */
export type WindowLight = "morning" | "afternoon" | "golden" | "night";

export type WindowElement = {
  kind: string;
  style: string;
};

export type WindowScene = {
  sky: string;
  ground: string;
  roof: string;
  snowCap: boolean;
  groundH: string;
  back: WindowElement[];
  front: WindowElement[];
};

const SKY: Record<WindowLight, Record<Condition, string>> = {
  morning: {
    clear: "#A7CBE6",
    cloudy: "#BCC6CE",
    rain: "#8C99A6",
    snow: "#B2C0CD",
  },
  afternoon: {
    clear: "#6FA7D8",
    cloudy: "#9DA9B4",
    rain: "#75838F",
    snow: "#9AABBB",
  },
  golden: {
    clear: "#E09862",
    cloudy: "#B98F78",
    rain: "#8D6F62",
    snow: "#C09A90",
  },
  night: {
    clear: "#172031",
    cloudy: "#1E2634",
    rain: "#141B25",
    snow: "#1F2838",
  },
};

/** Rooftop skyline, viewBox="0 0 100 20" preserveAspectRatio="none". */
export const ROOF =
  "M0 20 L0 9 L8 9 L8 6 L14 6 L14 9 L22 9 L22 4 L25 2 L28 4 L28 9 L37 9 L37 7 L46 7 L46 10 L55 10 L55 5 L63 5 L63 8 L71 8 L71 3 L74 1 L77 3 L77 8 L86 8 L86 6 L93 6 L93 9 L100 9 L100 20 Z";

const hex = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];

const mix = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [
    number,
    number,
    number,
  ];

const rgb = (a: [number, number, number]): string => `rgb(${a.join(",")})`;

export function toWindowLight(light: Light): WindowLight {
  return light === "goldenHour" ? "golden" : light;
}

/**
 * Port of DESIGN.md reference implementation. Keep the numbers.
 * Positions are % of the window; sizes are cqmin.
 */
export function windowSceneFor(
  light: Light,
  cond: Condition,
  { density = 1.6, groundH = 9 }: { density?: number; groundH?: number } = {},
): WindowScene {
  const wLight = toWindowLight(light);
  const night = wLight === "night";
  const sky = hex(SKY[wLight][cond]);
  let seed =
    wLight.length * 131 + cond.length * 977 + Math.round(density * 10) + 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const f = (n: number) => n.toFixed(2);
  const back: WindowElement[] = [];
  const front: WindowElement[] = [];

  const ground = night
    ? ([12, 18, 27] as [number, number, number])
    : wLight === "golden"
      ? mix(sky, [74, 44, 34], 0.6)
      : mix(sky, [52, 60, 72], 0.55);

  const disc = (
    x: number,
    y: number,
    s: number,
    c: string,
    halo: string,
  ) => {
    back.push({
      kind: "sun",
      style: `left:${x}%;top:${y}%;width:${s}cqmin;aspect-ratio:1;border-radius:50%;background:${c};box-shadow:0 0 0 ${f(s * 0.3)}cqmin ${halo}`,
    });
  };

  const cloud = (x: number, y: number, k: number, c: string) => {
    const at = (
      a: number,
      b: number,
      w: number,
      h: number,
      r: string,
    ) => {
      back.push({
        kind: "cloud",
        style: `left:calc(${x}% + ${f(a * k)}cqmin);top:calc(${y}% + ${f(b * k)}cqmin);width:${f(w * k)}cqmin;height:${f(h * k)}cqmin;border-radius:${r};background:${c}`,
      });
    };
    at(0, 7.7, 32, 6.3, "999px");
    at(3.8, 4.5, 9.6, 9.6, "50%");
    at(10.9, 0.5, 13.4, 13.4, "50%");
    at(20.5, 5.6, 8.3, 8.3, "50%");
  };

  const cloudColor =
    cond === "rain"
      ? rgb(mix(sky, night ? [60, 72, 90] : [70, 80, 92], night ? 0.6 : 0.45))
      : night
        ? rgb(mix(sky, [100, 115, 138], 0.45))
        : rgb(mix(sky, [255, 255, 255], cond === "clear" ? 0.7 : 0.6));

  if (cond === "clear") {
    if (wLight === "morning") {
      disc(16, 14, 15, "#FFE9AE", "rgba(255,233,174,0.35)");
      cloud(56, 34, 0.55, cloudColor);
    }
    if (wLight === "afternoon") {
      disc(68, 10, 14, "#FFF3D2", "rgba(255,243,210,0.35)");
      cloud(10, 30, 0.6, cloudColor);
    }
    if (wLight === "golden") {
      back.push({
        kind: "band",
        style: `left:0;right:0;bottom:${f(groundH * 0.55)}%;height:26%;background:#EDB077;opacity:0.55`,
      });
      disc(56, 52, 20, "#FFD27F", "rgba(255,210,127,0.35)");
    }
    if (night) {
      for (let i = 0; i < Math.round(26 * density); i += 1) {
        back.push({
          kind: "star",
          style: `left:${f(rnd() * 100)}%;top:${f(rnd() * 55)}%;width:max(1.5px,0.55cqmin);aspect-ratio:1;border-radius:50%;background:rgba(255,236,200,${f(0.5 + rnd() * 0.4)})`,
        });
      }
      back.push({
        kind: "moon",
        style:
          "left:72%;top:12%;width:13cqmin;aspect-ratio:1;border-radius:50%;box-shadow:inset 3.4cqmin -1.6cqmin 0 0 #F2E8CC",
      });
    }
  }
  if (cond === "cloudy") {
    cloud(5, 8, 1, cloudColor);
    cloud(44, 3, 1.3, cloudColor);
    cloud(64, 32, 0.85, cloudColor);
  }
  if (cond === "rain") {
    cloud(3, 3, 1.2, cloudColor);
    cloud(46, 2, 1.35, cloudColor);
  }
  if (cond === "snow") {
    cloud(8, 5, 1, cloudColor);
    cloud(56, 12, 0.9, cloudColor);
  }

  if (night || wLight === "golden") {
    [9.5, 24, 40, 57.5, 73, 89].forEach((x) => {
      front.push({
        kind: "litWindow",
        style: `left:${x}%;bottom:${f(groundH * (0.18 + rnd() * 0.25))}%;width:1.3cqmin;height:1.8cqmin;background:#F3B866;opacity:0.9`,
      });
    });
  }
  if (cond === "rain") {
    const c = night
      ? "rgba(175,195,220,0.55)"
      : wLight === "golden"
        ? "rgba(255,228,200,0.7)"
        : "rgba(255,255,255,0.7)";
    for (let i = 0; i < Math.round(38 * density); i += 1) {
      front.push({
        kind: "rain",
        style: `left:${f(rnd() * 100)}%;top:${f(rnd() * 88 - 6)}%;width:max(1px,0.45cqmin);height:${f(6 + rnd() * 5)}cqmin;border-radius:1px;background:${c};transform:rotate(14deg)`,
      });
    }
  }
  if (cond === "snow") {
    for (let i = 0; i < Math.round(48 * density); i += 1) {
      front.push({
        kind: "snow",
        style: `left:${f(rnd() * 100)}%;top:${f(rnd() * 96)}%;width:max(2px,${f(0.9 + rnd() * 1.4)}cqmin);aspect-ratio:1;border-radius:50%;background:#FFFFFF;box-shadow:0 0 0 0.5px rgba(70,85,105,${night ? 0 : 0.3})`,
      });
    }
  }

  return {
    sky: rgb(sky),
    ground: rgb(ground),
    roof: ROOF,
    snowCap: cond === "snow",
    groundH: `${groundH}%`,
    back,
    front,
  };
}

export function captionFor(light: Light, cond: Condition): string {
  const wLight = toWindowLight(light);
  if (cond === "clear") {
    return (
      {
        morning: "Clear morning",
        afternoon: "Sunny",
        golden: "Sunset",
        night: "Clear night",
      } as const
    )[wLight];
  }
  return (
    {
      cloudy: "Overcast",
      rain: "Raining",
      snow: "Snowing",
    } as const
  )[cond];
}
