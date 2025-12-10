import { Link, useLocation } from 'react-router-dom';
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
    Dumbbell
} from 'lucide-react';

const navigation = {
    superadmin: [
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
    ],
    gymclient: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Members', href: '/members', icon: Users },
        { name: 'Expiring Soon', href: '/expiring-soon', icon: Clock },
        { name: 'Warnings', href: '/warnings', icon: AlertCircle, ownerOnly: true },
        { name: 'Deleted Members', href: '/deleted', icon: Trash2, ownerOnly: true },
        { name: 'Plans & Fees', href: '/plans', icon: CreditCard, ownerOnly: true },
    ],
};

export function Sidebar() {
    const location = useLocation();
    const { isSuperAdmin, isOwner } = useAuth();

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
                            key={item.name}
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
