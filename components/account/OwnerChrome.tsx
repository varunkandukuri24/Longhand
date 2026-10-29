"use client";

import { AccountMenu } from "@/components/account/AccountMenu";
import { YourPiecesPane } from "@/components/account/YourPiecesPane";
import { VisibilityControl } from "@/components/pieces/VisibilityControl";
import type { OwnerAccount } from "@/lib/account/types";
import type { PieceVisibility } from "@/lib/pieces/publish";
import type { ReactNode } from "react";

export type { OwnerAccount };

type OwnerChromeProps = {
  visible: boolean;
  inlineFade?: boolean;
  currentPieceId?: string | null;
  account: OwnerAccount;
  /** Rendered immediately left of the account icon (e.g. phone Publish). */
  leading?: ReactNode;
  /** When set, shows Public/Private immediately left of the account icon. */
  visibility?: {
    pieceId: string;
    initialVisibility: PieceVisibility;
  };
};

export function OwnerChrome({
  visible,
  inlineFade = true,
  currentPieceId,
  account,
  leading = null,
  visibility,
}: OwnerChromeProps) {
  return (
    <>
      <YourPiecesPane
        visible={visible}
        inlineFade={inlineFade}
        currentPieceId={currentPieceId}
        handle={account.handle}
        domain={account.domain}
        writerPageHref={account.writerPageHref}
      />
      <AccountMenu
        visible={visible}
        inlineFade={inlineFade}
        domain={account.domain}
        displayName={account.displayName}
        handle={account.handle}
        email={account.email}
        cityName={account.cityName}
        googleLinked={account.googleLinked}
        googleEnabled={account.googleEnabled}
        writerPageHref={account.writerPageHref}
        leading={
          <>
            {leading}
            {visibility ? (
              <VisibilityControl
                pieceId={visibility.pieceId}
                initialVisibility={visibility.initialVisibility}
              />
            ) : null}
          </>
        }
      />
    </>
  );
}
