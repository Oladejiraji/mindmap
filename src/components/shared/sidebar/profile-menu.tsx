"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, CirclePlus as AddAccountIcon } from "lucide-react";
import { InviteIcon } from "@/components/icons/invite-icon";
import { PreferencesIcon } from "@/components/icons/preferences-icon";
import { SettingsGearIcon } from "@/components/icons/settings-gear-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { LogoutIcon } from "@/components/icons/logout-icon";
import { Menu } from "@base-ui/react/menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { popupDivider, popupRow, popupSection, popupSurface } from "./popover-styles";

/*
 * Account menu, laid out like define.app's: the account list on top (the
 * signed-in account checked), a hairline, then actions. Shared popover
 * sizing (popover-styles.ts), as wide as its trigger. Actions that need
 * backend work (more accounts, invites) are shown disabled.
 */

const itemClass = popupRow;

function Section({ children }: { children: ReactNode }) {
  return <div className={popupSection}>{children}</div>;
}

export function ProfileMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [hints, setHints] = useCanvasHints();
  const [layout, setLayout] = useHomeLayout();

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      showError(error.message ?? "Sign out failed");
      return;
    }
    queryClient.clear();
    router.replace(routes.signIn);
  };

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="corner-squircle flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-1 outline-none transition-colors hover:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover">
        <UserAvatar size={24} />
        <span className="flex-1 truncate text-left text-body-sm font-medium text-fg-primary group-data-[collapsible=icon]:hidden">
          {name}
        </span>
        <ChevronDownIcon className="size-4 text-fg-tertiary group-data-[collapsible=icon]:hidden" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" side="top" className="z-50">
          <Menu.Popup className={cn(popupSurface, "w-(--anchor-width)")}>
            <Menu.Group className={popupSection}>
              <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-caption-lg text-fg-tertiary">Account</Menu.GroupLabel>
              {/* One session at a time today; switching needs Better Auth's
                  multi-session plugin. The signed-in account is checked. */}
              <div className="corner-squircle flex items-center gap-2.5 rounded-[14px] px-2.5 py-1.5">
                <UserAvatar size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-fg-primary">{name}</span>
                  <span className="block truncate text-caption-lg text-fg-tertiary">{email}</span>
                </span>
                <Check className="size-3.5 shrink-0 text-fg-tertiary" aria-label="Signed in" />
              </div>
            </Menu.Group>
            <Menu.Separator className={popupDivider} />
            <Section>
              <Menu.Item disabled title="Coming soon: needs multi-account sign-in" className={cn(itemClass, "cursor-default data-disabled:text-fg-disabled data-disabled:[&>svg:first-child]:text-fg-disabled")}>
                <AddAccountIcon />
                Add another account
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={() => router.push(routes.settings)}>
                <SettingsGearIcon />
                Settings
              </Menu.Item>
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className={cn(itemClass, "data-popup-open:bg-transparent-hover")}>
                  <PreferencesIcon />
                  Preferences
                  <ChevronRight className="ml-auto size-3.5 text-fg-tertiary" />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner side="right" align="start" sideOffset={8} alignOffset={-6} className="z-50">
                    <Menu.Popup className={cn(popupSurface, "w-56 p-1.5")}>
                      <Menu.CheckboxItem className={itemClass} checked={hints} onCheckedChange={setHints}>
                        <span className="flex size-4 items-center justify-center">
                          <Menu.CheckboxItemIndicator>
                            <Check className="size-3.5 text-fg-primary" />
                          </Menu.CheckboxItemIndicator>
                        </span>
                        Canvas shortcut hints
                      </Menu.CheckboxItem>
                      <Menu.Separator className={cn(popupDivider, "-mx-1.5 my-1.5")} />
                      <Menu.Group>
                      <Menu.GroupLabel className="px-2.5 pt-1 pb-1.5 text-caption-lg text-fg-tertiary">Home layout</Menu.GroupLabel>
                      <Menu.RadioGroup value={layout} onValueChange={(v) => setLayout(v as "grid" | "list")}>
                        {(["grid", "list"] as const).map((v) => (
                          <Menu.RadioItem key={v} value={v} className={itemClass}>
                            <span className="flex size-4 items-center justify-center">
                              <Menu.RadioItemIndicator>
                                <Check className="size-3.5 text-fg-primary" />
                              </Menu.RadioItemIndicator>
                            </span>
                            <span className="capitalize">{v}</span>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                      </Menu.Group>
                      <Menu.Separator className={cn(popupDivider, "-mx-1.5 my-1.5")} />
                      <Menu.Item className={cn(itemClass, "text-fg-secondary")} onClick={() => router.push(`${routes.settings}#preferences`)}>
                        <span className="size-4" />
                        All preferences…
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
              {/* Needs a sharing model in the backend (members, invites,
                  access checks); disabled until then. */}
              <Menu.Item disabled title="Coming soon: needs project sharing" className={cn(itemClass, "cursor-default data-disabled:text-fg-disabled data-disabled:[&>svg:first-child]:text-fg-disabled")}>
                <InviteIcon />
                Invite members
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={() => void handleSignOut()}>
                <LogoutIcon />
                Log out
              </Menu.Item>
            </Section>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
