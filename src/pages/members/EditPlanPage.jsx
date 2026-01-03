import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, CreditCard, Shield, User } from 'lucide-react';

const INSURANCE_FEE = 50;

export function EditPlanPage() {
    const navigate = useNavigate();
    const { memberId } = useParams();
    const { userProfile, isOwner } = useAuth();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [member, setMember] = useState(null);
    const [plans, setPlans] = useState([]);

    const [formData, setFormData] = useState({
        planId: '',
        startDate: new Date().toISOString().split('T')[0],
        isFullyPaid: true,
        amountPaid: '',
        includeInsurance: false
    });

    // Fetch member and plans data
    useEffect(() => {
        const fetchData = async () => {
            if (!userProfile?.gymId || !memberId) return;

            try {
                setLoading(true);

                // Fetch member
                const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
                const memberSnap = await getDoc(memberRef);
                if (memberSnap.exists()) {
                    const memberData = { id: memberSnap.id, ...memberSnap.data() };
                    setMember(memberData);

                    // Initialize form with current plan data
                    if (memberData.currentSubscription) {
                        setFormData(prev => ({
                            ...prev,
                            planId: memberData.currentSubscription.planId || '',
                            startDate: memberData.currentSubscription.startDate
                                ? new Date(memberData.currentSubscription.startDate).toISOString().split('T')[0]
                                : new Date().toISOString().split('T')[0]
                        }));
                    }
                } else {
                    toast.error('Member not found');
                    navigate('/members');
                    return;
                }

                // Fetch plans
                const plansQuery = query(collection(db, `gyms/${userProfile.gymId}/plans`));
                const plansSnapshot = await getDocs(plansQuery);
                const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPlans(plansData);

            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userProfile?.gymId, memberId, navigate]);

    // Check if user has permission
    useEffect(() => {
        if (!loading && !isOwner()) {
            toast.error('Owner access required');
            navigate('/members');
        }
    }, [loading, isOwner, navigate]);

    const isInsuranceValid = () => {
        if (!member?.insuranceExpiryDate) return false;
        const expiryDate = new Date(member.insuranceExpiryDate);
        return expiryDate > new Date();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!member || !userProfile?.gymId) return;

        try {
            setSubmitting(true);

            const selectedPlan = plans.find(p => p.id === formData.planId);
            if (!selectedPlan) {
                toast.error('Please select a plan');
                return;
            }

            const subStartDate = new Date(formData.startDate);
            const durationDays = selectedPlan.duration;
            const endDate = new Date(subStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            const planPrice = Number(selectedPlan.price);
            const insuranceNeeded = formData.includeInsurance && !isInsuranceValid();
            const insuranceFee = insuranceNeeded ? INSURANCE_FEE : 0;
            const totalPrice = planPrice + insuranceFee;

            let finalAmountPaid = 0;
            if (formData.isFullyPaid) {
                finalAmountPaid = totalPrice;
            } else {
                finalAmountPaid = Number(formData.amountPaid) || 0;
            }

            const subOutstandingBalance = totalPrice - finalAmountPaid;

            const newSubscription = {
                planId: selectedPlan.id,
                planName: selectedPlan.name,
                startDate: subStartDate.toISOString(),
                endDate: endDate.toISOString(),
                price: planPrice,
                status: 'active'
            };

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);

            const history = member.subscriptionHistory || [];
            const newHistory = [...history, { ...newSubscription, createdAt: new Date().toISOString() }];

            const updateData = {
                currentSubscription: newSubscription,
                subscriptionHistory: newHistory,
                totalPaid: (member.totalPaid || 0) + finalAmountPaid,
                outstandingBalance: (member.outstandingBalance || 0) + subOutstandingBalance,
                updatedAt: serverTimestamp()
            };

            // Update insurance if paid
            if (insuranceNeeded) {
                const newExpiryDate = new Date(subStartDate);
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                updateData.insuranceExpiryDate = newExpiryDate.toISOString();
                updateData.insuranceStatus = 'active';
                updateData.insuranceFee = insuranceFee;
            }

            // Record payment
            if (finalAmountPaid > 0) {
                const newPayments = [...(member.payments || [])];
                newPayments.push({
                    amount: finalAmountPaid,
                    date: new Date().toISOString(),
                    type: 'PLAN_CHANGE',
                    note: `Plan changed to: ${selectedPlan.name}${insuranceNeeded ? ' + Insurance' : ''}`
                });
                updateData.payments = newPayments;
            }

            await updateDoc(memberRef, updateData);

            toast.success('Plan updated successfully');
            navigate(`/members/${memberId}`);
        } catch (error) {
            console.error("Error updating plan", error);
            toast.error("Failed to update plan");
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate totals for display
    const selectedPlan = plans.find(p => p.id === formData.planId);
    const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
    const insuranceNeeded = formData.includeInsurance && !isInsuranceValid();
    const insuranceFee = insuranceNeeded ? INSURANCE_FEE : 0;
    const totalPrice = planPrice + insuranceFee;
    const amountPaying = formData.isFullyPaid ? totalPrice : Number(formData.amountPaid) || 0;
    const remaining = Math.max(0, totalPrice - amountPaying);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/members/${memberId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{t('members.editPlan')}</h1>
                        <p className="text-muted-foreground">
                            {member?.firstName} {member?.lastName} (#{member?.memberId})
                        </p>
                    </div>
                </div>

                {/* Current Plan Info */}
                <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4" />
                            {t('members.currentPlan')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">{t('plans.plan')}</p>
                                <p className="font-semibold">{member?.currentSubscription?.planName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('members.expiryDate')}</p>
                                <p className="font-semibold">
                                    {member?.currentSubscription?.endDate
                                        ? new Date(member.currentSubscription.endDate).toLocaleDateString()
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('members.outstanding')}</p>
                                <p className={`font-semibold ${(member?.outstandingBalance || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {member?.outstandingBalance || 0} MAD
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('members.insuranceStatus')}</p>
                                <Badge className={isInsuranceValid() ? 'bg-emerald-500' : 'bg-amber-500'}>
                                    {isInsuranceValid() ? t('members.active') : t('members.unpaid')}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        {/* Plan Selection Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    {t('members.newPlanPrice')}
                                </CardTitle>
                                <CardDescription>{t('members.editPlanDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="plan">{t('plans.plan')} *</Label>
                                    <Select
                                        value={formData.planId}
                                        onValueChange={(v) => setFormData({ ...formData, planId: v })}
                                        required
                                    >
                                        <SelectTrigger id="plan">
                                            <SelectValue placeholder={t('members.selectPlan')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} ({p.duration} {t('time.days')}) - {p.price} MAD
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="startDate">{t('members.startDate')} *</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('members.paymentInfo')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Payment Mode Toggle */}
                                <div
                                    onClick={() => setFormData({ ...formData, isFullyPaid: !formData.isFullyPaid })}
                                    className="cursor-pointer p-4 rounded-lg border transition-all hover:bg-muted/60 dark:hover:bg-muted/20 bg-muted/40 dark:bg-muted/10"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="cursor-pointer text-base">{t('members.fullyPaid')}</Label>
                                            <p className="text-sm text-muted-foreground">
                                                {formData.isFullyPaid ? t('plans.fullPayment') : t('plans.partialPayment')}
                                            </p>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={formData.isFullyPaid}
                                                onCheckedChange={(checked) => setFormData({ ...formData, isFullyPaid: checked })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Paid Input (if partial) */}
                                {!formData.isFullyPaid && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label htmlFor="amountPaid">{t('plans.amountPaid')} (MAD) *</Label>
                                        <Input
                                            id="amountPaid"
                                            type="number"
                                            min="0"
                                            value={formData.amountPaid}
                                            onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                                            placeholder="Enter amount paid"
                                            required
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Insurance Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    {t('plans.insurance')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${isInsuranceValid() ? 'opacity-70 bg-muted' : 'cursor-pointer hover:bg-muted/60 bg-muted/40'}`}
                                    onClick={() => !isInsuranceValid() && setFormData({ ...formData, includeInsurance: !formData.includeInsurance })}
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="includeInsurance"
                                            checked={isInsuranceValid() || formData.includeInsurance}
                                            disabled={isInsuranceValid()}
                                            onCheckedChange={(checked) => setFormData({ ...formData, includeInsurance: checked })}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div>
                                            <Label htmlFor="includeInsurance" className={isInsuranceValid() ? "" : "cursor-pointer"}>
                                                {t('plans.includeInsurance')}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {isInsuranceValid()
                                                    ? `${t('members.insuranceValidUntil')} ${new Date(member.insuranceExpiryDate).toLocaleDateString()}`
                                                    : `${INSURANCE_FEE} MAD`}
                                            </p>
                                        </div>
                                    </div>
                                    {isInsuranceValid() && (
                                        <Badge className="bg-emerald-500 text-white">{t('members.active')}</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary Card */}
                        {formData.planId && (
                            <Card className="border-primary/30 bg-primary/5">
                                <CardHeader>
                                    <CardTitle>{t('plans.totalAmount')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('members.newPlanPrice')}:</span>
                                        <span className="font-medium">{planPrice} MAD</span>
                                    </div>
                                    {insuranceNeeded && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('plans.insurance')}:</span>
                                            <span className="font-medium">{INSURANCE_FEE} MAD</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                        <span>{t('plans.totalAmount')}:</span>
                                        <span className="text-primary">{totalPrice} MAD</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2">
                                        <span className="text-muted-foreground">{t('members.amountPaying')}:</span>
                                        <span className="font-medium text-green-600">{amountPaying} MAD</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('members.debtAfterPayment')}:</span>
                                        <span className={`font-medium ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                            {remaining} MAD
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/members/${memberId}`)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={!formData.planId || submitting}
                            >
                                {submitting ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
