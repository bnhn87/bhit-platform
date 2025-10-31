import { ReactNode } from "react";

import { theme } from "../lib/theme";

import NavBar from "./NavBar";

export default function Layout({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily:
          "var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji')",
      }}
    >
      {withNav && <NavBar />}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>{children}</div>
    </div>
  );
}
