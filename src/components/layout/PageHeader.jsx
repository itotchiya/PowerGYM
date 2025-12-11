import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PageHeader({
    title,
    subtitle,
    backTo = '/dashboard',
    backLabel,
    showBack = true,
    showClose = false,
    onClose,
    children
}) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleBack = () => {
        navigate(backTo);
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(backTo);
        }
    };

    return (
        <div className="mb-6">
            {/* Back Button */}
            {showBack && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2 rtl:rotate-180" />
                    {backLabel || t('common.backToDashboard')}
                </Button>
            )}

            {/* Title Row with optional close button */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-sm md:text-base text-muted-foreground mt-1">{subtitle}</p>
                    )}
                </div>

                {/* Close Action (soft red) */}
                {showClose && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    >
                        <X className="h-5 w-5 mr-1" />
                        <span className="hidden sm:inline">{t('common.close')}</span>
                    </Button>
                )}

                {/* Additional Actions */}
                {children && (
                    <div className="flex items-center gap-2 shrink-0">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
