import type { Plugin } from "../types";
import { escapeXml, fetchDataUri } from "../svg";

/** Avatar + name + follower/repo counts. */
export const headerPlugin: Plugin = {
  name: "header",
  async run(ctx) {
    const data = await ctx.graphql(
      `query($login: String!) {
        user(login: $login) {
          name
          login
          avatarUrl
          followers { totalCount }
          following { totalCount }
          repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
        }
      }`,
      { login: ctx.user },
    );

    const user = data.user;
    const sep = user.avatarUrl.includes("?") ? "&" : "?";
    const avatar = await fetchDataUri(`${user.avatarUrl}${sep}size=96`);
    const name = escapeXml(user.name ?? user.login);
    const stats =
      `${user.followers.totalCount} followers · ` +
      `${user.following.totalCount} following · ` +
      `${user.repositories.totalCount} repos`;

    return {
      height: 56,
      body: `
        <defs><clipPath id="avatar-clip"><circle cx="28" cy="28" r="28"/></clipPath></defs>
        <image href="${avatar}" x="0" y="0" width="56" height="56" clip-path="url(#avatar-clip)" />
        <text x="72" y="20" class="name" font-size="17" font-weight="600">${name}</text>
        <text x="72" y="40" class="muted">@${escapeXml(user.login)}</text>
        <text x="72" y="56" class="muted">${escapeXml(stats)}</text>`,
    };
  },
};
