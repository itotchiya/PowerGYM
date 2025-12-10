import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeSwitch() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
        >
            {isDark ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </Button>
    );
}
