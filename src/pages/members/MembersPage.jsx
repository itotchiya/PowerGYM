import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    addDoc,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Search, Download, MoreVertical, AlertTriangle, Edit, RefreshCw, DollarSign, Trash2, Plus, Phone, Shield, ShieldAlert, Check, ArrowUpDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export function MembersPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userProfile, isOwner, isManager } = useAuth();
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [planFilter, setPlanFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') === 'outstanding' ? 'outstanding' : 'all');
    const [insuranceFilter, setInsuranceFilter] = useState(searchParams.get('insurance') === 'unpaid' ? 'unpaid' : 'all');
    const [sortOption, setSortOption] = useState(searchParams.get('payment') === 'outstanding' ? 'highest_outstanding' : 'newest');

    // Dialogs
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    // Forms
    const [memberForm, setMemberForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cniId: '',
        planId: '',
        isFullyPaid: true,
        amountPaid: '',
        includeInsurance: true,
        insuranceFee: '50',
    });
    const [warningForm, setWarningForm] = useState({ message: '' });
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cniId: '',
    });

    // Payment Form state
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        note: '',
        payFullOutstanding: true,
        payInsurance: false,
    });

    // Fetch data
    const fetchData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            const membersQuery = query(
                collection(db, `gyms/${userProfile.gymId}/members`),
                where('isDeleted', '==', false)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sorting will act on filteredMembers, but we can pre-sort here if needed, 
            // but dynamic sort is better in render/filter logic.
            setMembers(membersData);

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

    const getMemberStatus = (member) => {
        if (!member.currentSubscription?.endDate) return 'expired';
        const endDate = new Date(member.currentSubscription.endDate);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return 'expired';
        if (daysLeft <= 7) return 'expiring';
        return 'active';
    };

    const filteredMembers = members.filter(member => {
        const matchesSearch =
            member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            member.phone.includes(searchTerm) ||
            (member.cniId && member.cniId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (member.memberId && member.memberId.toString().includes(searchTerm));

        const status = getMemberStatus(member);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        const matchesPlan = planFilter === 'all' || member.currentSubscription?.planId === planFilter;

        // URL Params Filters
        const paymentParam = searchParams.get('payment');
        const insuranceParam = searchParams.get('insurance');
        const statusParam = searchParams.get('status');

        let matchesUrlFilters = true;

        if (paymentParam === 'outstanding') {
            if ((member.outstandingBalance || 0) <= 0) matchesUrlFilters = false;
        }

        if (insuranceParam === 'unpaid') {
            if (member.insuranceStatus === 'active') matchesUrlFilters = false;
        }

        // If status param is present, it overrides the dropdown or syncs with it
        // The dropdown (statusFilter) catches the initial Sync in useEffect, but let's double check logic
        // Actually, we should rely on statusFilter being set by useEffect on mount, 
        // OR we can check directly here if we want instant URL reaction without state sync lag.
        // For simplicity, let's assume useEffect handles the 'status' param -> setStatusFilter mapping.

        return matchesSearch && matchesStatus && matchesPlan && matchesUrlFilters;
    }).sort((a, b) => {
        if (sortOption === 'newest') {
            // Newest first (highest memberId or createdAt)
            if (a.memberId && b.memberId) return b.memberId - a.memberId;
            return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        } else if (sortOption === 'oldest') {
            if (a.memberId && b.memberId) return a.memberId - b.memberId;
            return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
        } else if (sortOption === 'highest_outstanding') {
            return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
        }
        return 0;
    });

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Members');

        // Define Headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Plan', key: 'plan', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', width: 20 },
            { header: 'Insurance Status', key: 'insuranceStatus', width: 20 },
            { header: 'Price Paid (MAD)', key: 'pricePaid', width: 15 },
            { header: 'Outstanding (MAD)', key: 'outstanding', width: 18 },
            { header: 'Start Date', key: 'startDate', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
        ];

        // Format Headers
        worksheet.getRow(1).font = { bold: true };

        filteredMembers.forEach(member => {
            const plan = plans.find(p => p.id === member.currentSubscription?.planId);
            const isInsurancePaid = member.insuranceStatus === 'active';
            const outstanding = member.outstandingBalance || 0;
            const paymentStatus = outstanding > 0 ? 'Outstanding' : 'Fully Paid';
            const insuranceStatus = isInsurancePaid ? 'Paid' : 'Unpaid';
            const pricePaid = member.totalPaid || 0;

            const row = worksheet.addRow({
                id: member.memberId || 'N/A',
                firstName: member.firstName,
                lastName: member.lastName,
                plan: plan?.name || 'N/A',
                paymentStatus: paymentStatus,
                insuranceStatus: insuranceStatus,
                pricePaid: pricePaid,
                outstanding: outstanding,
                startDate: member.currentSubscription?.startDate ? new Date(member.currentSubscription.startDate).toLocaleDateString() : 'N/A',
                endDate: member.currentSubscription?.endDate ? new Date(member.currentSubscription.endDate).toLocaleDateString() : 'N/A'
            });

            // Styling Logic
            // Payment Status Coloring
            const paymentCell = row.getCell('paymentStatus');
            if (paymentStatus === 'Outstanding') {
                paymentCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE0B2' } // Light Orange
                };
                paymentCell.font = { color: { argb: 'FFF57C00' }, bold: true }; // Dark Orange Text
            } else {
                paymentCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFC8E6C9' } // Light Green
                };
                paymentCell.font = { color: { argb: 'FF2E7D32' }, bold: true }; // Dark Green Text
            }

            // Insurance Status Coloring
            const insuranceCell = row.getCell('insuranceStatus');
            if (insuranceStatus === 'Unpaid') {
                insuranceCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFCDD2' } // Light Red
                };
                insuranceCell.font = { color: { argb: 'FFC62828' }, bold: true }; // Dark Red Text
            } else {
                insuranceCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFC8E6C9' } // Light Green
                };
                insuranceCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
            }

            // Value Conditional Formatting for Outstanding Amount
            if (outstanding > 0) {
                const amountCell = row.getCell('outstanding');
                amountCell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `members_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel exported successfully');
    };

    // Add Member
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!userProfile?.gymId) return;

        try {
            const selectedPlan = plans.find(p => p.id === memberForm.planId);
            if (!selectedPlan) return;

            const planPrice = Number(selectedPlan.price);
            const insuranceFee = memberForm.includeInsurance ? Number(memberForm.insuranceFee) : 0;
            const totalPrice = planPrice + insuranceFee;

            let amountPaid = 0;
            if (memberForm.isFullyPaid) {
                amountPaid = totalPrice;
            } else {
                amountPaid = Number(memberForm.amountPaid);
                if (amountPaid > totalPrice) {
                    toast.error('Amount paid cannot exceed total price');
                    return;
                }
            }

            const outstandingBalance = totalPrice - amountPaid;

            const gymRef = doc(db, 'gyms', userProfile.gymId);
            let newMemberId = 1;

            try {
                await runTransaction(db, async (transaction) => {
                    const gymDoc = await transaction.get(gymRef);
                    if (!gymDoc.exists()) throw "Gym does not exist!";
                    const currentCount = gymDoc.data().memberCount || 0;
                    newMemberId = currentCount + 1;
                    transaction.update(gymRef, { memberCount: newMemberId });
                });
            } catch (e) {
                console.error("Counter failed", e);
                newMemberId = members.length + 1;
            }

            const initialSubscription = {
                planId: memberForm.planId,
                planName: selectedPlan.name,
                price: planPrice,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
            };

            const newMember = {
                memberId: newMemberId,
                firstName: memberForm.firstName,
                lastName: memberForm.lastName,
                cniId: memberForm.cniId || '',
                email: memberForm.email || '',
                phone: memberForm.phone,
                currentSubscription: initialSubscription,
                subscriptionHistory: [initialSubscription],
                payments: [{
                    amount: amountPaid,
                    type: 'initial_registration',
                    date: new Date().toISOString(),
                    note: `Initial registration`
                }],
                insuranceStatus: memberForm.includeInsurance ? 'active' : 'none',
                insuranceFee: insuranceFee,
                warnings: [],
                outstandingBalance: outstandingBalance,
                totalPaid: amountPaid,
                isDeleted: false,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, `gyms/${userProfile.gymId}/members`), newMember);

            toast.success(`Member #${newMemberId} added`);
            setShowAddMemberDialog(false);
            setMemberForm({
                firstName: '', lastName: '', email: '', phone: '', cniId: '', planId: '',
                isFullyPaid: true, amountPaid: '', includeInsurance: true, insuranceFee: '50'
            });
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to add member');
        }
    };

    // Add Warning with Auto Date/Time
    const handleAddWarning = async (e) => {
        e.preventDefault();
        if (!selectedMember) return;

        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
            const warnings = selectedMember.warnings || [];

            const now = new Date();

            warnings.push({
                message: warningForm.message,
                dateTime: now.toISOString(),
                addedBy: userProfile.role,
            });

            await updateDoc(memberRef, { warnings });
            toast.success('Warning added');
            setShowWarningDialog(false);
            setWarningForm({ message: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to add warning');
        }
    };

    // Edit Member
    const handleEditMember = async (e) => {
        e.preventDefault();
        const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
        await updateDoc(memberRef, editForm);
        toast.success('Member updated');
        setShowEditDialog(false);
        fetchData();
    };

    // Add Payment
    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedMember) return;

        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);

            let paymentAmount = 0;
            let note = "";
            let updateData = {};

            // Handle Insurance Payment
            if (paymentForm.payInsurance && selectedMember.insuranceStatus !== 'active') {
                const insuranceFee = 50;
                paymentAmount += insuranceFee;
                note += `Insurance (${insuranceFee} MAD) `;
                updateData.insuranceStatus = 'active';
                updateData.insuranceFee = insuranceFee;
            }

            // Handle Debt Payment
            let debtPayment = 0;
            if (paymentForm.payFullOutstanding) {
                debtPayment = selectedMember.outstandingBalance;
            } else {
                debtPayment = Number(paymentForm.amount);
            }

            if (debtPayment > 0) {
                paymentAmount += debtPayment;
                note += `Debt Payment (${debtPayment} MAD)`;

                const newOutstanding = Math.max(0, (selectedMember.outstandingBalance || 0) - debtPayment);
                updateData.outstandingBalance = newOutstanding;
            }

            if (paymentAmount <= 0) {
                toast.error("Invalid payment amount");
                return;
            }

            const payments = selectedMember.payments || [];
            payments.push({
                amount: paymentAmount,
                type: 'debt_payment',
                date: new Date().toISOString(),
                note: paymentForm.note ? `${note} - ${paymentForm.note}` : note,
            });
            updateData.payments = payments;
            updateData.totalPaid = (selectedMember.totalPaid || 0) + paymentAmount;

            await updateDoc(memberRef, updateData);

            toast.success('Payment recorded');
            setShowPaymentDialog(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to record payment');
        }
    };

    const handleDeleteMember = async () => {
        const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, selectedMember.id);
        await updateDoc(memberRef, { isDeleted: true });
        toast.success('Member deleted');
        setShowDeleteDialog(false);
        fetchData();
    };

    const openWarningDialog = (member) => {
        setSelectedMember(member);
        setWarningForm({ message: '' });
        setShowWarningDialog(true);
    };

    const openEditDialog = (member) => {
        setSelectedMember(member);
        setEditForm({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email || '',
            phone: member.phone,
            cniId: member.cniId || '',
        });
        setShowEditDialog(true);
    };

    const openPaymentDialog = (member) => {
        setSelectedMember(member);
        setPaymentForm({
            amount: '',
            note: '',
            payFullOutstanding: true,
            payInsurance: false
        });
        setShowPaymentDialog(true);
    };

    const openDeleteDialog = (member) => {
        setSelectedMember(member);
        setShowDeleteDialog(true);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Member Management</h2>
                        <p className="text-muted-foreground">
                            Manage all {filteredMembers.length} members
                        </p>
                    </div>
                    {isOwner() && (
                        <Button onClick={() => setShowAddMemberDialog(true)} size="lg">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Member
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                            <div className="relative col-span-2 lg:col-span-2">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Name, Phone, ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={planFilter} onValueChange={setPlanFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Plans</SelectItem>
                                    {plans.map(plan => (
                                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Payment</SelectItem>
                                    <SelectItem value="paid">Fully Paid</SelectItem>
                                    <SelectItem value="outstanding">Outstanding</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Insurance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Insurance</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2 col-span-2 lg:col-span-6 justify-end mt-2">
                                <Select value={sortOption} onValueChange={setSortOption}>
                                    <SelectTrigger className="w-[180px]">
                                        <ArrowUpDown className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest First</SelectItem>
                                        <SelectItem value="oldest">Oldest First</SelectItem>
                                        <SelectItem value="highest_outstanding">Highest Debt</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isOwner() && (
                                    <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Excel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Members Table */}
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-lg">Members List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-center">Insurance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-center">Warnings</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMembers.map(member => {
                                    const status = getMemberStatus(member);
                                    const plan = plans.find(p => p.id === member.currentSubscription?.planId);
                                    const warnings = member.warnings || [];
                                    const outstanding = member.outstandingBalance || 0;
                                    const insurancePaid = member.insuranceStatus === 'active';

                                    return (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                #{member.memberId || '-'}
                                            </TableCell>
                                            <TableCell
                                                className="cursor-pointer"
                                                onClick={() => navigate(`/members/${member.id}`)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-primary hover:underline">
                                                        {member.firstName} {member.lastName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {member.phone}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal border bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-200">
                                                    {plan?.name || 'No Plan'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {outstanding > 0 ? (
                                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                                                        {outstanding} MAD Due
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800 dark:text-emerald-400">
                                                        Paid
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {insurancePaid ? (
                                                    <div className="flex justify-center" title="Insurance Paid">
                                                        <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            <Shield className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center" title="Insurance Unpaid">
                                                        <div className="p-1.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                                            <ShieldAlert className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {status === 'active' ? (
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0">
                                                        Active
                                                    </Badge>
                                                ) : status === 'expiring' ? (
                                                    <Badge className="bg-amber-500 hover:bg-amber-600 border-0">
                                                        Expiring Soon
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        Expired
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {member.currentSubscription?.startDate
                                                    ? new Date(member.currentSubscription.startDate).toLocaleDateString()
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {member.currentSubscription?.endDate
                                                    ? new Date(member.currentSubscription.endDate).toLocaleDateString()
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {warnings.length > 0 && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="destructive" className="cursor-help">
                                                                    {warnings.length}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <div className="space-y-2">
                                                                    {warnings.map((w, i) => (
                                                                        <div key={i} className="text-xs border-b last:border-0 pb-1 last:pb-0">
                                                                            <p className="font-semibold">{new Date(w.dateTime).toLocaleDateString()} {new Date(w.dateTime).toLocaleTimeString()}</p>
                                                                            <p>{w.message}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {(isManager() || isOwner()) && (
                                                            <DropdownMenuItem onClick={() => openWarningDialog(member)}>
                                                                <AlertTriangle className="mr-2 h-4 w-4" />
                                                                Add Warning
                                                            </DropdownMenuItem>
                                                        )}
                                                        {isOwner() && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => openEditDialog(member)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit Member
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => openPaymentDialog(member)}
                                                                    disabled={outstanding <= 0 && member.insuranceStatus === 'active'}
                                                                    className={outstanding <= 0 && member.insuranceStatus === 'active' ? "opacity-50 cursor-not-allowed" : ""}
                                                                >
                                                                    <DollarSign className="mr-2 h-4 w-4" />
                                                                    Add Payment
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openDeleteDialog(member)} className="text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Add Member Dialog */}
            <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddMember}>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2"><span className="bg-primary/10 text-primary p-1 rounded">1</span> Member Information</h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>CNI ID</Label>
                                        <Input value={memberForm.cniId} onChange={(e) => setMemberForm({ ...memberForm, cniId: e.target.value })} placeholder="e.g. AB123456" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email (Optional)</Label>
                                    <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2"><span className="bg-primary/10 text-primary p-1 rounded">2</span> Plan & Payment</h3>
                                <Separator />
                                <div className="space-y-2">
                                    <Label>Select Membership Plan</Label>
                                    <Select value={memberForm.planId} onValueChange={(v) => setMemberForm({ ...memberForm, planId: v })} required>
                                        <SelectTrigger><SelectValue placeholder="Select a plan..." /></SelectTrigger>
                                        <SelectContent>
                                            {plans.map((plan) => (
                                                <SelectItem key={plan.id} value={plan.id}>{plan.name} - {plan.price} MAD</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 border p-3 rounded-lg bg-muted/20">
                                    <Checkbox checked={memberForm.includeInsurance} onCheckedChange={(c) => setMemberForm({ ...memberForm, includeInsurance: c })} />
                                    <Label>Include Insurance Fee (50 MAD)</Label>
                                    {memberForm.includeInsurance && <Input className="w-20 h-8" value={memberForm.insuranceFee} onChange={(e) => setMemberForm({ ...memberForm, insuranceFee: e.target.value })} />}
                                </div>
                                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                                    <Label>Payment Status</Label>
                                    <div className="flex items-center gap-2">
                                        <Label className={!memberForm.isFullyPaid ? "font-bold" : "text-muted"}>Partial</Label>
                                        <Switch checked={memberForm.isFullyPaid} onCheckedChange={(c) => setMemberForm({ ...memberForm, isFullyPaid: c })} />
                                        <Label className={memberForm.isFullyPaid ? "font-bold" : "text-muted"}>Full</Label>
                                    </div>
                                </div>
                                {!memberForm.isFullyPaid && (
                                    <div className="space-y-2">
                                        <Label>Amount Paid Now</Label>
                                        <Input type="number" value={memberForm.amountPaid} onChange={(e) => setMemberForm({ ...memberForm, amountPaid: e.target.value })} required />
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>Cancel</Button><Button type="submit">Add Member</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                        <DialogDescription>Pay off debt or add insurance</DialogDescription>
                    </DialogHeader>
                    {selectedMember && (
                        <form onSubmit={handleAddPayment}>
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Outstanding Debt:</span>
                                        <span className="font-bold text-destructive">{selectedMember.outstandingBalance || 0} MAD</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Insurance Status:</span>
                                        <span className={selectedMember.insuranceStatus === 'active' ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                                            {selectedMember.insuranceStatus === 'active' ? "Paid" : "Unpaid"}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 border p-3 rounded-lg">
                                        <Checkbox
                                            id="p-insurance"
                                            checked={selectedMember.insuranceStatus === 'active' || paymentForm.payInsurance}
                                            disabled={selectedMember.insuranceStatus === 'active'}
                                            onCheckedChange={(c) => setPaymentForm({ ...paymentForm, payInsurance: c })}
                                        />
                                        <Label htmlFor="p-insurance" className={selectedMember.insuranceStatus === 'active' ? "text-muted-foreground" : ""}>
                                            Pay Insurance (50 MAD)
                                        </Label>
                                    </div>

                                    {(selectedMember.outstandingBalance > 0) && (
                                        <div className="space-y-4 border p-3 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <Label>Payment Mode</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">Custom</span>
                                                    <Switch
                                                        checked={paymentForm.payFullOutstanding}
                                                        onCheckedChange={(c) => setPaymentForm({ ...paymentForm, payFullOutstanding: c })}
                                                    />
                                                    <span className="text-xs">Full Debt</span>
                                                </div>
                                            </div>

                                            {!paymentForm.payFullOutstanding && (
                                                <div className="space-y-2">
                                                    <Label>Amount to Pay (MAD)</Label>
                                                    <Input
                                                        type="number"
                                                        value={paymentForm.amount}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                                        placeholder={`Max ${selectedMember.outstandingBalance}`}
                                                        max={selectedMember.outstandingBalance}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Note (Optional)</Label>
                                        <Input value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="e.g. Cash payment" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
                                <Button type="submit">Confirm Payment</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditMember}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>CNI ID</Label>
                                <Input value={editForm.cniId} onChange={(e) => setEditForm({ ...editForm, cniId: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Optional)</Label>
                                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Warning Dialog (Simplified) */}
            <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Warning</DialogTitle>
                        <DialogDescription>
                            The warning will be logged with the current date and time.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddWarning}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Warning Message</Label>
                                <Input value={warningForm.message} onChange={(e) => setWarningForm({ ...warningForm, message: e.target.value })} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>Cancel</Button>
                            <Button type="submit" variant="destructive">Add Warning</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Member Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Member</DialogTitle>
                        <DialogDescription>Are you sure?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteMember}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
