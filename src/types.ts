/** A rendered piece of the card. Coordinates in `body` are relative to (0,0). */
export interface Section {
  /** Optional section heading rendered above the body. */
  title?: string;
  /** Height reserved for `body` (px). The renderer stacks sections vertically. */
  height: number;
  /** SVG markup, positioned relative to the section's own top-left origin. */
  body: string;
}

export type GraphqlFn = <T = any>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>;

/** GET a REST endpoint (path relative to https://api.github.com). */
export type RestGetFn = <T = any>(path: string) => Promise<T>;

export interface PluginContext {
  user: string;
  token: string;
  graphql: GraphqlFn;
  rest: RestGetFn;
}

/**
 * A plugin fetches its own data and returns one Section.
 * Throwing is fine — the runner isolates failures per plugin.
 */
export interface Plugin {
  name: string;
  run: (ctx: PluginContext) => Promise<Section>;
}
