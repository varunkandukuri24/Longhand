import { createPiece } from "@/app/actions/pieces";
import { PlusIcon } from "@/components/icons/LonghandIcons";

export function NewPieceActions() {
  return (
    <form action={createPiece}>
      <button
        type="submit"
        className="icon-btn"
        aria-label="New page"
        data-tooltip="New page"
      >
        <PlusIcon />
      </button>
    </form>
  );
}
