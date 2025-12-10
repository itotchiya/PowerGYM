import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Users, UserCheck, Clock, DollarSign, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = {
    active: '#10b981',
    expired: '#ef4444',
    expiring: '#f59e0b',
};

export function GymDashboard() {
    const { userProfile, session, isOwner } = useAuth();
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [memberForm, setMemberForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        planId: '',
    });

    // Fetch members and plans
    const fetchData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found in userProfile');
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
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile?.gymId]);

    // Calculate KPIs
    const totalMembers = members.length;
    const activeMembers = members.filter(m => {
        if (!m.currentSubscription?.endDate) return false;
        return new Date(m.currentSubscription.endDate) > new Date();
    }).length;

    const expiredMembers = totalMembers - activeMembers;

    const expiringSoon = members.filter(m => {
        if (!m.currentSubscription?.endDate) return false;
        const endDate = new Date(m.currentSubscription.endDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }).length;

    // Owner-only KPIs
    const totalRevenue = members.reduce((sum, m) => {
        return sum + (m.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0);
    }, 0);

    const expectedRevenue = members.reduce((sum, m) => {
        if (m.currentSubscription?.planId) {
            const plan = plans.find(p => p.id === m.currentSubscription.planId);
            return sum + (plan?.price || 0);
        }
        return sum;
    }, 0);

    const outstandingPayments = members.reduce((sum, m) => {
        return sum + (m.outstandingBalance || 0);
    }, 0);

    // Chart data - Member Status
    const statusChartData = [
        { name: 'Active', value: activeMembers, color: COLORS.active },
        { name: 'Expired', value: expiredMembers, color: COLORS.expired },
        { name: 'Expiring Soon', value: expiringSoon, color: COLORS.expiring },
    ].filter(item => item.value > 0);

    // Chart data - Members by Plan
    const planChartData = plans.map(plan => {
        const count = members.filter(m => m.currentSubscription?.planId === plan.id).length;
        return {
            name: plan.name,
            value: count,
        };
    }).filter(item => item.value > 0);

    // Chart data - Monthly Revenue
    const monthlyRevenueData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(selectedYear, i).toLocaleString('default', { month: 'short' });
        const revenue = members.reduce((sum, m) => {
            const monthPayments = (m.payments || []).filter(p => {
                const paymentDate = new Date(p.date);
                return paymentDate.getFullYear() === selectedYear && paymentDate.getMonth() === i;
            });
            return sum + monthPayments.reduce((pSum, p) => pSum + p.amount, 0);
        }, 0);
        return { month, revenue };
    });

    // Add Member
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!userProfile?.gymId) return;

        try {
            const selectedPlan = plans.find(p => p.id === memberForm.planId);
            if (!selectedPlan) {
                toast.error('Please select a valid plan');
                return;
            }

            const newMember = {
                firstName: memberForm.firstName,
                lastName: memberForm.lastName,
                email: memberForm.email,
                phone: memberForm.phone,
                currentSubscription: {
                    planId: memberForm.planId,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
                },
                payments: [],
                warnings: [],
                outstandingBalance: 0,
                isDeleted: false,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, `gyms/${userProfile.gymId}/members`), newMember);

            toast.success('Member added successfully');
            setShowAddMemberDialog(false);
            setMemberForm({ firstName: '', lastName: '', email: '', phone: '', planId: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding member:', error);
            toast.error('Failed to add member');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                        <p className="text-muted-foreground">
                            Welcome to your PowerGYM dashboard
                        </p>
                    </div>
                    {isOwner() && (
                        <Button onClick={() => setShowAddMemberDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Member
                        </Button>
                    )}
                </div>

                {/* Shared KPIs - Visible to both Owner and Manager */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalMembers}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeMembers} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeMembers}</div>
                            <p className="text-xs text-muted-foreground">
                                Currently active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{expiringSoon}</div>
                            <p className="text-xs text-muted-foreground">
                                In next 7 days
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expired</CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{expiredMembers}</div>
                            <p className="text-xs text-muted-foreground">
                                Need renewal
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Owner-Only KPIs */}
                {isOwner() && (
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalRevenue} MAD</div>
                                <p className="text-xs text-muted-foreground">
                                    All time
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{expectedRevenue} MAD</div>
                                <p className="text-xs text-muted-foreground">
                                    From active plans
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{outstandingPayments} MAD</div>
                                <p className="text-xs text-muted-foreground">
                                    Pending payments
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Charts Row */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Member Status Pie Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Member Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {statusChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">No member data yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Members by Plan Pie Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Members by Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {planChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={planChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {planChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">No plan data yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly Revenue Chart (Owner Only) */}
                {isOwner() && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Monthly Revenue</CardTitle>
                                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2026">2026</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#f97316" name="Revenue (MAD)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Add Member Dialog */}
            <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                        <DialogDescription>
                            Create a new gym member with initial subscription
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMember}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={memberForm.firstName}
                                        onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={memberForm.lastName}
                                        onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={memberForm.email}
                                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={memberForm.phone}
                                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="planId">Membership Plan</Label>
                                <Select value={memberForm.planId} onValueChange={(v) => setMemberForm({ ...memberForm, planId: v })} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name} - {plan.price} MAD / {plan.duration} days
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Add Member</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
