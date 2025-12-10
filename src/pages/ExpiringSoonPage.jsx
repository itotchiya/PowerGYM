import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Clock, AlertCircle } from 'lucide-react';

export function ExpiringSoonPage() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            // Fetch members
            const membersQuery = query(
                collection(db, `gyms/${userProfile.gymId}/members`),
                where('isDeleted', '==', false)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(membersData);

            // Fetch plans
            const plansQuery = query(collection(db, `gyms/${userProfile.gymId}/plans`));
            const plansSnapshot = await getDocs(plansQuery);
            const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(plansData);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile?.gymId]);

    // Filter members expiring soon (within 7 days)
    const expiringMembers = members.filter(member => {
        if (!member.currentSubscription?.endDate) return false;
        const endDate = new Date(member.currentSubscription.endDate);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 7;
    });

    const getDaysLeft = (member) => {
        if (!member.currentSubscription?.endDate) return 0;
        const endDate = new Date(member.currentSubscription.endDate);
        const today = new Date();
        return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
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
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Expiring Soon</h2>
                        <p className="text-muted-foreground">
                            Members with subscriptions expiring in the next 7 days
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {expiringMembers.length} {expiringMembers.length === 1 ? 'Member' : 'Members'} Expiring Soon
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expiringMembers.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No members expiring soon</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>End Date</TableHead>
                                        <TableHead>Days Left</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expiringMembers.map(member => {
                                        const plan = plans.find(p => p.id === member.currentSubscription?.planId);
                                        const daysLeft = getDaysLeft(member);

                                        return (
                                            <TableRow
                                                key={member.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => navigate(`/members/${member.id}`)}
                                            >
                                                <TableCell className="font-medium">
                                                    {member.firstName} {member.lastName}
                                                </TableCell>
                                                <TableCell>{member.email}</TableCell>
                                                <TableCell>{member.phone}</TableCell>
                                                <TableCell>{plan?.name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {new Date(member.currentSubscription.endDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={daysLeft <= 3 ? 'destructive' : 'secondary'}
                                                    >
                                                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
