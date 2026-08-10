export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SUB_ADMIN: "sub_admin",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export const ADMIN_ROLES = new Set<string>([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUB_ADMIN]);

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role);
}
