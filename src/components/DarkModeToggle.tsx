import { useTheme } from '@/modules/theme/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function DarkModeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2.5 rounded-full hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
    </button>
  );
}
