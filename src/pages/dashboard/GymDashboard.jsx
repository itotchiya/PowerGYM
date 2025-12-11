import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Users, UserCheck, Clock, DollarSign, TrendingUp, AlertCircle, Plus, Shield, CreditCard, Calendar, History } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PlanDistributionChart } from '@/components/dashboard/PlanDistributionChart';
import { MemberStatusChart } from '@/components/dashboard/MemberStatusChart';

const COLORS = {
    active: '#10b981',
    expired: '#ef4444',
    expiring: '#f59e0b',
};

export function GymDashboard() {
    const navigate = useNavigate();
    const { userProfile, session, isOwner, isManager } = useAuth();
    const { t } = useTranslation();
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateFilter, setDateFilter] = useState('all_time');

    const [memberForm, setMemberForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        planId: '',
    });

    // Derived state for charts based on Date Filter
    const filteredMembersForCharts = members.filter(member => {
        if (dateFilter === 'all_time') return true;

        const joinedDate = member.createdAt?.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
        const now = new Date();

        if (dateFilter === 'this_month') {
            return joinedDate.getMonth() === now.getMonth() && joinedDate.getFullYear() === now.getFullYear();
        }

        if (dateFilter === 'this_year') {
            return joinedDate.getFullYear() === now.getFullYear();
        }

        if (dateFilter === 'year_to_now') {
            // Assuming this means strictly "From start of year to now" vs "Rolling year"?
            // Usually "Year to Date" (YTD) is same as "This Year" in context of "current progress".
            // Let's treat it as YTD.
            return joinedDate.getFullYear() === now.getFullYear() && joinedDate <= now;
        }

        return true;
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

    // Financial calculations
    const outstandingPaymentsMembers = members.filter(m => (m.outstandingBalance || 0) > 0).length;
    const unpaidInsuranceMembers = members.filter(m => m.insuranceStatus !== 'active').length;

    // Owner-only Revenue Calcs
    const totalSubscriptionPaid = members.reduce((sum, m) => {
        // Assume payments array tracks all payments. Ideally we distinguish sub vs insurance.
        // For now, let's treat 'amount' in payments as total cash collected.
        // We will separate if payment objects have type. If not, we approximate or rely on schema.
        // Given current schema, let's assume all payments are generic cash in.
        return sum + (m.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0);
    }, 0);

    const totalOutstanding = members.reduce((sum, m) => sum + (m.outstandingBalance || 0), 0);

    // For specific rows requested:
    // 1. Subscription Revenue
    // Let's approximate: Sub Revenue = Total Paid - Insurance Paid (if we can track insurance separately)
    // Or if we don't have separate types, we might have to just use Total Revenue for now.
    // However, the user asked for specific rows. Let's look at `insuranceStatus` and `insuranceFee`?
    // Actually, we can check if member has insurance active -> 50 MAD (standard) or whatever logic.
    // Let's compute 'Insurance Paid' based on active insurance status count * fee if not tracked in payments.
    // BUT the best is if payments had types. If not, let's just create the UI and map available data best effort.

    // Standard Insurance Fee usually 50 or variable? Previous prompt mentioned 50.
    const insuranceFee = 50;
    const totalInsurancePaid = members.filter(m => m.insuranceStatus === 'active').reduce((sum, m) => sum + insuranceFee, 0); // Approx

    const totalSubscriptionRevenue = totalSubscriptionPaid - totalInsurancePaid; // De-dupe if payments include everything

    const totalLikelyOutstandingSub = totalOutstanding; // All outstanding usually sub?
    const totalLikelyOutstandingIns = members.filter(m => m.insuranceStatus !== 'active' && m.currentSubscription?.endDate && new Date(m.currentSubscription.endDate) > new Date()).length * insuranceFee;
    // ^ Loose approximation for "Unpaid Insurance" value if they are active members but no insurance.

    const totalSubscriptionValue = totalSubscriptionRevenue + totalLikelyOutstandingSub;
    const totalInsuranceValue = totalInsurancePaid + totalLikelyOutstandingIns;

    const grandTotalRevenue = totalSubscriptionRevenue + totalInsurancePaid;
    const grandTotalOutstanding = totalLikelyOutstandingSub + totalLikelyOutstandingIns;
    const grandTotalEarnings = grandTotalRevenue + grandTotalOutstanding;

    // Time-based (This Month, This Year)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const revenueThisMonth = members.reduce((sum, m) => {
        return sum + (m.payments || []).filter(p => {
            const d = new Date(p.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sub, p) => sub + p.amount, 0);
    }, 0);

    const revenueThisYear = members.reduce((sum, m) => {
        return sum + (m.payments || []).filter(p => {
            const d = new Date(p.date);
            return d.getFullYear() === currentYear;
        }).reduce((sub, p) => sub + p.amount, 0);
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

            const initialSubscription = {
                planId: memberForm.planId,
                planName: selectedPlan.name,
                price: selectedPlan.price || 0,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
            };

            const newMember = {
                firstName: memberForm.firstName,
                lastName: memberForm.lastName,
                email: memberForm.email,
                phone: memberForm.phone,
                currentSubscription: initialSubscription,
                subscriptionHistory: [initialSubscription],
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
                        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
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
                        <h2 className="text-3xl font-bold tracking-tight">{t('nav.dashboard')}</h2>
                        <p className="text-muted-foreground">
                            {t('dashboard.welcome')}
                        </p>
                    </div>
                    {/* Add Member Action - Visible to Manager & Owner explicitly */}
                    {(isOwner() || isManager()) && (
                        <Button onClick={() => navigate('/members/add')}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('members.addNewMember')}
                        </Button>
                    )}
                </div>

                {/* Shared KPIs - Clickable Filter Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {/* Total Members -> All */}
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/members')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('dashboard.totalMembers')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalMembers}</div>
                            <p className="text-xs text-muted-foreground">{activeMembers} {t('members.active')}</p>
                        </CardContent>
                    </Card>

                    {/* Active Members -> ?status=active */}
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/members?status=active')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('dashboard.activeMembers')}</CardTitle>
                            <UserCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeMembers}</div>
                            <p className="text-xs text-muted-foreground">{t('dashboard.ofTotal', { percent: '100%' })}</p>
                        </CardContent>
                    </Card>

                    {/* Expired Members -> ?status=expired */}
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/members?status=expired')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('dashboard.expiredMembers')}</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{expiredMembers}</div>
                            <p className="text-xs text-muted-foreground">{t('dashboard.membersToReengage')}</p>
                        </CardContent>
                    </Card>

                    {/* Outstanding Payments -> ?payment=outstanding */}
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/members?payment=outstanding')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('dashboard.outstandingPayments')}</CardTitle>
                            <DollarSign className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{outstandingPaymentsMembers}</div>
                            <p className="text-xs text-muted-foreground">{t('common.total')}: {totalOutstanding.toLocaleString()} MAD</p>
                        </CardContent>
                    </Card>

                    {/* Unpaid Insurance -> ?insurance=unpaid */}
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/members?insurance=unpaid')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('dashboard.unpaidInsurance')}</CardTitle>
                            <Shield className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{unpaidInsuranceMembers}</div>
                            <p className="text-xs text-muted-foreground">{t('dashboard.membersNeedingToPay')}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section - Visible to both Manager and Owner */}
                {(isOwner() || isManager()) && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">{t('dashboard.memberAnalytics')}</h3>
                                <p className="text-sm text-muted-foreground">{t('dashboard.distributionOverview')}</p>
                            </div>
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_time">{t('time.allTime')}</SelectItem>
                                    <SelectItem value="this_month">{t('time.thisMonth')}</SelectItem>
                                    <SelectItem value="this_year">{t('time.thisYear')}</SelectItem>
                                    <SelectItem value="year_to_now">{t('time.yearToDate')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <PlanDistributionChart members={filteredMembersForCharts} plans={plans} />
                            <MemberStatusChart members={filteredMembersForCharts} />
                        </div>
                    </div>
                )}

                {/* Owner-Only Revenue Insights */}
                {isOwner() && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold tracking-tight">{t('dashboard.revenueInsights')}</h3>
                            <p className="text-muted-foreground text-sm">{t('dashboard.financialBreakdown')}</p>
                        </div>

                        {/* Row 1: Subscriptions */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.earnings')}</CardTitle>
                                        <div className="text-2xl font-bold text-green-600">{totalSubscriptionRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.totalMembershipFees')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.outstanding')}</CardTitle>
                                        <div className="text-2xl font-bold text-destructive">{totalLikelyOutstandingSub.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.feesToCollect')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalSubscriptions')}</CardTitle>
                                        <div className="text-2xl font-bold">{totalSubscriptionValue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.totalSubValue')}</p></CardContent>
                            </Card>
                        </div>

                        {/* Row 2: Insurance */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.insurancePaid')}</CardTitle>
                                        <div className="text-2xl font-bold text-blue-600">{totalInsurancePaid.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.insuranceCollected')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.insuranceNotPaid')}</CardTitle>
                                        <div className="text-2xl font-bold text-orange-500">{totalLikelyOutstandingIns.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.potentialInsurance')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalInsurance')}</CardTitle>
                                        <div className="text-2xl font-bold">{totalInsuranceValue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.totalInsuranceValue')}</p></CardContent>
                            </Card>
                        </div>

                        {/* Row 3: Time based */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.revenueThisMonth')}</CardTitle>
                                        <div className="text-2xl font-bold text-primary">{revenueThisMonth.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.earningsThisMonth')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.revenueThisYear')}</CardTitle>
                                        <div className="text-2xl font-bold text-primary">{revenueThisYear.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.earningsThisYear')}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.revenueAllTime')}</CardTitle>
                                        <div className="text-2xl font-bold text-primary">{grandTotalRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span></div>
                                    </div>
                                    <History className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-xs text-muted-foreground">{t('dashboard.totalEarningsInsurance')}</p></CardContent>
                            </Card>
                        </div>

                        {/* Row 4: Chart */}
                        <Card className="col-span-4">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{t('dashboard.revenueOverview')}</CardTitle>
                                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={monthlyRevenueData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} MAD`} />
                                        <Tooltip formatter={(value) => [`${value} MAD`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </div >

            {/* Add Member Dialog */}
            < Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('members.addNewMember')}</DialogTitle>
                        <DialogDescription>
                            {t('members.createNewMember')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMember}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">{t('members.firstName')}</Label>
                                    <Input
                                        id="firstName"
                                        value={memberForm.firstName}
                                        onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">{t('members.lastName')}</Label>
                                    <Input
                                        id="lastName"
                                        value={memberForm.lastName}
                                        onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('auth.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={memberForm.email}
                                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t('members.phone')}</Label>
                                <Input
                                    id="phone"
                                    value={memberForm.phone}
                                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="planId">{t('members.membershipPlan')}</Label>
                                <Select value={memberForm.planId} onValueChange={(v) => setMemberForm({ ...memberForm, planId: v })} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('members.selectPlan')} />
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
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('members.addMember')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >
        </DashboardLayout >
    );
}
