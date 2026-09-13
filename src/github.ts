import type { GraphqlFn, RestGetFn } from "./types";

/** Creates a minimal GitHub GraphQL client backed by the global fetch. */
export function makeGraphql(token: string): GraphqlFn {
  return async function graphql(query, variables = {}) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "profile-metrics",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    const json: any = await res.json();
    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  };
}

/** Creates a minimal GitHub REST GET client backed by the global fetch. */
export function makeRest(token: string): RestGetFn {
  return async function rest(path) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "profile-metrics",
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub REST ${res.status}: ${await res.text()}`);
    }
    return res.json();
  };
}
