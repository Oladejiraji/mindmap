"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { LogoutIcon } from "@/components/icons/logout-icon";
import { Menu } from "@base-ui/react/menu";
import { GradientAvatar } from "@outpacelabs/avatars";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { showError } from "@/lib/toast";

export function ProfileMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

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
        <span className="relative flex size-6 shrink-0 overflow-hidden rounded-full outline-[0.5px] outline-offset-[-0.5px] outline-border-default">
          <GradientAvatar seed={email || name} size={24} />
        </span>
        <span className="flex-1 truncate text-left text-body-sm font-medium text-fg-primary group-data-[collapsible=icon]:hidden">
          {name}
        </span>
        <ChevronDownIcon className="size-4 text-fg-tertiary group-data-[collapsible=icon]:hidden" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          sideOffset={6}
          align="start"
          side="top"
          className="z-50"
        >
          <Menu.Popup className="min-w-48 rounded-lg bg-surface-modal p-1 font-diatype text-body-sm text-foreground-subtle shadow-large outline-none">
            <div className="px-2 py-1.5">
              <p className="text-caption-lg text-fg-tertiary">Signed in as</p>
              <p className="truncate text-caption-lg text-fg-primary">{email}</p>
            </div>
            <Menu.Separator className="-mx-1 my-1 h-px bg-border-default" />
            <Menu.Item
              className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 outline-none transition-colors select-none hover:bg-transparent-hover data-highlighted:bg-transparent-hover"
              onClick={() => void handleSignOut()}
            >
              <LogoutIcon className="size-3.5" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
