import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/motion-switch';

export function ThemeSwitch() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Switch
            size="lg"
            checked={isDark}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
            className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input"
        />
    );
}
