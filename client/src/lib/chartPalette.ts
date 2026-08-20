import { useEffect, useState } from "react";

/**
 * Palette de graphes R0.
 *
 * Les teintes sont celles de `--ro-chart-*` : menthe, encre, jaune, encre
 * clair, menthe foncé, rouge. Elles changent de registre parce qu'une part
 * encre #101B33 est invisible sur une carte encre — et Recharts pose ses
 * couleurs en attributs SVG, où `var(--ro-chart-1)` ne serait pas résolu :
 * il faut donc les fournir en dur, résolues côté JS.
 *
 * Le registre est porté par la classe `dark` sur <html> (voir ThemeToggle),
 * pas par un provider : on l'observe directement.
 */
const LIGHT = ["#17B3A6", "#101B33", "#FFE500", "#9DA9C4", "#07423C", "#E5484D"];
const DARK = ["#17B3A6", "#F6F8F7", "#FFE500", "#9DA9C4", "#8CDBD1", "#E85A60"];

function readIsDark() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function useChartPalette() {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    setIsDark(readIsDark());
    return () => observer.disconnect();
  }, []);

  return {
    colors: isDark ? DARK : LIGHT,
    /** Couleur des libellés posés sur le graphe (jamais la couleur de la part). */
    label: isDark ? "#F6F8F7" : "#101B33",
    /** Couleur des axes et de la grille. */
    axis: isDark ? "#9DA9C4" : "#605F6B",
    grid: isDark ? "#24304F" : "#E4E4E7",
  };
}
