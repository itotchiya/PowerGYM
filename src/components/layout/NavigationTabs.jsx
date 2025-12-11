import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    AlertCircle,
    Trash2,
    CreditCard,
    Clock,
    Building2,
    Inbox,
    Settings
} from 'lucide-react';

export function NavigationTabs() {
    const location = useLocation();
    const { isSuperAdmin, isOwner } = useAuth();
    const { t } = useTranslation();

    const gymNavigation = [
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.members'), href: '/members', icon: Users },
        { name: t('nav.expiringSoon'), href: '/expiring-soon', icon: Clock },
        { name: t('nav.warnings'), href: '/warnings', icon: AlertCircle, ownerOnly: true },
        { name: t('nav.deleted'), href: '/deleted', icon: Trash2, ownerOnly: true },
        { name: t('nav.plans'), href: '/plans', icon: CreditCard, ownerOnly: true },
    ];

    const superAdminNavigation = [
        { name: t('nav.dashboard'), href: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: t('superadmin.gyms'), href: '/superadmin/gyms', icon: Building2 },
        { name: t('superadmin.requests'), href: '/superadmin/requests', icon: Inbox },
        { name: t('nav.settings'), href: '/superadmin/settings', icon: Settings },
    ];

    const navItems = isSuperAdmin() ? superAdminNavigation : gymNavigation;

    // Filter out owner-only items if user is not an owner
    const filteredNavItems = navItems.filter(item => {
        if (item.ownerOnly && !isOwner()) {
            return false;
        }
        return true;
    });

    return (
        <div className="border-b bg-background">
            <nav className="flex overflow-x-auto scrollbar-hide">
                <div className="flex min-w-max px-4">
                    {filteredNavItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                    isActive
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

