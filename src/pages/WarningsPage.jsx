import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { AlertTriangle } from 'lucide-react';

export function WarningsPage() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            // Fetch members with warnings
            const membersQuery = query(
                collection(db, `gyms/${userProfile.gymId}/members`),
                where('isDeleted', '==', false)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(membersData);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load warnings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile?.gymId]);

    // Filter members with warnings
    const membersWithWarnings = members.filter(member =>
        member.warnings && member.warnings.length > 0
    );

    // Flatten all warnings with member info
    const allWarnings = membersWithWarnings.flatMap(member =>
        (member.warnings || []).map(warning => ({
            ...warning,
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            memberEmail: member.email,
        }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

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
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Member Warnings</h2>
                        <p className="text-muted-foreground">
                            All warnings for members - Owner access only
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Warnings</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{allWarnings.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Members with Warnings</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{membersWithWarnings.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent (7 days)</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {allWarnings.filter(w => {
                                    const warningDate = new Date(w.date);
                                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                                    return warningDate > sevenDaysAgo;
                                }).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Warnings Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Warnings ({allWarnings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {allWarnings.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No warnings found</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Warning Message</TableHead>
                                        <TableHead>Added By</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allWarnings.map((warning, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {new Date(warning.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {warning.memberName}
                                            </TableCell>
                                            <TableCell>{warning.memberEmail}</TableCell>
                                            <TableCell>
                                                <div className="max-w-md">
                                                    {warning.message}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{warning.addedBy}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/members/${warning.memberId}`)}
                                                >
                                                    View Member
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
