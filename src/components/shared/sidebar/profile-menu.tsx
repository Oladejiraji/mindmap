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
      <Menu.Trigger className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-foreground/6 focus-visible:outline-none">
        <GradientAvatar seed={email || name} size={24} />
        <span className="truncate text-left text-13 font-medium text-foreground group-data-[collapsible=icon]:hidden">
          {name}
        </span>
        <ChevronDownIcon className="size-4 text-foreground/40 group-data-[collapsible=icon]:hidden" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          sideOffset={6}
          align="start"
          side="bottom"
          className="z-50"
        >
          <Menu.Popup className="min-w-37 rounded-lg border border-foreground/8 bg-background p-1 shadow-lg outline-none">
            <div className="px-2 py-1.5">
              <p className="text-xs text-foreground/50">Signed in as</p>
              <p className="truncate text-xs  text-foreground">{email}</p>
            </div>
            <Menu.Separator className="my-1 h-px bg-foreground/8" />
            <Menu.Item
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground"
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
