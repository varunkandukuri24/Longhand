/** One breakpoint: phones are under 768 px (DESIGN.md). */
export const PHONE_LAYOUT_QUERY = "(max-width: 767px)";

/** Rooftops as a share of the top-strip window height. */
export const PHONE_WINDOW_GROUND_H = 24;

export const PHONE_WINDOW_TOP_PX = 60;
export const PHONE_WINDOW_HEIGHT_PX = 84;
export const PHONE_WINDOW_GAP_PX = 20;
/** Text column top on phones: 60 + 84 + 20. */
export const PHONE_PAGE_TOP_OFFSET_PX =
  PHONE_WINDOW_TOP_PX + PHONE_WINDOW_HEIGHT_PX + PHONE_WINDOW_GAP_PX;

export const PHONE_TYPING_WINDOW_TOP_PX = 16;
export const PHONE_TYPING_WINDOW_HEIGHT_PX = 56;
export const PHONE_TYPING_WINDOW_GAP_PX = 16;
export const PHONE_TYPING_PAGE_TOP_OFFSET_PX =
  PHONE_TYPING_WINDOW_TOP_PX +
  PHONE_TYPING_WINDOW_HEIGHT_PX +
  PHONE_TYPING_WINDOW_GAP_PX;
