import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from '@/locales/en/translation.json';
import frTranslation from '@/locales/fr/translation.json';
import arTranslation from '@/locales/ar/translation.json';

const resources = {
    en: { translation: enTranslation },
    fr: { translation: frTranslation },
    ar: { translation: arTranslation }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false // React already escapes values
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'powergym-language'
        }
    });

// Function to update document direction for RTL languages
export const updateDocumentDirection = (language) => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
};

// Listen for language changes
i18n.on('languageChanged', (lng) => {
    updateDocumentDirection(lng);
});

// Set initial direction
updateDocumentDirection(i18n.language);

export default i18n;
