import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

function readTheme(): { theme: Theme; storageAvailable: boolean } {
  try {
    const saved = localStorage.getItem("h2otype.theme");
    return {
      theme: saved === "light" || saved === "dark" ? saved : "system",
      storageAvailable: true,
    };
  } catch {
    return { theme: "system", storageAvailable: false };
  }
}

export function useTheme() {
  const [{ theme, storageAvailable }, setState] = useState(readTheme);

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
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  function setTheme(next: Theme) {
    let available = true;
    try {
      localStorage.setItem("h2otype.theme", next);
    } catch {
      available = false;
    }
    setState({ theme: next, storageAvailable: available });
  }

  return { theme, setTheme, storageAvailable };
}
