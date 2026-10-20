"use client";

import { AccountSettingsDialog } from "@/components/account/AccountSettingsDialog";
import { AccountIcon } from "@/components/icons/LonghandIcons";
import { signOutToSignIn } from "@/app/actions/auth-links";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type AccountMenuProps = {
  visible: boolean;
  domain: string;
  displayName: string;
  handle: string;
  email: string;
  cityName: string | null;
  googleLinked: boolean;
  googleEnabled: boolean;
  writerPageHref: string;
  /** Extra control rendered immediately left of the account icon (Public/Private). */
  leading?: React.ReactNode;
};

export function AccountMenu({
  visible,
  domain,
  displayName,
  handle,
  email,
  cityName,
  googleLinked,
  googleEnabled,
  writerPageHref,
  leading,
}: AccountMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]!.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]!.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]!.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]!.focus();
    }
  };

  return (
    <>
      <div
        className="account-chrome"
        style={{
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
        aria-hidden={!visible}
      >
        {leading}
        <div ref={rootRef} className="account-menu-root">
          <button
            ref={triggerRef}
            type="button"
            className="account-icon icon-btn"
            aria-label="Account"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            tabIndex={visible ? 0 : -1}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <AccountIcon />
          </button>

          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Account"
              className="account-menu-popover popover-surface"
              onKeyDown={onMenuKeyDown}
            >
              <div className="px-3 pb-3 pt-3">
                <p className="font-writing text-[18px] leading-tight text-ink">
                  {displayName}
                </p>
                <p className="mt-0.5 font-ui text-[12px] text-label">{email}</p>
              </div>
              <div className="mx-3 border-t border-[#EEEAE3]" />
              <div className="py-1">
                <a
                  role="menuitem"
                  href={writerPageHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="account-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="block font-ui text-[13px] text-ink">
                    Your page
                  </span>
                  <span className="mt-0.5 block font-ui text-[11.5px] text-label">
                    {handle}.{domain}
                  </span>
                </a>
                <button
                  type="button"
                  role="menuitem"
                  className="account-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <span className="block font-ui text-[13px] text-ink">
                    Settings
                  </span>
                </button>
              </div>
              <div className="mx-3 border-t border-[#EEEAE3]" />
              <div className="py-1">
                <form action={signOutToSignIn}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="account-menu-item w-full"
                  >
                    <span className="block font-ui text-[13px] text-ink">
                      Sign out
                    </span>
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AccountSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        domain={domain}
        displayName={displayName}
        handle={handle}
        email={email}
        cityName={cityName}
        googleLinked={googleLinked}
        googleEnabled={googleEnabled}
      />
    </>
  );
}
