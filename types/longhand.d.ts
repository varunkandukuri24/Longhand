import type { EditEvent } from "@/lib/receipt/types";

declare global {
  interface Window {
    __longhandEvents?: EditEvent[];
  }
}

export {};
