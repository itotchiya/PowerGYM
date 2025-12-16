import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Users,
    LayoutDashboard,
    Settings,
    AlertTriangle,
    Trash2,
    ClipboardList,
    CalendarClock,
    UserPlus,
    Bell,
    FileText,
    ChevronRight,
    Search
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export function GlobalSearch({ open, onOpenChange }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { userProfile, session } = useAuth();
    const [members, setMembers] = useState([]);
    const [deletedMembers, setDeletedMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        if (open && userProfile?.role === 'gymclient' && userProfile?.gymId) {
            fetchMembers();
            fetchDeletedMembers();
        }
    }, [open, userProfile]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchValue('');
        }
    }, [open]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const membersRef = collection(db, `gyms/${userProfile.gymId}/members`);
            const q = query(
                membersRef,
                where('isDeleted', '==', false)
            );
            const snapshot = await getDocs(q);
            const membersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMembers(membersData);
        } catch (error) {
            console.error('[GlobalSearch] Error fetching members:', error);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedMembers = async () => {
        try {
            const membersRef = collection(db, `gyms/${userProfile.gymId}/members`);
            const q = query(
                membersRef,
                where('isDeleted', '==', true)
            );
            const snapshot = await getDocs(q);
            const deletedData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDeletedMembers(deletedData);
        } catch (error) {
            console.error('[GlobalSearch] Error fetching deleted members:', error);
            setDeletedMembers([]);
        }
    };

    const handleNavigate = (path) => {
        onOpenChange(false);
        navigate(path);
    };

    // Get navigation items based on role
    const getNavigationItems = () => {
        if (userProfile?.role === 'superadmin') {
            return [
                { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/superadmin/dashboard' },
                { icon: FileText, label: t('superadmin.gymRequests'), path: '/superadmin/requests' },
                { icon: Settings, label: t('header.settings'), path: '/superadmin/settings' },
            ];
        }

        const isOwner = session?.subrole === 'owner';

        return [
            { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
            { icon: Users, label: t('nav.members'), path: '/members' },
            { icon: UserPlus, label: t('members.addNewMember'), path: '/members/add' },
            { icon: CalendarClock, label: t('nav.expiringSoon'), path: '/expiring-soon' },
            ...(isOwner ? [
                { icon: AlertTriangle, label: t('nav.warnings'), path: '/warnings' },
                { icon: Trash2, label: t('nav.deleted'), path: '/deleted' },
                { icon: ClipboardList, label: t('nav.plans'), path: '/plans' },
            ] : []),
            { icon: Settings, label: t('header.settings'), path: '/settings' },
            { icon: Bell, label: t('nav.notifications'), path: '/notifications' },
        ];
    };

    const navigationItems = getNavigationItems();
    const isOwner = session?.subrole === 'owner';

    // Filter results based on search
    const searchLower = searchValue.toLowerCase();
    const filteredNavigation = navigationItems.filter(item =>
        item.label.toLowerCase().includes(searchLower)
    );

    const filteredMembers = members.filter(member => {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const phone = member.phone || '';
        return fullName.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
    }).slice(0, 5);

    const filteredDeleted = deletedMembers.filter(member => {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const phone = member.phone || '';
        return fullName.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
    }).slice(0, 5);

    const hasResults = filteredNavigation.length > 0 || filteredMembers.length > 0 || filteredDeleted.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 max-w-2xl" aria-describedby="search-description">
                <DialogTitle className="sr-only">Search</DialogTitle>
                <div className="sr-only" id="search-description">Search for pages and members</div>

                {/* Search Input */}
                <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder={t('header.searchPlaceholder')}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        autoFocus
                    />
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                    {loading ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {t('common.loading')}
                        </div>
                    ) : !hasResults ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {t('search.noResults')}
                        </div>
                    ) : (
                        <div className="p-2">
                            {/* Navigation */}
                            {filteredNavigation.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {t('search.navigation')}
                                    </div>
                                    <div className="space-y-1">
                                        {filteredNavigation.map((item) => (
                                            <button
                                                key={item.path}
                                                onClick={() => handleNavigate(item.path)}
                                                className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-left"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Members */}
                            {userProfile?.role === 'gymclient' && filteredMembers.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {t('search.members')}
                                    </div>
                                    <div className="space-y-1">
                                        {filteredMembers.map((member) => {
                                            const fullName = `${member.firstName} ${member.lastName}`;
                                            return (
                                                <button
                                                    key={member.id}
                                                    onClick={() => handleNavigate(`/members/${member.id}`)}
                                                    className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-left"
                                                >
                                                    <Users className="h-4 w-4 shrink-0" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="truncate">{fullName}</span>
                                                        {member.phone && (
                                                            <span className="text-xs text-muted-foreground truncate">
                                                                {member.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {members.length > 5 && (
                                            <button
                                                onClick={() => handleNavigate(`/members?search=${encodeURIComponent(searchValue)}`)}
                                                className="w-full flex items-center justify-between px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-primary font-medium"
                                            >
                                                <span>Show all {members.length} members</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Deleted Members */}
                            {userProfile?.role === 'gymclient' && isOwner && filteredDeleted.length > 0 && (
                                <div>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {t('nav.deletedMembers')}
                                    </div>
                                    <div className="space-y-1">
                                        {filteredDeleted.map((member) => {
                                            const fullName = `${member.firstName} ${member.lastName}`;
                                            return (
                                                <button
                                                    key={member.id}
                                                    onClick={() => handleNavigate('/deleted')}
                                                    className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-left opacity-60"
                                                >
                                                    <Trash2 className="h-4 w-4 shrink-0" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="truncate">{fullName}</span>
                                                        {member.phone && (
                                                            <span className="text-xs text-muted-foreground truncate">
                                                                {member.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {deletedMembers.length > 5 && (
                                            <button
                                                onClick={() => handleNavigate(`/deleted?search=${encodeURIComponent(searchValue)}`)}
                                                className="w-full flex items-center justify-between px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-primary font-medium"
                                            >
                                                <span>Show all {deletedMembers.length} deleted members</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
