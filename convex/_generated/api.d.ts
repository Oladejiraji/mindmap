/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_blocks from "../lib/blocks.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_demoSeed from "../lib/demoSeed.js";
import type * as lib_document from "../lib/document.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_llm from "../lib/llm.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_nodeContent from "../lib/nodeContent.js";
import type * as lib_proposals from "../lib/proposals.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_replying from "../lib/replying.js";
import type * as lib_tabs from "../lib/tabs.js";
import type * as lib_tools from "../lib/tools.js";
import type * as lib_validation from "../lib/validation.js";
import type * as memberships from "../memberships.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as nodes from "../nodes.js";
import type * as organizations from "../organizations.js";
import type * as proposals from "../proposals.js";
import type * as seed from "../seed.js";
import type * as tabs from "../tabs.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chat: typeof chat;
  http: typeof http;
  invitations: typeof invitations;
  "lib/auth": typeof lib_auth;
  "lib/blocks": typeof lib_blocks;
  "lib/context": typeof lib_context;
  "lib/demoSeed": typeof lib_demoSeed;
  "lib/document": typeof lib_document;
  "lib/functions": typeof lib_functions;
  "lib/llm": typeof lib_llm;
  "lib/models": typeof lib_models;
  "lib/nodeContent": typeof lib_nodeContent;
  "lib/proposals": typeof lib_proposals;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/replying": typeof lib_replying;
  "lib/tabs": typeof lib_tabs;
  "lib/tools": typeof lib_tools;
  "lib/validation": typeof lib_validation;
  memberships: typeof memberships;
  messages: typeof messages;
  migrations: typeof migrations;
  nodes: typeof nodes;
  organizations: typeof organizations;
  proposals: typeof proposals;
  seed: typeof seed;
  tabs: typeof tabs;
  threads: typeof threads;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
