"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Settings, SlidersHorizontal } from "lucide-react";
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
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
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
            <Menu.Separator className="h-px bg-border-default" />
            <Section>
              <Menu.Item className={itemClass} onClick={() => router.push(routes.settings)}>
                <Settings />
                Settings
              </Menu.Item>
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className={cn(itemClass, "data-popup-open:bg-transparent-hover")}>
                  <SlidersHorizontal />
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
                      <Menu.Separator className="-mx-1.5 my-1.5 h-px bg-border-default" />
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
                      <Menu.Separator className="-mx-1.5 my-1.5 h-px bg-border-default" />
                      <Menu.Item className={cn(itemClass, "text-fg-secondary")} onClick={() => router.push(`${routes.settings}#preferences`)}>
                        <span className="size-4" />
                        All preferences…
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            </Section>
            <Menu.Separator className="h-px bg-border-default" />
            <Section>
              <Menu.Item className={itemClass} onClick={toggleSidebar}>
                <SidebarToggleIcon open={sidebarOpen} />
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                <Hint>⌘B</Hint>
              </Menu.Item>
            </Section>
            <Menu.Separator className="h-px bg-border-default" />
            <Section>
              <Menu.Item className={itemClass} render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}>
                <GitHubMark />
                GitHub
                <Hint>↗</Hint>
              </Menu.Item>
            </Section>
            <Menu.Separator className="h-px bg-border-default" />
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
