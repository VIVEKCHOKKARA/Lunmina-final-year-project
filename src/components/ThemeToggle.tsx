/**
 * ThemeToggle — premium animated day/night pill switch.
 *
 * Renders a pill with two icon slots (Sun | Moon). The active icon slides
 * into a glowing "thumb" that travels from one end to the other on toggle.
 * Works on any background; safe to drop in header or on the login page.
 */
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  /** Extra Tailwind classes for positioning (e.g. "ml-auto") */
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to dark mode"}
      title={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      className={`relative flex items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full ${className}`}
    >
      {/*
        Outer pill track
        Dark  → deep slate with subtle inner shadow
        Light → warm sky-tinted white with inner shadow
      */}
      <span
        className={`
          relative flex items-center gap-0 w-[72px] h-8 rounded-full p-1
          transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)]
          ${isDark
            ? "bg-slate-800 shadow-[inset_0_1px_4px_rgba(0,0,0,.6)] border border-slate-700"
            : "bg-sky-100  shadow-[inset_0_1px_4px_rgba(0,0,0,.12)] border border-sky-200"
          }
        `}
      >

        {/* ── Glowing thumb that slides left ↔ right ── */}
        <span
          aria-hidden
          className={`
            absolute top-[3px] h-[22px] w-[22px] rounded-full
            flex items-center justify-center
            transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)]
            ${isDark
              ? "left-[3px]  bg-amber-400 shadow-[0_0_10px_3px_rgba(251,191,36,.55)]"
              : "left-[47px] bg-white     shadow-[0_0_10px_3px_rgba(56,189,248,.45)]"
            }
          `}
        >
          {/* Active icon inside the thumb */}
          {isDark ? (
            /* Moon icon — crescent */
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-amber-900" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            /* Sun icon */
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-sky-500" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
            </svg>
          )}
        </span>

        {/* ── Static track icons (always visible, faded when inactive) ── */}

        {/* Left slot — Moon (active in dark mode, right-side in light) */}
        <span
          aria-hidden
          className={`
            relative z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full
            transition-opacity duration-300
            ${isDark ? "opacity-0" : "opacity-50"}
          `}
        >
          <svg viewBox="0 0 24 24" className={`w-3 h-3 ${isDark ? "fill-amber-300" : "fill-slate-400"}`} aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>

        {/* Right slot — Sun (active in light mode, left-side in dark) */}
        <span
          aria-hidden
          className={`
            relative z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full
            ml-auto transition-opacity duration-300
            ${isDark ? "opacity-50" : "opacity-0"}
          `}
        >
          <svg viewBox="0 0 24 24" className={`w-3 h-3 ${isDark ? "fill-slate-400" : "fill-sky-400"}`} aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </span>
      </span>

      {/* Label text next to the pill */}
      <span
        className={`
          ml-2.5 text-[11px] font-semibold uppercase tracking-widest
          transition-colors duration-300 hidden sm:block
          ${isDark ? "text-amber-400" : "text-sky-500"}
        `}
      >
        {isDark ? "Night" : "Day"}
      </span>
    </button>
  );
}
