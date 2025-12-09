import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { toast } from 'sonner';

export function Header() {
    const { user, userProfile, session, signOut } = useAuth();

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

    const getRoleBadge = () => {
        if (userProfile?.role === 'superadmin') {
            return <Badge variant="destructive">Super Admin</Badge>;
        }
        if (session?.subrole === 'owner') {
            return <Badge variant="default">Owner</Badge>;
        }
        if (session?.subrole === 'manager') {
            return <Badge variant="secondary">Manager</Badge>;
        }
        return null;
    };

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div>
                <h1 className="text-xl font-semibold">
                    {userProfile?.role === 'superadmin' ? 'Super Admin Dashboard' : 'Gym Dashboard'}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {getRoleBadge()}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar>
                                <AvatarFallback>{getInitials()}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.email}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {userProfile?.role === 'superadmin' ? 'Super Administrator' :
                                        session?.subrole === 'owner' ? 'Gym Owner' : 'Gym Manager'}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
