"use client";

import { createContext, use, type ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/api";

/*
 * The viewer and their org, fetched once by the project layout on the
 * server. The New project page shows it on first paint, until its live
 * query arrives; the page fetches nothing itself, so opening it is quick.
 */

type OrgData = FunctionReturnType<typeof api.organizations.current>;

const InitialOrg = createContext<OrgData | undefined>(undefined);

export function InitialOrgProvider({ value, children }: { value: OrgData | undefined; children: ReactNode }) {
  return <InitialOrg value={value}>{children}</InitialOrg>;
}

/** The layout's copy: undefined if it couldn't be fetched. */
export function useInitialOrg() {
  return use(InitialOrg);
}
