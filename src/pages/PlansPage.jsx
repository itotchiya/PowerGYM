import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { DollarSign, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';

export function PlansPage() {
    const { userProfile } = useAuth();
    const { t } = useTranslation();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const [planForm, setPlanForm] = useState({
        name: '',
        price: '',
        months: '',
        days: '',
        description: '',
    });

    const fetchPlans = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            const plansQuery = query(collection(db, `gyms/${userProfile.gymId}/plans`));
            const plansSnapshot = await getDocs(plansQuery);
            const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(plansData);

        } catch (error) {
            console.error('Error fetching plans:', error);
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, [userProfile?.gymId]);

    const calculateTotalDays = (months, days) => {
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        return (m * 30) + d;
    };

    // Add Plan
    const handleAddPlan = async (e) => {
        e.preventDefault();
        if (!userProfile?.gymId) return;

        const totalDays = calculateTotalDays(planForm.months, planForm.days);

        if (totalDays <= 0) {
            toast.error('Duration must be greater than 0');
            return;
        }

        try {
            const newPlan = {
                name: planForm.name,
                price: Number(planForm.price),
                duration: totalDays,
                description: planForm.description,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, `gyms/${userProfile.gymId}/plans`), newPlan);

            toast.success('Plan added successfully');
            setShowAddDialog(false);
            setPlanForm({ name: '', price: '', months: '', days: '', description: '' });
            fetchPlans();
        } catch (error) {
            console.error('Error adding plan:', error);
            toast.error('Failed to add plan');
        }
    };

    // Edit Plan
    const handleEditPlan = async (e) => {
        e.preventDefault();
        if (!selectedPlan) return;

        const totalDays = calculateTotalDays(planForm.months, planForm.days);

        if (totalDays <= 0) {
            toast.error('Duration must be greater than 0');
            return;
        }

        try {
            const planRef = doc(db, `gyms/${userProfile.gymId}/plans`, selectedPlan.id);
            await updateDoc(planRef, {
                name: planForm.name,
                price: Number(planForm.price),
                duration: totalDays,
                description: planForm.description,
            });

            toast.success('Plan updated successfully');
            setShowEditDialog(false);
            setSelectedPlan(null);
            fetchPlans();
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Failed to update plan');
        }
    };

    // Delete Plan
    const handleDeletePlan = async () => {
        if (!selectedPlan) return;

        try {
            const planRef = doc(db, `gyms/${userProfile.gymId}/plans`, selectedPlan.id);
            await deleteDoc(planRef);

            toast.success('Plan deleted successfully');
            setShowDeleteDialog(false);
            setSelectedPlan(null);
            fetchPlans();
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error('Failed to delete plan');
        }
    };

    const openAddDialog = () => {
        setPlanForm({ name: '', price: '', months: '', days: '', description: '' });
        setShowAddDialog(true);
    };

    const openEditDialog = (plan) => {
        setSelectedPlan(plan);
        const months = Math.floor(plan.duration / 30);
        const days = plan.duration % 30;

        setPlanForm({
            name: plan.name,
            price: plan.price.toString(),
            months: months.toString(),
            days: days.toString(),
            description: plan.description || '',
        });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (plan) => {
        setSelectedPlan(plan);
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
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{t('plans.title')}</h2>
                            <p className="text-muted-foreground">
                                {t('plans.subtitle')}
                            </p>
                        </div>
                    </div>
                    <Button onClick={openAddDialog} size="lg">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('plans.addNewPlan')}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {plans.length} {t('plans.membershipPlans')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {plans.length === 0 ? (
                            <div className="text-center py-12">
                                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">{t('plans.noPlansFound')}</p>
                                <Button onClick={openAddDialog}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('plans.createFirstPlan')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('plans.planName')}</TableHead>
                                        <TableHead>{t('plans.price')}</TableHead>
                                        <TableHead>{t('plans.duration')}</TableHead>
                                        <TableHead>{t('plans.description')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plans.map(plan => (
                                        <TableRow key={plan.id}>
                                            <TableCell className="font-medium">{plan.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{plan.price} MAD</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {plan.duration} days
                                                <span className="text-muted-foreground text-xs ml-1">
                                                    ({Math.floor(plan.duration / 30)}m {plan.duration % 30 > 0 ? `+ ${plan.duration % 30}d` : ''})
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-md">
                                                {plan.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            {t('plans.editPlan')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openDeleteDialog(plan)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('common.delete')}
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

            {/* Add Plan Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('plans.addNewPlan')}</DialogTitle>
                        <DialogDescription>
                            {t('plans.createPlanDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPlan}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-name">{t('plans.planName')}</Label>
                                <Input
                                    id="add-name"
                                    placeholder="e.g., Monthly Membership"
                                    value={planForm.name}
                                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-price">{t('plans.price')} (MAD)</Label>
                                <Input
                                    id="add-price"
                                    type="number"
                                    placeholder="200"
                                    value={planForm.price}
                                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-months">{t('plans.months')}</Label>
                                    <Input
                                        id="add-months"
                                        type="number"
                                        min="0"
                                        placeholder="1"
                                        value={planForm.months}
                                        onChange={(e) => setPlanForm({ ...planForm, months: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-days">{t('plans.extraDays')}</Label>
                                    <Input
                                        id="add-days"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={planForm.days}
                                        onChange={(e) => setPlanForm({ ...planForm, days: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-description">{t('plans.description')}</Label>
                                <Input
                                    id="add-description"
                                    placeholder="Brief description of the plan"
                                    value={planForm.description}
                                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('plans.addPlan')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Plan Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('plans.editPlan')}</DialogTitle>
                        <DialogDescription>
                            {t('plans.updatePlanDetails')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditPlan}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t('plans.planName')}</Label>
                                <Input
                                    id="edit-name"
                                    value={planForm.name}
                                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">{t('plans.price')} (MAD)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={planForm.price}
                                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-months">{t('plans.months')}</Label>
                                    <Input
                                        id="edit-months"
                                        type="number"
                                        min="0"
                                        value={planForm.months}
                                        onChange={(e) => setPlanForm({ ...planForm, months: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-days">{t('plans.extraDays')}</Label>
                                    <Input
                                        id="edit-days"
                                        type="number"
                                        min="0"
                                        value={planForm.days}
                                        onChange={(e) => setPlanForm({ ...planForm, days: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">{t('plans.description')}</Label>
                                <Input
                                    id="edit-description"
                                    value={planForm.description}
                                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('plans.saveChanges')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Plan Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('plans.deletePlan')}</DialogTitle>
                        <DialogDescription>
                            {t('plans.confirmDeletePlan')} "{selectedPlan?.name}"?
                            {t('plans.cannotBeUndone')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeletePlan}>
                            {t('plans.deletePlan')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
