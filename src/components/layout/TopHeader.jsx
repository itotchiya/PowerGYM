import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Bell, Settings, LogOut, Dumbbell, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationsMenu } from '@/components/notifications/NotificationsMenu';
import { GlobalSearch } from '@/components/GlobalSearch';

export function TopHeader({ hideBorder = false }) {
    const { user, userProfile, session, signOut, setSession } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // Keyboard shortcut for search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setSearchOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSignOut = async () => {
        const result = await signOut();
        if (result.success) {
            toast.success(t('auth.signedOutSuccess'));
        }
    };

    const getInitials = () => {
        if (!user?.email) return 'U';
        return user.email.substring(0, 2).toUpperCase();
    };

    const getGymName = () => {
        if (userProfile?.role === 'superadmin') return t('roles.superAdmin');
        // Use userProfile.gymName for real-time updates when name is changed
        return userProfile?.gymName || session?.gymName || 'PowerGYM';
    };

    const getUserRole = () => {
        if (userProfile?.role === 'superadmin') return t('roles.administrator');
        if (session?.subrole === 'owner') return t('roles.owner');
        return t('roles.manager');
    };

    const handleSwitchRole = () => {
        if (session?.subrole === 'manager') {
            // Switching from Manager to Owner - requires password
            setShowPasswordDialog(true);
        } else {
            // Switching from Owner to Manager - direct
            setSession({
                subrole: 'manager',
                gymId: userProfile?.gymId,
                gymName: userProfile?.gymName || 'PowerGYM'
            });
            toast.success(t('roles.switchedToManager'));
        }
    };

    const handleVerifyPassword = async () => {
        try {
            setLoading(true);

            const hash = btoa(password);

            if (hash === userProfile?.ownerPasswordHash) {
                setSession({
                    subrole: 'owner',
                    gymId: userProfile?.gymId,
                    gymName: userProfile?.gymName || 'PowerGYM'
                });

                toast.success(t('roles.switchedToOwner'));
                setShowPasswordDialog(false);
                setPassword('');
            } else {
                toast.error(t('header.incorrectPassword'));
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            toast.error(t('errors.somethingWentWrong'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className={`sticky top-0 z-50 bg-background ${hideBorder ? '' : 'border-b'}`}>
                <div className="flex h-14 items-center justify-between px-4 md:px-6">
                    {/* Left: Logo and Gym Name */}
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="bg-primary p-1.5 rounded-md">
                                <Dumbbell className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="font-semibold text-lg hidden sm:inline-block">
                                {getGymName()}
                            </span>
                        </Link>
                    </div>

                    {/* Center: Search (hidden on mobile) */}
                    <div className="hidden md:flex flex-1 max-w-md mx-6">
                        <Button
                            variant="outline"
                            className="relative w-full justify-start text-sm text-muted-foreground bg-muted/50 border-0 hover:bg-muted"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            <span>{t('header.searchPlaceholder')}</span>
                            <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </Button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Search Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="h-5 w-5" />
                        </Button>

                        {/* Theme Switch */}
                        <ThemeSwitch />

                        {/* Notifications */}
                        <NotificationsMenu />

                        {/* Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                        <span className="text-xs font-medium text-primary-foreground">
                                            {getInitials()}
                                        </span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{user?.email}</p>
                                        <p className="text-xs text-muted-foreground">{getUserRole()}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link to="/settings" className="flex items-center w-full">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>{t('header.settings')}</span>
                                        </Link>
                                    </DropdownMenuItem>

                                    {/* Switch Role - Only for Gym Clients */}
                                    {userProfile?.role === 'gymclient' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleSwitchRole}>
                                                {session?.subrole === 'owner' ? (
                                                    <>
                                                        <UserCog className="mr-2 h-4 w-4" />
                                                        <span>{t('roles.switchToManager')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        <span>{t('roles.switchToOwner')}</span>
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleSignOut}
                                    className="text-red-600 bg-red-500/10 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-600"
                                >
                                    <LogOut className="mr-2 h-4 w-4 text-red-600" />
                                    <span>{t('auth.signOut')}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Global Search Dialog */}
            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

            {/* Verify Password Dialog for Switching to Owner */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('header.ownerVerification')}</DialogTitle>
                        <DialogDescription>
                            {t('header.enterOwnerPassword')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="switch-password">{t('auth.password')}</Label>
                            <Input
                                id="switch-password"
                                type="password"
                                placeholder={t('auth.password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowPasswordDialog(false);
                            setPassword('');
                        }}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleVerifyPassword} disabled={loading}>
                            {loading ? t('common.verifying') : t('common.verify')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

