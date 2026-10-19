"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, UserPlus } from "lucide-react";
import { PreferencesIcon } from "@/components/icons/preferences-icon";
import { SettingsGearIcon } from "@/components/icons/settings-gear-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { LogoutIcon } from "@/components/icons/logout-icon";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import { Menu } from "@base-ui/react/menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";

/*
 * Account menu, laid out like Pond's: sections split by full-width
 * hairlines, 32px rows with a muted 16px icon, and a right-aligned hint
 * (shortcut, ↗ or ›) where one applies. As wide as its trigger. Only
 * actions that work today; preferences live in this browser.
 */

const REPO_URL = "https://github.com/Oladejiraji/mindmap";

const itemClass =
  "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-body-sm whitespace-nowrap text-fg-primary outline-none transition-colors select-none data-highlighted:bg-transparent-hover [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-fg-tertiary";

function Hint({ children }: { children: ReactNode }) {
  return <span className="ml-auto pl-4 text-caption-lg text-fg-tertiary">{children}</span>;
}

function Section({ children }: { children: ReactNode }) {
  return <div className="p-1.5">{children}</div>;
}

function GitHubMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 1.95068C17.525 1.95068 22 6.42568 22 11.9507C21.9995 14.0459 21.3419 16.0883 20.1198 17.7902C18.8977 19.4922 17.1727 20.768 15.1875 21.4382C14.6875 21.5382 14.5 21.2257 14.5 20.9632C14.5 20.6257 14.5125 19.5507 14.5125 18.2132C14.5125 17.2757 14.2 16.6757 13.8375 16.3632C16.0625 16.1132 18.4 15.2632 18.4 11.4257C18.4 10.3257 18.0125 9.43818 17.375 8.73818C17.475 8.48818 17.825 7.46318 17.275 6.08818C17.275 6.08818 16.4375 5.81318 14.525 7.11318C13.725 6.88818 12.875 6.77568 12.025 6.77568C11.175 6.77568 10.325 6.88818 9.525 7.11318C7.6125 5.82568 6.775 6.08818 6.775 6.08818C6.225 7.46318 6.575 8.48818 6.675 8.73818C6.0375 9.43818 5.65 10.3382 5.65 11.4257C5.65 15.2507 7.975 16.1132 10.2 16.3632C9.9125 16.6132 9.65 17.0507 9.5625 17.7007C8.9875 17.9632 7.55 18.3882 6.65 16.8757C6.4625 16.5757 5.9 15.8382 5.1125 15.8507C4.275 15.8632 4.775 16.3257 5.125 16.5132C5.55 16.7507 6.0375 17.6382 6.15 17.9257C6.35 18.4882 7 19.5632 9.5125 19.1007C9.5125 19.9382 9.525 20.7257 9.525 20.9632C9.525 21.2257 9.3375 21.5257 8.8375 21.4382C6.8458 20.7752 5.11342 19.502 3.88611 17.799C2.65881 16.096 1.9989 14.0498 2 11.9507C2 6.42568 6.475 1.95068 12 1.95068Z" />
    </svg>
  );
}

export function ProfileMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { open: sidebarOpen, toggleSidebar } = useSidebar();
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
      <Menu.Trigger className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-1 outline-none transition-colors hover:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover">
        <UserAvatar size={24} />
        <span className="flex-1 truncate text-left text-body-sm font-medium text-fg-primary group-data-[collapsible=icon]:hidden">
          {name}
        </span>
        <ChevronDownIcon className="size-4 text-fg-tertiary group-data-[collapsible=icon]:hidden" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" side="top" className="z-50">
          <Menu.Popup className="w-(--anchor-width) origin-(--transform-origin) rounded-xl bg-surface-modal shadow-large outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
              <UserAvatar size={32} />
              <span className="min-w-0">
                <span className="block truncate text-body-sm font-medium text-fg-primary">{name}</span>
                <span className="block truncate text-caption-lg text-fg-tertiary">{email}</span>
              </span>
            </div>
            <Menu.Separator className="h-px bg-border-default/50" />
            <Section>
              {/* Needs a sharing model in the backend (members, invites,
                  access checks); shown so the place is set, disabled. */}
              <Menu.Item disabled className={cn(itemClass, "cursor-default data-disabled:text-fg-disabled data-disabled:[&>svg:first-child]:text-fg-disabled")}>
                <UserPlus />
                Invite people
                <span className="ml-auto rounded-full bg-component px-1.5 text-caption-base text-fg-tertiary">Soon</span>
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
                    <Menu.Popup className="w-56 rounded-xl bg-surface-modal p-1.5 shadow-large outline-none">
                      <Menu.CheckboxItem className={itemClass} checked={hints} onCheckedChange={setHints}>
                        <span className="flex size-4 items-center justify-center">
                          <Menu.CheckboxItemIndicator>
                            <Check className="size-3.5 text-fg-primary" />
                          </Menu.CheckboxItemIndicator>
                        </span>
                        Canvas shortcut hints
                      </Menu.CheckboxItem>
                      <Menu.Separator className="-mx-1.5 my-1.5 h-px bg-border-default/50" />
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
                      <Menu.Separator className="-mx-1.5 my-1.5 h-px bg-border-default/50" />
                      <Menu.Item className={cn(itemClass, "text-fg-secondary")} onClick={() => router.push(`${routes.settings}#preferences`)}>
                        <span className="size-4" />
                        All preferences…
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            </Section>
            <Menu.Separator className="h-px bg-border-default/50" />
            <Section>
              <Menu.Item className={itemClass} onClick={toggleSidebar}>
                <SidebarToggleIcon open={sidebarOpen} />
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                <Hint>⌘B</Hint>
              </Menu.Item>
            </Section>
            <Menu.Separator className="h-px bg-border-default/50" />
            <Section>
              <Menu.Item className={itemClass} render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}>
                <GitHubMark />
                GitHub
                <Hint>↗</Hint>
              </Menu.Item>
            </Section>
            <Menu.Separator className="h-px bg-border-default/50" />
            <Section>
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
