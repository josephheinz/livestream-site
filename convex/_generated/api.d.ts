/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bans from "../bans.js";
import type * as chat from "../chat.js";
import type * as clips from "../clips.js";
import type * as crons from "../crons.js";
import type * as emojis from "../emojis.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_bans from "../lib/bans.js";
import type * as presence from "../presence.js";
import type * as reactions from "../reactions.js";
import type * as settings from "../settings.js";
import type * as streams from "../streams.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bans: typeof bans;
  chat: typeof chat;
  clips: typeof clips;
  crons: typeof crons;
  emojis: typeof emojis;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/bans": typeof lib_bans;
  presence: typeof presence;
  reactions: typeof reactions;
  settings: typeof settings;
  streams: typeof streams;
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

export declare const components: {};
