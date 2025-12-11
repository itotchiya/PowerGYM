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
    Building2,
    Clock,
    Dumbbell,
    Settings,
    Inbox
} from 'lucide-react';

export function Sidebar() {
    const location = useLocation();
    const { isSuperAdmin, isOwner } = useAuth();
    const { t } = useTranslation();

    const navigation = {
        superadmin: [
            { name: t('nav.dashboard'), href: '/superadmin/dashboard', icon: LayoutDashboard },
            { name: t('superadmin.gyms'), href: '/superadmin/dashboard', icon: Building2 },
            { name: t('superadmin.requests'), href: '/superadmin/requests', icon: Inbox },
            { name: t('nav.settings'), href: '/superadmin/settings', icon: Settings },
        ],
        gymclient: [
            { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
            { name: t('nav.members'), href: '/members', icon: Users },
            { name: t('nav.expiringSoon'), href: '/expiring-soon', icon: Clock },
            { name: t('nav.warnings'), href: '/warnings', icon: AlertCircle, ownerOnly: true },
            { name: t('nav.deletedMembers'), href: '/deleted', icon: Trash2, ownerOnly: true },
            { name: t('nav.plansFees'), href: '/plans', icon: CreditCard, ownerOnly: true },
        ],
    };

    const navItems = isSuperAdmin() ? navigation.superadmin : navigation.gymclient;

    // Filter out owner-only items if user is not an owner
    const filteredNavItems = navItems.filter(item => {
        if (item.ownerOnly && !isOwner()) {
            return false;
        }
        return true;
    });

    return (
        <div className="flex h-full w-64 flex-col bg-card border-r border-border">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                <div className="bg-primary p-2 rounded-lg">
                    <Dumbbell className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">PowerGYM</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {filteredNavItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-border p-4">
                <p className="text-xs text-muted-foreground">PowerGYM v1.0</p>
            </div>
        </div>
    );
}

