/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_llm from "../lib/llm.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_validation from "../lib/validation.js";
import type * as messages from "../messages.js";
import type * as nodes from "../nodes.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  "lib/context": typeof lib_context;
  "lib/llm": typeof lib_llm;
  "lib/models": typeof lib_models;
  "lib/validation": typeof lib_validation;
  messages: typeof messages;
  nodes: typeof nodes;
  threads: typeof threads;
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

export declare const components: {};
