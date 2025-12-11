import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export function LanguageSwitcher({ variant = 'full', onLanguageChange }) {
    const { i18n, t } = useTranslation();

    const handleLanguageChange = (languageCode) => {
        i18n.changeLanguage(languageCode);
        if (onLanguageChange) {
            onLanguageChange(languageCode);
        }
    };

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    // Icon variant - compact for header
    if (variant === 'icon') {
        return (
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-auto gap-2 border-0 bg-transparent hover:bg-accent">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLanguage.flag}</span>
                </SelectTrigger>
                <SelectContent>
                    {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.nativeName}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    // Full variant - clickable list for dialogs
    return (
        <div className="space-y-2">
            {languages.map((lang) => (
                <div
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                        "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all",
                        i18n.language === lang.code
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                            <div className="font-medium">{lang.nativeName}</div>
                            <div className="text-sm text-muted-foreground">{lang.name}</div>
                        </div>
                    </div>
                    {i18n.language === lang.code && (
                        <Check className="h-5 w-5 text-primary" />
                    )}
                </div>
            ))}
        </div>
    );
}

