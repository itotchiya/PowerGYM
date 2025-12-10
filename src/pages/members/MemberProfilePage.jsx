import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    AlertTriangle,
    Upload,
    Camera,
    Edit,
    Check,
    X,
    Plus,
    History,
    CreditCard,
    ShieldCheck,
    Wallet,
    Shield,
    FileText,
    Download
} from 'lucide-react';
import { generateMemberFichePDF, generateSubscriptionPDF } from '@/utils/generatePDF';

export function MemberProfilePage() {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const { userProfile, isOwner, isManager } = useAuth();

    const [member, setMember] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
    const [showEditCNIDialog, setShowEditCNIDialog] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Subscription Form
    const [subForm, setSubForm] = useState({
        planId: '',
        startDate: new Date().toISOString().split('T')[0]
    });

    // CNI Edit Form
    const [cniIdForm, setCniIdForm] = useState('');

    const fetchMemberData = async () => {
        try {
            setLoading(true);

            if (!userProfile?.gymId) return;

            const memberDoc = await getDoc(doc(db, `gyms/${userProfile.gymId}/members`, memberId));
            if (memberDoc.exists()) {
                setMember({ id: memberDoc.id, ...memberDoc.data() });
            } else {
                toast.error('Member not found');
                navigate('/members');
                return;
            }

            const plansQuery = query(collection(db, `gyms/${userProfile.gymId}/plans`));
            const plansSnapshot = await getDocs(plansQuery);
            const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(plansData);

        } catch (error) {
            console.error('Error fetching member:', error);
            toast.error('Failed to load member data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMemberData();
    }, [memberId, userProfile?.gymId]);

    const getMemberStatus = () => {
        if (!member?.currentSubscription?.endDate) return 'expired';
        const endDate = new Date(member.currentSubscription.endDate);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return 'expired';
        if (daysLeft <= 7) return 'expiring';
        return 'active';
    };

    const handleCNIUpload = async () => {
        if (!uploadFile) {
            toast.error('Please select a file');
            return;
        }

        try {
            setUploading(true);
            console.log("Starting upload...", uploadFile.name, uploadFile.size);

            if (!userProfile?.gymId) throw new Error("Missing gym ID");

            // Filename Logic: MEMBERID-FIRSTNAME-LASTNAME-CNI
            const fileExtension = uploadFile.name.split('.').pop();
            const safeFirstName = (member.firstName || 'Unknown').replace(/[^a-z0-9]/gi, '');
            const safeLastName = (member.lastName || 'Unknown').replace(/[^a-z0-9]/gi, '');
            const safeCNI = (member.cniId || 'empty').replace(/[^a-z0-9]/gi, '');

            const newFilename = `${safeFirstName}-${safeLastName}-${safeCNI}-${memberId}.${fileExtension}`;
            const storagePath = `gyms/${userProfile.gymId}/members/${memberId}/${newFilename}`;
            console.log("Upload path:", storagePath);

            // Compress Image
            console.log("Original size:", uploadFile.size / 1024 / 1024, "MB");
            const options = {
                maxSizeMB: 0.8,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };

            let fileToUpload = uploadFile;
            try {
                if (uploadFile.type.startsWith('image/')) {
                    const compressedFile = await imageCompression(uploadFile, options);
                    console.log("Compressed size:", compressedFile.size / 1024 / 1024, "MB");
                    fileToUpload = compressedFile;
                }
            } catch (error) {
                console.error("Compression failed, uploading original:", error);
            }

            const storageRef = ref(storage, storagePath);

            const snapshot = await uploadBytes(storageRef, fileToUpload);
            console.log("Upload snapshot:", snapshot);

            const downloadURL = await getDownloadURL(storageRef);
            console.log("Download URL:", downloadURL);

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, { cniDocumentUrl: downloadURL });

            toast.success('CNI document uploaded successfully');
            setShowUploadDialog(false);
            setUploadFile(null);
            fetchMemberData();
        } catch (error) {
            console.error('Error uploading CNI full detail:', error);
            if (error.code === 'storage/unauthorized') {
                toast.error('Permission denied: You cannot upload files here.');
            } else if (error.code === 'storage/canceled') {
                toast.error('Upload canceled');
            } else if (error.code === 'storage/unknown') {
                toast.error('Unknown error occurred, check console.');
            } else {
                toast.error(`Upload failed: ${error.message}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteCNI = async () => {
        if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) return;

        try {
            setUploading(true);

            if (member.cniDocumentUrl) {
                try {
                    const fileRef = ref(storage, member.cniDocumentUrl);
                    await deleteObject(fileRef);
                } catch (err) {
                    console.warn("Could not delete file from storage (might be external link or already gone)", err);
                }
            }

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, { cniDocumentUrl: null });

            toast.success('Document deleted');
            fetchMemberData();
        } catch (error) {
            console.error("Error deleting CNI:", error);
            toast.error("Failed to delete document");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateCNIId = async (e) => {
        e.preventDefault();
        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, { cniId: cniIdForm });
            toast.success('CNI ID updated');
            setShowEditCNIDialog(false);
            fetchMemberData();
        } catch (error) {
            toast.error('Failed to update CNI ID');
        }
    };

    const handleAddSubscription = async (e) => {
        e.preventDefault();
        try {
            const selectedPlan = plans.find(p => p.id === subForm.planId);
            if (!selectedPlan) return;

            const startDate = new Date(subForm.startDate);
            const durationDays = selectedPlan.duration;
            const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            const newSubscription = {
                planId: selectedPlan.id,
                planName: selectedPlan.name,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                price: Number(selectedPlan.price),
                status: 'active'
            };

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);

            const history = member.subscriptionHistory || [];
            const newHistory = [...history, { ...newSubscription, createdAt: new Date().toISOString() }];

            await updateDoc(memberRef, {
                currentSubscription: newSubscription,
                subscriptionHistory: newHistory,
                outstandingBalance: (member.outstandingBalance || 0) + Number(selectedPlan.price)
            });

            toast.success('Subscription added');
            setShowSubscriptionDialog(false);
            fetchMemberData();
        } catch (error) {
            console.error("Error adding subscription", error);
            toast.error("Failed to add subscription");
        }
    };

    const handleCameraCapture = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
        }
    };

    const openEditCNIDialog = () => {
        setCniIdForm(member.cniId || '');
        setShowEditCNIDialog(true);
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

    if (!member) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Member not found</p>
                </div>
            </DashboardLayout>
        );
    }

    const status = getMemberStatus();
    const currentPlan = plans.find(p => p.id === member.currentSubscription?.planId);

    // Calculate totals
    const totalInsurancePaid = member.payments?.filter(p => p.note && p.note.toLowerCase().includes('insurance')).reduce((sum, p) => sum + 50, 0) || (member.insuranceStatus === 'active' ? member.insuranceFee || 50 : 0);
    // Note: The above logic for totalInsurancePaid is a bit heuristic based on notes/status. A precise field is better if available.
    // If we rely on payments array: 
    // const totalPaid = member.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || member.totalPaid || 0; 

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Members
                    </Button>
                    {isOwner() && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateMemberFichePDF(member, userProfile?.gymName)}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Fiche Technique
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Member Profile Details */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium">Member Profile</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                    <p className="text-xl font-bold">{member.firstName} {member.lastName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3" />
                                            <span>{member.phone}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{member.email || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">CNI ID</p>
                                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                                        <span className="font-mono font-medium">{member.cniId || 'Not Set'}</span>
                                        {isOwner() && (
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={openEditCNIDialog}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Overview */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium">Financial Overview</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Current Plan</p>
                                        <p className="font-semibold">{currentPlan?.name || 'N/A'}</p>
                                    </div>
                                    {status === 'active' ? (
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-3 py-1 text-sm">
                                            Active Member
                                        </Badge>
                                    ) : status === 'expiring' ? (
                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 px-3 py-1 text-sm">
                                            Expiring Soon
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="px-3 py-1 text-sm">
                                            Expired
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Paid (Lifetime)</p>
                                        <p className="font-bold text-green-600 text-lg">{member.totalPaid || 0} MAD</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Outstanding Debt</p>
                                        <div className="flex items-center gap-1">
                                            <p className={`font-bold text-lg ${member.outstandingBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {member.outstandingBalance || 0} MAD
                                            </p>
                                            {(member.outstandingBalance || 0) > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Insurance Status</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {member.insuranceStatus === 'active' ? (
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                                                    <Shield className="h-4 w-4" /> Paid
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium animate-pulse">
                                                    <ShieldAlert className="h-4 w-4" /> Unpaid
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Insurance Paid</p>
                                        {/* Assuming 50 per year/activation? Just showing total logic for now */}
                                        <p className="font-medium">{totalInsurancePaid > 0 ? `${totalInsurancePaid} MAD` : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CNI Document Section (Separate Large Section) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <CardTitle>Member CNI Document</CardTitle>
                        </div>
                        {(isOwner() || isManager()) && member.cniDocumentUrl ? (
                            <div className="flex gap-2">
                                <Button variant="destructive" size="sm" onClick={handleDeleteCNI} disabled={uploading}>
                                    <X className="h-4 w-4 mr-1" /> Delete
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                                    <Upload className="mr-2 h-4 w-4" /> Update
                                </Button>
                            </div>
                        ) : (isOwner() || isManager()) && (
                            <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                                <Upload className="mr-2 h-4 w-4" /> Upload Document
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {member.cniDocumentUrl ? (
                            <div className="space-y-4">
                                {/* Clean Preview Container */}
                                <div className="rounded-xl border bg-muted/5 p-2 md:p-6 flex flex-col items-center justify-center">
                                    <img
                                        src={member.cniDocumentUrl}
                                        alt="CNI Document"
                                        className="max-h-[50vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            // Fallback handled by the layout itself if image missing
                                        }}
                                    />
                                    <div className="mt-4 flex flex-col md:flex-row gap-3 w-full max-w-md">
                                        <Button className="w-full flex-1" variant="secondary" onClick={() => window.open(member.cniDocumentUrl, '_blank')}>
                                            <FileText className="mr-2 h-4 w-4" /> View Full Document
                                        </Button>

                                        {isOwner() && (
                                            <Button className="w-full md:w-auto" variant="outline" onClick={async () => {
                                                try {
                                                    const response = await fetch(member.cniDocumentUrl);
                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    // Force the name: MEMBERID-FIRSTNAME-LASTNAME-CNI
                                                    const safeFirstName = (member.firstName || 'Unknown');
                                                    const safeLastName = (member.lastName || 'Unknown');
                                                    const safeCNI = (member.cniId || 'CNI');
                                                    link.download = `${safeFirstName}-${safeLastName}-${safeCNI}-${member.id}`;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                    window.URL.revokeObjectURL(url);
                                                } catch (err) {
                                                    console.error("Download failed:", err);
                                                    // Fallback
                                                    window.open(member.cniDocumentUrl, '_blank');
                                                }
                                            }}>
                                                <Upload className="mr-2 h-4 w-4 rotate-180" /> Download
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                                <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">No CNI document uploaded</p>
                                <p className="text-sm opacity-70 mb-6">Upload a clear photo or scan of the member's ID card.</p>
                                {isOwner() && <Button onClick={() => setShowUploadDialog(true)}>Upload Now</Button>}
                            </div>
                        )}
                    </CardContent>
                </Card>


                {/* Subscription History */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Subscription History</CardTitle>
                            <CardDescription>Manage member subscriptions</CardDescription>
                        </div>
                        {isOwner() && (
                            <Button onClick={() => setShowSubscriptionDialog(true)} size="sm">
                                <Plus className="mr-2 h-4 w-4" /> Add Subscription
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Price</TableHead>
                                    {isOwner() && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {member.subscriptionHistory?.slice().reverse().map((sub, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{sub.planName || 'Unknown'}</TableCell>
                                        <TableCell>{new Date(sub.startDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(sub.endDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {Math.ceil((new Date(sub.endDate) - new Date(sub.startDate)) / (1000 * 60 * 60 * 24))} days
                                        </TableCell>
                                        <TableCell>{sub.price} MAD</TableCell>
                                        {isOwner() && (
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => generateSubscriptionPDF(member, sub, userProfile?.gymName)}
                                                    title="Download Subscription PDF"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {(!member.subscriptionHistory || member.subscriptionHistory.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={isOwner() ? 6 : 5} className="text-center text-muted-foreground">No subscription history</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {member.payments?.slice().reverse().map((payment, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(payment.date).toLocaleDateString()}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleTimeString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-xs">
                                                {payment.type?.replace('_', ' ') || 'Payment'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-green-600">
                                            +{payment.amount} MAD
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{payment.note || '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {(!member.payments || member.payments.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">No payments recorded</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Warnings List */}
                {(member.warnings?.length || 0) > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Warnings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {member.warnings.map((warning, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/10">
                                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-destructive">{warning.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(warning.dateTime || warning.date).toLocaleDateString()} {new Date(warning.dateTime || warning.date).toLocaleTimeString()} - Added by {warning.addedBy}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Add Subscription Dialog */}
            <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Subscription</DialogTitle>
                        <DialogDescription>Add a new subscription plan to this member.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSubscription}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <Select value={subForm.planId} onValueChange={(v) => setSubForm({ ...subForm, planId: v })} required>
                                    <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                                    <SelectContent>
                                        {plans.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.duration} days) - {p.price} MAD</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={subForm.startDate} onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })} required />
                            </div>
                            <div className="bg-muted p-3 rounded text-xs text-muted-foreground">
                                <p>This will update the member's current plan and add the price to their outstanding balance.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowSubscriptionDialog(false)}>Cancel</Button>
                            <Button type="submit">Add Subscription</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit CNI ID Dialog */}
            <Dialog open={showEditCNIDialog} onOpenChange={setShowEditCNIDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit CNI ID</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateCNIId}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>CNI ID Number</Label>
                                <Input value={cniIdForm} onChange={(e) => setCniIdForm(e.target.value)} placeholder="AB123456" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowEditCNIDialog(false)}>Cancel</Button>
                            <Button type="submit">Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>


            {/* CNI Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={(open) => {
                setShowUploadDialog(open);
                if (!open) setUploadFile(null); // Reset on close
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload CNI Document</DialogTitle>
                        <DialogDescription>
                            Select a method to upload the member's ID card
                        </DialogDescription>
                    </DialogHeader>

                    {!uploadFile ? (
                        <div className="grid grid-cols-2 gap-4 py-4">
                            {/* Hidden Inputs */}
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                id="gallery-upload"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                                }}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                id="camera-upload"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                                }}
                            />

                            {/* Cards */}
                            <div
                                onClick={() => document.getElementById('gallery-upload').click()}
                                className="cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center h-40"
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <span className="font-medium">Upload from Gallery</span>
                            </div>

                            <div
                                onClick={() => document.getElementById('camera-upload').click()}
                                className="cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center h-40"
                            >
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                    <Camera className="h-6 w-6" />
                                </div>
                                <span className="font-medium">Take Picture</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="relative rounded-lg overflow-hidden border bg-muted/20 flex flex-col items-center justify-center p-4">
                                {uploadFile.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(uploadFile)}
                                        alt="Preview"
                                        className="max-h-[250px] object-contain rounded-md"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                                        <FileText className="h-12 w-12 mb-2" />
                                        <p>{uploadFile.name}</p>
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 rounded-full h-8 w-8 p-0 bg-background/80 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setUploadFile(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-center text-sm text-muted-foreground">
                                Ready to upload <span className="font-semibold text-foreground">{uploadFile.name}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleCNIUpload}
                            disabled={!uploadFile || uploading}
                            className="min-w-[100px]"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Uploading...
                                </>
                            ) : (
                                'Confirm Upload'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
