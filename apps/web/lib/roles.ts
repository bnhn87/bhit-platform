export type UserRole = "installer" | "supervisor" | "ops" | "director" | "admin" | "guest" | "manager" | "general_manager";

export const canEdit = (role?: string): boolean => {
  return role === "director" || role === "ops" || role === "admin" || role === "general_manager";
};

// Labour calendar specific edit permission (Director only)
export function canEditLabour(role?: string): boolean {
  return role === 'director';
}

export const canViewFinancials = (role?: string): boolean => {
  return role === "director" || role === "ops";
};

export const canViewEditHistory = (role?: string): boolean => {
  return role === "director" || role === "ops" || role === "admin";
};