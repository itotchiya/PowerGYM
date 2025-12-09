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
        <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
                <div className="bg-orange-500 p-2 rounded-lg">
                    <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">PowerGYM</span>
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
                                    ? 'bg-orange-500 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-800 p-4">
                <p className="text-xs text-gray-400">PowerGYM v1.0</p>
            </div>
        </div>
    );
}
