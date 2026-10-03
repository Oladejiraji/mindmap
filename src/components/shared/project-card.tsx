import Link from "next/link";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { CanvasIcon } from "@/components/icons/canvas-icon";

export function ProjectCard({
  name,
  threadId,
  createdAt,
}: {
  name: string;
  threadId: string;
  createdAt: number;
}) {
  return (
    <Link
      href={routes.thread(threadId)}
      className="group relative rounded-lg p-2"
    >
      <div className="absolute inset-0 rounded-lg bg-foreground/8 scale-[0.97] opacity-0 transition-all duration-200 ease-out group-hover:scale-100 group-hover:opacity-100" />
      <div className="relative flex aspect-4/3 items-center justify-center rounded-md bg-background-5">
        <CanvasIcon className="size-8 text-foreground/20" />
      </div>
      <div className="px-0.5 pt-2.5">
        <p className="truncate text-11 font-medium text-foreground">{name}</p>
        <p className="text-11 text-foreground/40">
          {formatRelativeTime(createdAt)}
        </p>
      </div>
    </Link>
  );
}
