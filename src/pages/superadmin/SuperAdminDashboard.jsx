import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Building2, Plus, Edit, Ban, TrendingUp, Users, DollarSign } from 'lucide-react';

export function SuperAdminDashboard() {
    const [gyms, setGyms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedGym, setSelectedGym] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        insuranceFee: 100,
        ownerId: '',
    });

    // Fetch gyms from Firestore
    const fetchGyms = async () => {
        try {
            setLoading(true);
            const gymsQuery = query(collection(db, 'gyms'));
            const querySnapshot = await getDocs(gymsQuery);

            const gymsData = [];
            querySnapshot.forEach((doc) => {
                gymsData.push({ id: doc.id, ...doc.data() });
            });

            setGyms(gymsData);
        } catch (error) {
            console.error('Error fetching gyms:', error);
            toast.error('Failed to load gyms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGyms();
    }, []);

    // Calculate KPIs
    const totalGyms = gyms.length;
    const activeGyms = gyms.filter(g => g.status === 'active').length;
    const totalRevenue = 0; // Will be calculated from members in later phases
    const expectedRevenue = 0; // Will be calculated from active subscriptions

    // Add gym
    const handleAddGym = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'gyms'), {
                ...formData,
                status: 'active',
                createdAt: serverTimestamp(),
            });

            toast.success('Gym added successfully');
            setShowAddDialog(false);
            setFormData({ name: '', city: '', insuranceFee: 100, ownerId: '' });
            fetchGyms();
        } catch (error) {
            console.error('Error adding gym:', error);
            toast.error('Failed to add gym');
        }
    };

    // Edit gym
    const handleEditGym = async (e) => {
        e.preventDefault();
        try {
            const gymRef = doc(db, 'gyms', selectedGym.id);
            await updateDoc(gymRef, formData);

            toast.success('Gym updated successfully');
            setShowEditDialog(false);
            setSelectedGym(null);
            fetchGyms();
        } catch (error) {
            console.error('Error updating gym:', error);
            toast.error('Failed to update gym');
        }
    };

    // Toggle gym status
    const handleToggleStatus = async (gym) => {
        try {
            const gymRef = doc(db, 'gyms', gym.id);
            const newStatus = gym.status === 'active' ? 'inactive' : 'active';

            await updateDoc(gymRef, { status: newStatus });

            toast.success(`Gym ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            fetchGyms();
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error('Failed to update gym status');
        }
    };

    const openEditDialog = (gym) => {
        setSelectedGym(gym);
        setFormData({
            name: gym.name,
            city: gym.city,
            insuranceFee: gym.insuranceFee,
            ownerId: gym.ownerId || '',
        });
        setShowEditDialog(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
                        <p className="text-muted-foreground">
                            Platform-wide overview and gym management
                        </p>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Gym
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Gyms</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalGyms}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeGyms} active locations
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">
                                Across all gyms
                            </p>
                        </CardContent>
                    </Card>

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
                                Potential earnings
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Gyms Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gyms Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <DashboardSkeleton />
                        ) : gyms.length === 0 ? (
                            <p className="text-muted-foreground">No gyms added yet. Click "Add Gym" to get started.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Insurance Fee</TableHead>
                                        <TableHead>Owner ID</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gyms.map((gym) => (
                                        <TableRow key={gym.id}>
                                            <TableCell className="font-medium">{gym.name}</TableCell>
                                            <TableCell>{gym.city}</TableCell>
                                            <TableCell>
                                                <Badge variant={gym.status === 'active' ? 'default' : 'secondary'}>
                                                    {gym.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{gym.insuranceFee} MAD</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {gym.ownerId || 'Not assigned'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(gym)}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant={gym.status === 'active' ? 'destructive' : 'default'}
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(gym)}
                                                    >
                                                        <Ban className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Gym Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Gym</DialogTitle>
                        <DialogDescription>
                            Create a new gym location in the system
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddGym}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Gym Name</Label>
                                <Input
                                    id="name"
                                    placeholder="PowerGYM Downtown"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Casablanca"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="insuranceFee">Insurance Fee (MAD)</Label>
                                <Input
                                    id="insuranceFee"
                                    type="number"
                                    value={formData.insuranceFee}
                                    onChange={(e) => setFormData({ ...formData, insuranceFee: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ownerId">Owner User ID (Optional)</Label>
                                <Input
                                    id="ownerId"
                                    placeholder="Firebase Auth UID"
                                    value={formData.ownerId}
                                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Add Gym</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Gym Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Gym</DialogTitle>
                        <DialogDescription>
                            Update gym information
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditGym}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Gym Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-city">City</Label>
                                <Input
                                    id="edit-city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-insuranceFee">Insurance Fee (MAD)</Label>
                                <Input
                                    id="edit-insuranceFee"
                                    type="number"
                                    value={formData.insuranceFee}
                                    onChange={(e) => setFormData({ ...formData, insuranceFee: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ownerId">Owner User ID</Label>
                                <Input
                                    id="edit-ownerId"
                                    value={formData.ownerId}
                                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
