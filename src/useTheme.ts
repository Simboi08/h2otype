import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("h2otype.theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#151719" : "#f7f8fa");
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("h2otype.theme", theme);
    } catch {
      // Appearance still works for this visit if browser storage is unavailable.
    }
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme };
}
