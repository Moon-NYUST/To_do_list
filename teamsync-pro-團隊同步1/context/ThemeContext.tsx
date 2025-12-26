import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    primaryColor: string;
    setTheme: (theme: Theme) => void;
    setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorScales: Record<string, Record<string, string>> = {
    indigo: {
        50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
        500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
    },
    rose: {
        50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
        500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337'
    },
    blue: {
        50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
        500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
    },
    emerald: {
        50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
        500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
    },
    amber: {
        50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
        500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f'
    }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(
        (localStorage.getItem('theme') as Theme) || 'light'
    );
    const [primaryColor, setPrimaryColorState] = useState(
        localStorage.getItem('primaryColor') || 'indigo'
    );

    useEffect(() => {
        // Apply dark mode class
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Apply primary color variables
        const scale = colorScales[primaryColor] || colorScales.indigo;
        const root = window.document.documentElement;
        Object.entries(scale).forEach(([shade, value]) => {
            root.style.setProperty(`--primary-${shade}`, value);
        });
        localStorage.setItem('primaryColor', primaryColor);
    }, [primaryColor]);

    const setTheme = (t: Theme) => setThemeState(t);
    const setPrimaryColor = (c: string) => setPrimaryColorState(c);

    return (
        <ThemeContext.Provider value={{ theme, primaryColor, setTheme, setPrimaryColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
