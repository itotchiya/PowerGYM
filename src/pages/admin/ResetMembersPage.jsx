import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, RotateCcw, ArrowLeft } from 'lucide-react';

export function ResetMembersPage() {
    const navigate = useNavigate();
    const { userProfile, isOwner } = useAuth();
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [stats, setStats] = useState(null);

    const CONFIRM_PHRASE = 'RESET ALL MEMBERS';

    const fetchStats = async () => {
        if (!userProfile?.gymId) return;

        try {
            const membersSnapshot = await getDocs(collection(db, `gyms/${userProfile.gymId}/members`));
            setStats({
                totalMembers: membersSnapshot.size,
                gymId: userProfile.gymId
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useState(() => {
        fetchStats();
    }, [userProfile?.gymId]);

    const handleReset = async () => {
        if (!userProfile?.gymId) {
            toast.error('No gym found');
            return;
        }

        if (confirmText !== CONFIRM_PHRASE) {
            toast.error(`Please type "${CONFIRM_PHRASE}" to confirm`);
            return;
        }

        try {
            setLoading(true);

            // Get all members
            const membersSnapshot = await getDocs(collection(db, `gyms/${userProfile.gymId}/members`));

            // Delete all members in batches
            const batch = writeBatch(db);
            let count = 0;

            for (const memberDoc of membersSnapshot.docs) {
                batch.delete(memberDoc.ref);
                count++;

                // Firestore batches have a limit of 500 operations
                if (count >= 500) {
                    await batch.commit();
                    count = 0;
                }
            }

            // Commit any remaining deletes
            if (count > 0) {
                await batch.commit();
            }

            // Reset the member counter to 0
            const gymRef = doc(db, 'gyms', userProfile.gymId);
            await updateDoc(gymRef, { memberCount: 0 });

            toast.success(`Successfully deleted ${membersSnapshot.size} members and reset counter to 0`);
            setConfirmText('');
            setStats({ totalMembers: 0, gymId: userProfile.gymId });

        } catch (error) {
            console.error('Error resetting members:', error);
            toast.error('Failed to reset members: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOwner()) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <p className="text-muted-foreground">Only owners can access this page.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-red-600">⚠️ Reset Members</h1>
                        <p className="text-muted-foreground">
                            Delete all members and reset the member ID counter
                        </p>
                    </div>
                </div>

                {/* Warning Card */}
                <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                            This action is <strong>irreversible</strong>. All member data will be permanently deleted.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats && (
                            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                                <p className="text-sm text-muted-foreground">Current Stats:</p>
                                <p className="font-bold text-lg">{stats.totalMembers} members</p>
                                <p className="text-xs text-muted-foreground">Gym ID: {stats.gymId}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-red-600">
                                Type <code className="bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">{CONFIRM_PHRASE}</code> to confirm:
                            </Label>
                            <Input
                                id="confirm"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type confirmation phrase..."
                                className="border-red-300 focus:border-red-500"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/settings')}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={loading || confirmText !== CONFIRM_PHRASE}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete All & Reset
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
