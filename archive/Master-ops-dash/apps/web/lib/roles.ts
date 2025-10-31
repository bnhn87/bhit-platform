export type Role = "installer" | "supervisor" | "ops" | "director";
export const NAV_BY_ROLE: Record<Role, { label: string; href: string }[]> = {
  installer: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Today", href: "/today" },
    { label: "Jobs", href: "/jobs" }
  ],
  supervisor: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Today", href: "/today" },
    { label: "Jobs", href: "/jobs" },
    { label: "Close Day", href: "/close-day" }
  ],
  ops: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Today", href: "/today" },
    { label: "Jobs", href: "/jobs" },
    { label: "Close Day", href: "/close-day" },
    { label: "Clients", href: "/clients" },
    { label: "Settings", href: "/settings" }
  ],
  director: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Today", href: "/today" },
    { label: "Jobs", href: "/jobs" },
    { label: "Close Day", href: "/close-day" },
    { label: "Clients", href: "/clients" },
    { label: "Settings", href: "/settings" }
  ],
};
export const DEFAULT_ROLE: Role = "installer";
