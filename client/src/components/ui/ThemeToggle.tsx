import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            return !document.documentElement.classList.contains("light");
        }
        return true;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
        }
    }, [isDark]);

    return (
        <div className="theme-toggle-container">
            <input
                type="checkbox"
                name="theme-checkbox"
                id="theme-checkbox"
                checked={!isDark}
                onChange={() => setIsDark(!isDark)}
            />
            <label htmlFor="theme-checkbox" className="theme-toggle-label" />
        </div>
    );
}
