import type { WritingFont, WritingSize } from "@/lib/editor/type-prefs";

export type OwnerAccount = {
  displayName: string;
  handle: string;
  email: string;
  cityName: string | null;
  font: WritingFont;
  fontSize: WritingSize;
  googleLinked: boolean;
  googleEnabled: boolean;
  domain: string;
  writerPageHref: string;
};
