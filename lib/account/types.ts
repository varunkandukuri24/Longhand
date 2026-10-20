import type { WritingFont, WritingSize } from "@/lib/editor/type-prefs";
import type { WindowSide } from "@/lib/scene";

export type OwnerAccount = {
  displayName: string;
  handle: string;
  email: string;
  cityName: string | null;
  windowSide: WindowSide;
  font: WritingFont;
  fontSize: WritingSize;
  googleLinked: boolean;
  googleEnabled: boolean;
  domain: string;
  writerPageHref: string;
};
