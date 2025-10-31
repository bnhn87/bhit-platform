// apps/web/components/PinInput.tsx
import { useEffect, useRef } from "react";

import { theme } from "../lib/theme";

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export default function PinInput({ value, onChange, disabled, autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  function normalize(v: string) {
    return v.replace(/\D/g, "").slice(0, 4);
  }

  return (
    <input
      ref={ref}
      inputMode="numeric"
      maxLength={4}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(normalize(e.target.value))}
      placeholder="1234"
      aria-label="PIN"
      style={{
        padding: "12px 14px",
        width: 120,
        textAlign: "center",
        letterSpacing: 3,
        borderRadius: 10,
        border: `1px solid ${theme.colors.border}`,
        background: "#111823",
        color: theme.colors.text,
        fontWeight: 700,
        fontSize: 18,
      }}
    />
  );
}
