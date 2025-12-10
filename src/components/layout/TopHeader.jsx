import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
import { Search, Bell, User, Settings, LogOut, Dumbbell, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationsMenu } from '@/components/notifications/NotificationsMenu';

export function TopHeader() {
    const { user, userProfile, session, signOut, setSession } = useAuth();
    const navigate = useNavigate();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        const result = await signOut();
        if (result.success) {
            toast.success('Signed out successfully');
        }
    };

    const getInitials = () => {
        if (!user?.email) return 'U';
        return user.email.substring(0, 2).toUpperCase();
    };

    const getGymName = () => {
        if (userProfile?.role === 'superadmin') return 'Super Admin';
        // Use userProfile.gymName for real-time updates when name is changed
        return userProfile?.gymName || session?.gymName || 'PowerGYM';
    };

    const getUserRole = () => {
        if (userProfile?.role === 'superadmin') return 'Administrator';
        if (session?.subrole === 'owner') return 'Owner';
        return 'Manager';
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
            toast.success('Switched to Manager access');
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

                toast.success('Switched to Owner access');
                setShowPasswordDialog(false);
                setPassword('');
            } else {
                toast.error('Incorrect password');
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            toast.error('Failed to verify password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 border-b bg-background">
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
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Search Button */}
                        <Button variant="ghost" size="icon" className="md:hidden">
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
                                    <DropdownMenuItem>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>

                                    {/* Switch Role - Only for Gym Clients */}
                                    {userProfile?.role === 'gymclient' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleSwitchRole}>
                                                {session?.subrole === 'owner' ? (
                                                    <>
                                                        <UserCog className="mr-2 h-4 w-4" />
                                                        <span>Switch to Manager</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        <span>Switch to Owner</span>
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Verify Password Dialog for Switching to Owner */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Owner Verification</DialogTitle>
                        <DialogDescription>
                            Enter your owner password to switch to owner access
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="switch-password">Password</Label>
                            <Input
                                id="switch-password"
                                type="password"
                                placeholder="Enter your password"
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
                            Cancel
                        </Button>
                        <Button onClick={handleVerifyPassword} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
