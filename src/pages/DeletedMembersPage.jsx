import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Trash2, RotateCcw, MoreVertical, AlertCircle } from 'lucide-react';

export function DeletedMembersPage() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            // Fetch deleted members
            const membersQuery = query(
                collection(db, `gyms/${userProfile.gymId}/members`),
                where('isDeleted', '==', true)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(membersData);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load deleted members');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile?.gymId]);

    // Restore member
    const handleRestoreMember = async () => {
        if (!selectedMember) return;

        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
            await updateDoc(memberRef, {
                isDeleted: false,
                deletedAt: null
            });

            toast.success('Member restored successfully');
            setShowRestoreDialog(false);
            setSelectedMember(null);
            fetchData();
        } catch (error) {
            console.error('Error restoring member:', error);
            toast.error('Failed to restore member');
        }
    };

    // Permanent delete
    const handlePermanentDelete = async () => {
        if (!selectedMember) return;

        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
            await deleteDoc(memberRef);

            toast.success('Member permanently deleted');
            setShowDeleteDialog(false);
            setSelectedMember(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting member:', error);
            toast.error('Failed to delete member permanently');
        }
    };

    const openRestoreDialog = (member) => {
        setSelectedMember(member);
        setShowRestoreDialog(true);
    };

    const openDeleteDialog = (member) => {
        setSelectedMember(member);
        setShowDeleteDialog(true);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Trash2 className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Deleted Members</h2>
                        <p className="text-muted-foreground">
                            Restore or permanently delete members - Owner access only
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {members.length} Deleted {members.length === 1 ? 'Member' : 'Members'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {members.length === 0 ? (
                            <div className="text-center py-12">
                                <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No deleted members</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Deleted On</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">
                                                {member.firstName} {member.lastName}
                                            </TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>{member.phone}</TableCell>
                                            <TableCell>
                                                {member.deletedAt
                                                    ? new Date(member.deletedAt.toDate()).toLocaleDateString()
                                                    : 'N/A'
                                                }
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openRestoreDialog(member)}>
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            Restore Member
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openDeleteDialog(member)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Permanently
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Restore Confirmation Dialog */}
            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restore Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to restore {selectedMember?.firstName} {selectedMember?.lastName}?
                            This will make them visible again in the members list.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowRestoreDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleRestoreMember}>
                            Restore Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permanent Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Permanently Delete Member</DialogTitle>
                        <DialogDescription>
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-destructive">Warning: This action cannot be undone!</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            This will permanently delete {selectedMember?.firstName} {selectedMember?.lastName} and all their data from the database.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handlePermanentDelete}>
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
