import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GymRequestsSkeleton } from '@/components/skeletons/PageSkeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Building2, Clock, CheckCircle, XCircle, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';

export function GymRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'gymRequests'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            setRequests(requestsData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load requests');
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (request) => {
        try {
            await updateDoc(doc(db, 'gymRequests', request.id), {
                status: 'approved',
                approvedAt: new Date()
            });
            toast.success(`Approved request from ${request.ownerName}`);
            setShowDetailsDialog(false);
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        }
    };

    const handleReject = async (request) => {
        try {
            await updateDoc(doc(db, 'gymRequests', request.id), {
                status: 'rejected',
                rejectedAt: new Date()
            });
            toast.success(`Rejected request from ${request.ownerName}`);
            setShowDetailsDialog(false);
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
        }
    };

    const handleDelete = async (request) => {
        try {
            await deleteDoc(doc(db, 'gymRequests', request.id));
            toast.success('Request deleted');
            setShowDetailsDialog(false);
        } catch (error) {
            console.error('Error deleting request:', error);
            toast.error('Failed to delete request');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500">Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="secondary">Pending</Badge>;
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Building2 className="h-8 w-8" />
                            Gym Requests
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage gym owner registration requests
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <Badge variant="destructive" className="text-lg px-4 py-2">
                            {pendingCount} Pending
                        </Badge>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Requests</CardTitle>
                        <CardDescription>
                            Review and manage gym owner applications
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <GymRequestsSkeleton />
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No gym requests yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Gym Name</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">
                                                {request.gymName}
                                            </TableCell>
                                            <TableCell>{request.ownerName}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{request.email}</div>
                                                    <div className="text-muted-foreground">{request.phone}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {request.createdAt?.toLocaleDateString() || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(request.status)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowDetailsDialog(true);
                                                    }}
                                                >
                                                    View Details
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

            {/* Request Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>
                            Review the gym registration application
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Gym Name</p>
                                    <p className="font-medium">{selectedRequest.gymName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Owner Name</p>
                                    <p className="font-medium">{selectedRequest.ownerName}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${selectedRequest.email}`} className="text-primary hover:underline">
                                        {selectedRequest.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${selectedRequest.phone}`} className="text-primary hover:underline">
                                        {selectedRequest.phone}
                                    </a>
                                </div>
                                {selectedRequest.gymAddress && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedRequest.gymAddress}</span>
                                    </div>
                                )}
                            </div>

                            {selectedRequest.message && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <MessageSquare className="h-4 w-4" />
                                        Message
                                    </div>
                                    <p className="text-sm">{selectedRequest.message}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                Submitted: {selectedRequest.createdAt?.toLocaleString() || 'N/A'}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                {getStatusBadge(selectedRequest.status)}
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        {selectedRequest?.status === 'pending' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleReject(selectedRequest)}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => handleApprove(selectedRequest)}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                </Button>
                            </>
                        )}
                        {selectedRequest?.status !== 'pending' && (
                            <Button
                                variant="destructive"
                                onClick={() => handleDelete(selectedRequest)}
                            >
                                Delete Request
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
