import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { Search, Download, MoreVertical, AlertTriangle, Edit, RefreshCw, DollarSign, Trash2, Plus, Phone, Shield, ShieldAlert, Check, ArrowUpDown, Camera, Upload, X, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ImageCropper } from '@/components/ui/image-cropper';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';

export function MembersPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userProfile, isOwner, isManager } = useAuth();
    const { t } = useTranslation();
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

    // CNI upload states for Add Member form
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState(null);
    const [cniFile, setCniFile] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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

        // Payment filter logic
        const outstanding = member.outstandingBalance || 0;
        let matchesPayment = true;
        if (paymentFilter === 'paid') {
            matchesPayment = outstanding <= 0;
        } else if (paymentFilter === 'outstanding') {
            matchesPayment = outstanding > 0;
        }

        // Insurance filter logic
        let matchesInsurance = true;
        if (insuranceFilter === 'paid') {
            matchesInsurance = member.insuranceStatus === 'active';
        } else if (insuranceFilter === 'unpaid') {
            matchesInsurance = member.insuranceStatus !== 'active';
        }

        // URL Params Filters (for dashboard links)
        const paymentParam = searchParams.get('payment');
        const insuranceParam = searchParams.get('insurance');

        let matchesUrlFilters = true;

        if (paymentParam === 'outstanding') {
            if (outstanding <= 0) matchesUrlFilters = false;
        }

        if (insuranceParam === 'unpaid') {
            if (member.insuranceStatus === 'active') matchesUrlFilters = false;
        }

        return matchesSearch && matchesStatus && matchesPlan && matchesPayment && matchesInsurance && matchesUrlFilters;
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

            // Upload CNI file if provided
            let cniDocumentUrl = null;
            if (cniFile) {
                try {
                    const safeFirstName = memberForm.firstName.replace(/[^a-z0-9]/gi, '');
                    const safeLastName = memberForm.lastName.replace(/[^a-z0-9]/gi, '');
                    const fileExtension = cniFile.name.split('.').pop();
                    const fileName = `${newMemberId}-${safeFirstName}-${safeLastName}-CNI.${fileExtension}`;
                    const storageRef = ref(storage, `gyms/${userProfile.gymId}/cni-documents/${fileName}`);
                    await uploadBytes(storageRef, cniFile);
                    cniDocumentUrl = await getDownloadURL(storageRef);
                } catch (uploadError) {
                    console.error('CNI upload failed:', uploadError);
                    // Continue without CNI, user can upload later
                }
            }

            const newMember = {
                memberId: newMemberId,
                firstName: memberForm.firstName,
                lastName: memberForm.lastName,
                cniId: memberForm.cniId || '',
                cniDocumentUrl: cniDocumentUrl,
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

            // Clear CNI file state
            setCniFile(null);

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
                        <h2 className="text-3xl font-bold tracking-tight">{t('members.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('members.manageMembers', { count: filteredMembers.length })}
                        </p>
                    </div>
                    {isOwner() && (
                        <Button onClick={() => navigate('/members/add')} size="lg">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('members.addNewMember')}
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                            <div className="relative col-span-2 lg:col-span-2">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                                <Input
                                    placeholder={t('members.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 rtl:pl-3 rtl:pr-10"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('members.allStatuses')}</SelectItem>
                                    <SelectItem value="active">{t('common.active')}</SelectItem>
                                    <SelectItem value="expiring">{t('members.expiringSoon')}</SelectItem>
                                    <SelectItem value="expired">{t('members.expired')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={planFilter} onValueChange={setPlanFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('plans.plan')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('members.allPlans')}</SelectItem>
                                    {plans.map(plan => (
                                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('members.payment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('members.anyPayment')}</SelectItem>
                                    <SelectItem value="paid">{t('members.fullyPaid')}</SelectItem>
                                    <SelectItem value="outstanding">{t('members.outstanding')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('plans.insurance')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('members.anyInsurance')}</SelectItem>
                                    <SelectItem value="paid">{t('members.paid')}</SelectItem>
                                    <SelectItem value="unpaid">{t('members.unpaid')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2 col-span-2 lg:col-span-6 justify-end mt-2">
                                <Select value={sortOption} onValueChange={setSortOption}>
                                    <SelectTrigger className="w-[180px]">
                                        <ArrowUpDown className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder={t('members.sortBy')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">{t('members.newestFirst')}</SelectItem>
                                        <SelectItem value="oldest">{t('members.oldestFirst')}</SelectItem>
                                        <SelectItem value="highest_outstanding">{t('members.highestDebt')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isOwner() && (
                                    <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('members.exportExcel')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Members Table */}
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-lg">{t('members.membersList')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>{t('members.member')}</TableHead>
                                    <TableHead>{t('plans.plan')}</TableHead>
                                    <TableHead>{t('members.payment')}</TableHead>
                                    <TableHead className="text-center rtl:text-center">{t('plans.insurance')}</TableHead>
                                    <TableHead>{t('common.status')}</TableHead>
                                    <TableHead>{t('members.startDate')}</TableHead>
                                    <TableHead>{t('members.endDate')}</TableHead>
                                    <TableHead className="text-center rtl:text-center">{t('warnings.title')}</TableHead>
                                    <TableHead className="text-right rtl:text-left">{t('common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMembers
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map(member => {
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
                                                    <Badge variant="outline" className="font-normal border-slate-200 dark:border-slate-700">
                                                        {plan?.name || t('members.noPlan')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {outstanding > 0 ? (
                                                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50/50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                                                            {outstanding} MAD {t('members.due')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                                            {t('members.paid')}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {insurancePaid ? (
                                                        <div className="flex justify-center" title={t('members.insurancePaid')}>
                                                            <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                <Shield className="h-3.5 w-3.5" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center" title={t('members.insuranceUnpaid')}>
                                                            <div className="p-1.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {status === 'active' ? (
                                                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                                            {t('members.activeMember')}
                                                        </Badge>
                                                    ) : status === 'expiring' ? (
                                                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                                                            {t('members.expiringSoon')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                                                            {t('members.expired')}
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
                                                                <DropdownMenuItem
                                                                    onClick={() => openWarningDialog(member)}
                                                                    className="text-amber-600 dark:text-amber-400 focus:text-amber-700 dark:focus:text-amber-300"
                                                                >
                                                                    <AlertTriangle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                                    {t('warnings.addWarning')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {isOwner() && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => openEditDialog(member)}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        {t('members.editMember')}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => openPaymentDialog(member)}
                                                                        disabled={outstanding <= 0 && member.insuranceStatus === 'active'}
                                                                        className={outstanding <= 0 && member.insuranceStatus === 'active' ? "opacity-50 cursor-not-allowed" : ""}
                                                                    >
                                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                                        {t('members.addPayment')}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => openDeleteDialog(member)}
                                                                        className="text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-950"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4 text-red-500 dark:text-red-400" />
                                                                        {t('common.delete')}
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

                    {/* Pagination */}
                    {filteredMembers.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                <span>{t('common.show')}</span>
                                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[65px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="15">15</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                                <span className="whitespace-nowrap">{t('common.ofCount', { count: filteredMembers.length })} {t('members.members')}</span>
                            </div>

                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>

                                    {(() => {
                                        const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
                                        const pages = [];

                                        if (totalPages <= 5) {
                                            for (let i = 1; i <= totalPages; i++) {
                                                pages.push(
                                                    <PaginationItem key={i}>
                                                        <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>
                                                            {i}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }
                                        } else {
                                            // Always show first page
                                            pages.push(
                                                <PaginationItem key={1}>
                                                    <PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}>
                                                        1
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );

                                            if (currentPage > 3) {
                                                pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
                                            }

                                            // Show pages around current
                                            const start = Math.max(2, currentPage - 1);
                                            const end = Math.min(totalPages - 1, currentPage + 1);

                                            for (let i = start; i <= end; i++) {
                                                pages.push(
                                                    <PaginationItem key={i}>
                                                        <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>
                                                            {i}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }

                                            if (currentPage < totalPages - 2) {
                                                pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
                                            }

                                            // Always show last page
                                            pages.push(
                                                <PaginationItem key={totalPages}>
                                                    <PaginationLink onClick={() => setCurrentPage(totalPages)} isActive={currentPage === totalPages}>
                                                        {totalPages}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        }

                                        return pages;
                                    })()}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredMembers.length / itemsPerPage), p + 1))}
                                            disabled={currentPage >= Math.ceil(filteredMembers.length / itemsPerPage)}
                                            className={currentPage >= Math.ceil(filteredMembers.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Member Dialog */}
            <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                <DialogContent className="max-w-lg w-full h-[100dvh] sm:h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle>Add New Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddMember} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                            {/* Section 1: Member Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">1</span>
                                    Member Information
                                </h3>
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

                            {/* Section 2: Plan & Payment */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">2</span>
                                    Plan & Payment
                                </h3>
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
                                <div className="flex items-center space-x-3 border p-3 rounded-lg bg-muted/20">
                                    <Checkbox checked={memberForm.includeInsurance} onCheckedChange={(c) => setMemberForm({ ...memberForm, includeInsurance: c })} />
                                    <Label className="flex-1">Include Insurance Fee (50 MAD)</Label>
                                    {memberForm.includeInsurance && (
                                        <Input className="w-20 h-8" value={memberForm.insuranceFee} onChange={(e) => setMemberForm({ ...memberForm, insuranceFee: e.target.value })} />
                                    )}
                                </div>
                                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                                    <Label>Payment Status</Label>
                                    <div className="flex items-center gap-2">
                                        <Label className={!memberForm.isFullyPaid ? "font-bold" : "text-muted-foreground"}>Partial</Label>
                                        <Switch checked={memberForm.isFullyPaid} onCheckedChange={(c) => setMemberForm({ ...memberForm, isFullyPaid: c })} />
                                        <Label className={memberForm.isFullyPaid ? "font-bold" : "text-muted-foreground"}>Full</Label>
                                    </div>
                                </div>
                                {!memberForm.isFullyPaid && (
                                    <div className="space-y-2">
                                        <Label>Amount Paid Now</Label>
                                        <Input type="number" value={memberForm.amountPaid} onChange={(e) => setMemberForm({ ...memberForm, amountPaid: e.target.value })} required />
                                    </div>
                                )}
                            </div>

                            {/* Section 3: CNI Document */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">3</span>
                                    CNI Document (Optional)
                                </h3>
                                <Separator />
                                {!cniFile ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="file" accept="image/*" className="hidden" id="add-member-gallery"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file && file.type.startsWith('image/')) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => { setRawImageSrc(reader.result); setShowCropDialog(true); };
                                                    reader.readAsDataURL(file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                        <input type="file" accept="image/*" capture="environment" className="hidden" id="add-member-camera"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => { setRawImageSrc(reader.result); setShowCropDialog(true); };
                                                    reader.readAsDataURL(file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                        <div onClick={() => document.getElementById('add-member-gallery').click()}
                                            className="cursor-pointer flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-all">
                                            <Upload className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm">Upload</span>
                                        </div>
                                        <div onClick={() => document.getElementById('add-member-camera').click()}
                                            className="cursor-pointer flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-all">
                                            <Camera className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm">Camera</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">CNI Document Ready</p>
                                            <p className="text-xs text-muted-foreground">{cniFile.name}</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setCniFile(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
                            <Button type="button" variant="outline" onClick={() => { setShowAddMemberDialog(false); setCniFile(null); }}>Cancel</Button>
                            <Button type="submit">Add Member</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Image Cropper for Add Member CNI */}
            <ImageCropper
                open={showCropDialog}
                onClose={() => {
                    setShowCropDialog(false);
                    setRawImageSrc(null);
                }}
                imageSrc={rawImageSrc}
                onCropComplete={(croppedFile) => {
                    setCniFile(croppedFile);
                    setShowCropDialog(false);
                    setRawImageSrc(null);
                }}
                aspectRatio={1.59}
            />

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

            {/* Add Warning Dialog */}
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
