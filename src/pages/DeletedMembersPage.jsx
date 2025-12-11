import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
            toast.error(t('deleted.loadError'));
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

            toast.success(t('members.memberRestored'));
            setShowRestoreDialog(false);
            setSelectedMember(null);
            fetchData();
        } catch (error) {
            console.error('Error restoring member:', error);
            toast.error(t('deleted.restoreError'));
        }
    };

    // Permanent delete
    const handlePermanentDelete = async () => {
        if (!selectedMember) return;

        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
            await deleteDoc(memberRef);

            toast.success(t('deleted.permanentlyDeleted'));
            setShowDeleteDialog(false);
            setSelectedMember(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting member:', error);
            toast.error(t('deleted.deleteError'));
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
                        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
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
                        <h2 className="text-3xl font-bold tracking-tight">{t('nav.deletedMembers')}</h2>
                        <p className="text-muted-foreground">
                            {t('deleted.subtitle')}
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t('deleted.deletedCount', { count: members.length })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {members.length === 0 ? (
                            <div className="text-center py-12">
                                <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">{t('deleted.noDeletedMembers')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('members.fullName')}</TableHead>
                                        <TableHead>{t('members.email')}</TableHead>
                                        <TableHead>{t('members.phone')}</TableHead>
                                        <TableHead>{t('deleted.deletedOn')}</TableHead>
                                        <TableHead className="text-right rtl:text-left">{t('common.actions')}</TableHead>
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
                                                    : t('common.notAvailable')
                                                }
                                            </TableCell>
                                            <TableCell className="text-right rtl:text-left">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openRestoreDialog(member)}>
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            {t('members.restoreMember')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openDeleteDialog(member)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('deleted.deletePermanently')}
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
                        <DialogTitle>{t('members.restoreMember')}</DialogTitle>
                        <DialogDescription>
                            {t('deleted.restoreConfirmation', { name: `${selectedMember?.firstName} ${selectedMember?.lastName}` })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowRestoreDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="button" onClick={handleRestoreMember}>
                            {t('members.restoreMember')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permanent Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleted.permanentlyDeleteTitle')}</DialogTitle>
                        <DialogDescription>
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-destructive">{t('deleted.warning')}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('deleted.permanentDeleteWarning', { name: `${selectedMember?.firstName} ${selectedMember?.lastName}` })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={handlePermanentDelete}>
                            {t('deleted.deletePermanently')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
