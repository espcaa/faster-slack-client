import { UserProfile } from "../../bindings/fastslack/shared";

export const GetAvatarUrl = (profile: UserProfile, workspaceID: string, size: number = 48) => {
  const hash = profile.profile.avatar_hash;
  const userId = profile.id;

  return `https://ca.slack-edge.com/${workspaceID}-${userId}-${hash}-${size}`;
};
