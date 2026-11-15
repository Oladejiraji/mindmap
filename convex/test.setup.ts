/// <reference types="vite/client" />

// Every Convex module, for convexTest(schema, modules). The extra dot in this
// file's name keeps Convex from deploying it.
export const modules = import.meta.glob("./**/*.*s");
