import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;
type PrefetchKind = NonNullable<Parameters<Router["prefetch"]>[1]>["kind"];

/**
 * Prefetches a whole page, its data included, like `<Link prefetch>`.
 * The default stops at the page's loading.tsx, so its skeleton would show
 * on the way in. Unlike Link prefetching, this runs in dev too.
 */
export function prefetchPage(router: Router, href: string) {
  // The kind is an internal enum; "full" is its value for a whole page.
  router.prefetch(href, { kind: "full" as PrefetchKind });
}
