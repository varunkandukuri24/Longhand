export type EventType = "insert" | "delete" | "paste";

export type CharOrigin = "typed" | "pasted" | "quoted";

/** One edit in the event log. `t` is ms since session start. */
export type EditEvent = {
  t: number;
  type: EventType;
  pos: number;
  len: number;
  text: string;
};
