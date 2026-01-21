import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProfileSkeleton } from '@/components/skeletons/PageSkeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
    ShieldAlert,
    Wallet,
    Shield,
    FileText,
    Download,
    Banknote,
    Pencil,
    Trash2,
    RotateCcw
} from 'lucide-react';
import { generateMemberFichePDF, generateSubscriptionPDF } from '@/utils/generatePDF';
import { ImageCropper } from '@/components/ui/image-cropper';

export function MemberProfilePage() {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { userProfile, isOwner, isManager } = useAuth();

    const [member, setMember] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
    const [showEditCNIDialog, setShowEditCNIDialog] = useState(false);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Subscription Form
    const [subForm, setSubForm] = useState({
        planId: '',
        startDate: new Date().toISOString().split('T')[0],
        isFullyPaid: true,
        amountPaid: '',
        includeInsurance: false
    });

    // CNI Edit Form
    const [cniIdForm, setCniIdForm] = useState('');

    // Edit Member Dialog
    const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
    const [editMemberForm, setEditMemberForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        cniId: ''
    });

    // Add Payment Dialog
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        payFullAmount: true,
        amount: 0,
        includeInsurance: false
    });

    // Avatar Upload States
    const [showAvatarUploadDialog, setShowAvatarUploadDialog] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [showAvatarCropDialog, setShowAvatarCropDialog] = useState(false);
    const [rawAvatarSrc, setRawAvatarSrc] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Delete Subscription Dialog States
    const [showDeleteSubscriptionDialog, setShowDeleteSubscriptionDialog] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingSubscription, setDeletingSubscription] = useState(false);

    // Restore Subscription State
    const [restoringSubscription, setRestoringSubscription] = useState(false);

    const INSURANCE_FEE = 50; // Fixed insurance fee


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

    const isInsuranceValid = () => {
        if (!member?.insuranceExpiryDate) return false;
        const expiryDate = new Date(member.insuranceExpiryDate);
        return expiryDate > new Date();
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
            if (!selectedPlan) {
                toast.error('Please select a plan');
                return;
            }

            const subStartDate = new Date(subForm.startDate);
            const durationDays = selectedPlan.duration;
            const endDate = new Date(subStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            const planPrice = Number(selectedPlan.price);
            const insuranceNeeded = subForm.includeInsurance && !isInsuranceValid();
            const insuranceFee = insuranceNeeded ? INSURANCE_FEE : 0;
            const totalPrice = planPrice + insuranceFee;

            let finalAmountPaid = 0;
            if (subForm.isFullyPaid) {
                finalAmountPaid = totalPrice;
            } else {
                finalAmountPaid = Number(subForm.amountPaid) || 0;
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
                    type: 'SUBSCRIPTION_PAYMENT',
                    note: `Subscription: ${selectedPlan.name}${insuranceNeeded ? ' + Insurance' : ''}`
                });
                updateData.payments = newPayments;
            }

            await updateDoc(memberRef, updateData);

            toast.success('Subscription added successfully');
            setShowSubscriptionDialog(false);
            // Reset form
            setSubForm({
                planId: '',
                startDate: new Date().toISOString().split('T')[0],
                isFullyPaid: true,
                amountPaid: '',
                includeInsurance: false
            });
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

    // Delete Subscription Handler (Soft Delete)
    const handleDeleteSubscription = async () => {
        if (deleteConfirmText.toLowerCase() !== 'delete') {
            toast.error(t('members.typeDeleteToConfirm'));
            return;
        }

        if (!subscriptionToDelete || !member || !userProfile?.gymId) return;

        try {
            setDeletingSubscription(true);

            const history = [...(member.subscriptionHistory || [])];
            // Mark the subscription as deleted
            if (history[subscriptionToDelete.index]) {
                history[subscriptionToDelete.index] = {
                    ...history[subscriptionToDelete.index],
                    deleted: true,
                    deletedAt: new Date().toISOString()
                };
            }

            // Find and soft delete the corresponding payment from payments array
            const payments = [...(member.payments || [])];
            const subscriptionCreatedAt = subscriptionToDelete.createdAt ? new Date(subscriptionToDelete.createdAt).getTime() : null;
            const planName = subscriptionToDelete.planName || '';

            let paymentToRemoveIndex = -1;
            let paymentAmount = 0;

            for (let i = 0; i < payments.length; i++) {
                const payment = payments[i];
                // Skip already deleted payments
                if (payment.deleted) continue;

                const paymentDate = new Date(payment.date).getTime();
                const noteContainsPlan = payment.note && payment.note.includes(planName);

                // Check if payment note contains the plan name and dates are within 1 minute of each other
                if (noteContainsPlan && subscriptionCreatedAt) {
                    const timeDiff = Math.abs(paymentDate - subscriptionCreatedAt);
                    if (timeDiff < 60000) { // Within 1 minute
                        paymentToRemoveIndex = i;
                        paymentAmount = Number(payment.amount) || 0;
                        break;
                    }
                }
            }

            // Mark payment as deleted if found
            if (paymentToRemoveIndex >= 0) {
                payments[paymentToRemoveIndex] = {
                    ...payments[paymentToRemoveIndex],
                    deleted: true,
                    deletedAt: new Date().toISOString()
                };
            }

            // Calculate the amount to subtract from totalPaid
            const amountToSubtract = paymentAmount > 0 ? paymentAmount : (Number(subscriptionToDelete.price) || 0);
            const newTotalPaid = Math.max(0, (member.totalPaid || 0) - amountToSubtract);

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, {
                subscriptionHistory: history,
                payments: payments,
                totalPaid: newTotalPaid,
                updatedAt: serverTimestamp()
            });

            toast.success(t('members.subscriptionDeleted'));
            setShowDeleteSubscriptionDialog(false);
            setSubscriptionToDelete(null);
            setDeleteConfirmText('');
            fetchMemberData();
        } catch (error) {
            console.error('Error deleting subscription:', error);
            toast.error('Failed to delete subscription');
        } finally {
            setDeletingSubscription(false);
        }
    };

    const handlePayInsurance = async () => {
        if (!confirm(t('members.confirmInsurancePayment', { amount: member.insuranceFee }))) return;

        try {
            const paymentAmount = Number(member.insuranceFee);
            const newPayment = {
                amount: paymentAmount,
                type: 'insurance',
                date: new Date().toISOString(),
                note: t('members.insuranceHistory'), // Use localized note or just "Insurance Fee"
            };

            const memberRef = doc(db, 'gyms', userProfile.gymId, 'members', member.id);
            await updateDoc(memberRef, {
                payments: arrayUnion(newPayment),
                outstandingBalance: (member.outstandingBalance || 0) + paymentAmount - paymentAmount, // Effectively 0 change if we assume fee was already owed? 
                // Actually, if it's "Unpaid", it implies they OWE it.
                // If we pay it, they pay cash.
                // The balance logic in this app is a bit ambiguous (Outstanding = Price - Paid).
                // If they have unpaid insurance, their Outstanding SHOULD include the fee.
                // Paying it reduces outstanding.
                // However, our current logic usually calculates outstanding on the fly or updates it.
                // Let's safe-update outstandingBalance: 
                // If they pay, we assume they hand over cash.
                totalPaid: (member.totalPaid || 0) + paymentAmount
            });

            toast.success(t('members.insurancePaid'));
            fetchMember();
        } catch (error) {
            console.error("Error paying insurance:", error);
            toast.error("Failed to pay insurance");
        }
    };

    // Restore Subscription Handler
    const handleRestoreSubscription = async (subscription, originalIndex) => {
        if (!member || !userProfile?.gymId) return;

        try {
            setRestoringSubscription(true);

            const history = [...(member.subscriptionHistory || [])];
            // Mark the subscription as active (not deleted)
            if (history[originalIndex]) {
                const { deleted, deletedAt, ...restoredSubscription } = history[originalIndex];
                history[originalIndex] = {
                    ...restoredSubscription,
                    deleted: false,
                    deletedAt: null
                };
            }

            // Find and restore the corresponding payment
            const payments = [...(member.payments || [])];
            const subscriptionCreatedAt = subscription.createdAt ? new Date(subscription.createdAt).getTime() : null;
            const planName = subscription.planName || '';

            let paymentToRestoreIndex = -1;
            let paymentAmount = 0;

            for (let i = 0; i < payments.length; i++) {
                const payment = payments[i];
                // Only look for deleted payments
                if (!payment.deleted) continue;

                const paymentDate = new Date(payment.date).getTime();
                const noteContainsPlan = payment.note && payment.note.includes(planName);

                // Use same matching logic as delete
                if (noteContainsPlan && subscriptionCreatedAt) {
                    const timeDiff = Math.abs(paymentDate - subscriptionCreatedAt);
                    if (timeDiff < 60000) { // Within 1 minute
                        paymentToRestoreIndex = i;
                        paymentAmount = Number(payment.amount) || 0;
                        break;
                    }
                }
            }

            // Restore payment if found
            if (paymentToRestoreIndex >= 0) {
                const { deleted, deletedAt, ...restoredPayment } = payments[paymentToRestoreIndex];
                payments[paymentToRestoreIndex] = {
                    ...restoredPayment,
                    deleted: false,
                    deletedAt: null
                };
            }

            // Add amount back to totalPaid
            const amountToAdd = paymentAmount > 0 ? paymentAmount : (Number(subscription.price) || 0);
            const newTotalPaid = (member.totalPaid || 0) + amountToAdd;

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, {
                subscriptionHistory: history,
                payments: payments,
                totalPaid: newTotalPaid,
                updatedAt: serverTimestamp()
            });

            toast.success(t('members.subscriptionRestored'));
            fetchMemberData();
        } catch (error) {
            console.error('Error restoring subscription:', error);
            toast.error('Failed to restore subscription');
        } finally {
            setRestoringSubscription(false);
        }
    };

    // Open Delete Subscription Dialog
    const openDeleteSubscriptionDialog = (subscription, originalIndex) => {
        setSubscriptionToDelete({ ...subscription, index: originalIndex });
        setDeleteConfirmText('');
        setShowDeleteSubscriptionDialog(true);
    };

    const openEditCNIDialog = () => {
        setCniIdForm(member.cniId || '');
        setShowEditCNIDialog(true);
    };

    // Open Edit Member Dialog
    const openEditMemberDialog = () => {
        setEditMemberForm({
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            phone: member.phone || '',
            email: member.email || '',
            cniId: member.cniId || ''
        });
        setShowEditMemberDialog(true);
    };

    // Handle Update Member
    const handleUpdateMember = async (e) => {
        e.preventDefault();
        try {
            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, {
                firstName: editMemberForm.firstName,
                lastName: editMemberForm.lastName,
                phone: editMemberForm.phone,
                email: editMemberForm.email,
                cniId: editMemberForm.cniId
            });
            toast.success(t('members.memberUpdated'));
            setShowEditMemberDialog(false);
            fetchMemberData();
        } catch (error) {
            console.error('Error updating member:', error);
            toast.error('Failed to update member');
        }
    };

    // Open Payment Dialog
    const openPaymentDialog = () => {
        setPaymentForm({
            payFullAmount: true,
            amount: member.outstandingBalance || 0,
            includeInsurance: false
        });
        setShowPaymentDialog(true);
    };

    // Calculate payment amounts
    const calculatePaymentAmounts = () => {
        const outstandingDebt = member.outstandingBalance || 0;
        const paymentAmount = paymentForm.payFullAmount ? outstandingDebt : Number(paymentForm.amount) || 0;
        const insuranceAmount = paymentForm.includeInsurance && member.insuranceStatus !== 'active' ? INSURANCE_FEE : 0;
        const totalPayment = paymentAmount + insuranceAmount;
        const remainingDebt = Math.max(0, outstandingDebt - paymentAmount);

        return { outstandingDebt, paymentAmount, insuranceAmount, totalPayment, remainingDebt };
    };

    // Handle Record Payment
    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            const { paymentAmount, insuranceAmount, totalPayment, remainingDebt } = calculatePaymentAmounts();

            if (paymentAmount <= 0 && insuranceAmount <= 0) {
                toast.error('Please enter a valid payment amount');
                return;
            }

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);

            // Create payment records
            const newPayments = [...(member.payments || [])];

            if (paymentAmount > 0) {
                newPayments.push({
                    amount: paymentAmount,
                    type: 'DEBT_PAYMENT',
                    note: `Debt Payment (${paymentAmount} MAD)`,
                    dateTime: new Date().toISOString()
                });
            }

            if (insuranceAmount > 0) {
                newPayments.push({
                    amount: insuranceAmount,
                    type: 'INSURANCE_PAYMENT',
                    note: `Insurance Payment (${insuranceAmount} MAD)`,
                    dateTime: new Date().toISOString()
                });
            }

            const updateData = {
                totalPaid: (member.totalPaid || 0) + totalPayment,
                outstandingBalance: remainingDebt,
                payments: newPayments
            };

            // Update insurance status if included
            if (paymentForm.includeInsurance && member.insuranceStatus !== 'active') {
                updateData.insuranceStatus = 'active';
            }

            await updateDoc(memberRef, updateData);

            toast.success(t('members.paymentRecorded') || 'Payment recorded successfully');
            setShowPaymentDialog(false);
            fetchMemberData();
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        }
    };

    // Avatar handling
    const handleAvatarSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setRawAvatarSrc(reader.result);
            setShowAvatarCropDialog(true);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarCropped = async (croppedBlob) => {
        // Compress the avatar
        const options = {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 400,
            useWebWorker: true,
            fileType: 'image/jpeg',
        };

        try {
            const compressedBlob = await imageCompression(croppedBlob, options);
            setAvatarFile(compressedBlob);
            const previewUrl = URL.createObjectURL(compressedBlob);
            setAvatarPreview(previewUrl);
        } catch (error) {
            console.error('Compression failed:', error);
            setAvatarFile(croppedBlob);
            setAvatarPreview(URL.createObjectURL(croppedBlob));
        }

        setShowAvatarCropDialog(false);
        setRawAvatarSrc(null);
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) {
            toast.error('Please select an avatar image');
            return;
        }

        try {
            setUploadingAvatar(true);

            const safeFirstName = (member.firstName || 'Unknown').replace(/[^a-z0-9]/gi, '');
            const safeLastName = (member.lastName || 'Unknown').replace(/[^a-z0-9]/gi, '');
            const avatarFileName = `${member.memberId}-${safeFirstName}-${safeLastName}-avatar.jpg`;
            const avatarStorageRef = ref(storage, `gyms/${userProfile.gymId}/avatars/${avatarFileName}`);

            await uploadBytes(avatarStorageRef, avatarFile);
            const downloadURL = await getDownloadURL(avatarStorageRef);

            const memberRef = doc(db, `gyms/${userProfile.gymId}/members`, memberId);
            await updateDoc(memberRef, { avatarUrl: downloadURL });

            toast.success('Avatar uploaded successfully');
            setShowAvatarUploadDialog(false);
            setAvatarFile(null);
            setAvatarPreview(null);
            fetchMemberData();
        } catch (error) {
            console.error('Avatar upload failed:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <ProfileSkeleton />
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
        <DashboardLayout hideNav>
            <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
                <PageHeader
                    title={`${member.firstName} ${member.lastName}`}
                    backTo="/members"
                    backLabel={t('members.backToMembers')}
                >
                    {isOwner() && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateMemberFichePDF(member, userProfile?.gymName)}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {t('members.downloadFicheMembre')}
                        </Button>
                    )}
                </PageHeader>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Member Profile Details */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium">{t('members.memberProfile')}</CardTitle>
                            {(isOwner() || isManager()) && (
                                <Button variant="ghost" size="sm" onClick={openEditMemberDialog}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative group">
                                        {member.avatarUrl ? (
                                            <img
                                                src={member.avatarUrl}
                                                alt={`${member.firstName} ${member.lastName}`}
                                                className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                                                <User className="h-10 w-10 text-muted-foreground/50" />
                                            </div>
                                        )}
                                        {(isOwner() || isManager()) && (
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setShowAvatarUploadDialog(true)}
                                            >
                                                <Camera className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('members.fullName')}</p>
                                        <p className="text-xl font-bold">{member.firstName} {member.lastName}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('members.phone')}</p>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3" />
                                            <span>{member.phone}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('members.email')}</p>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{member.email || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">{t('members.cniId')}</p>
                                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                                        <span className="font-mono font-medium">{member.cniId || t('common.notSet')}</span>
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
                            <CardTitle className="text-lg font-medium">{t('members.financialOverview')}</CardTitle>
                            {isOwner() && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={openPaymentDialog}
                                    disabled={(member.outstandingBalance || 0) <= 0}
                                >
                                    <Banknote className="h-4 w-4 mr-1" />
                                    {t('members.recordPayment')}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('members.currentPlan')}</p>
                                        <p className="font-semibold">{currentPlan?.name || t('common.notAvailable')}</p>
                                    </div>
                                    {status === 'active' ? (
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-3 py-1 text-sm">
                                            {t('members.activeMember')}
                                        </Badge>
                                    ) : status === 'expiring' ? (
                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 px-3 py-1 text-sm">
                                            {t('members.expiringSoon')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="px-3 py-1 text-sm">
                                            {t('members.expired')}
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('members.totalPaidLifetime')}</p>
                                        <p className="font-bold text-green-600 text-lg">{member.totalPaid || 0} MAD</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('members.outstandingDebt')}</p>
                                        <div className="flex items-center gap-1">
                                            <p className={`font-bold text-lg ${member.outstandingBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {member.outstandingBalance || 0} MAD
                                            </p>
                                            {(member.outstandingBalance || 0) > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('members.insuranceStatus')}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {isInsuranceValid() ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium w-fit">
                                                        <Shield className="h-4 w-4" /> {t('members.paid')}
                                                    </div>
                                                    {member.insuranceExpiryDate && (
                                                        <span className="text-[10px] text-muted-foreground ml-1">
                                                            {t('members.expiresOn') || 'Expires on'}: {new Date(member.insuranceExpiryDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium animate-pulse">
                                                    <ShieldAlert className="h-4 w-4" /> {t('members.unpaid')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('members.totalInsurancePaid')}</p>
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
                            <CardTitle>{t('members.memberCniDocument')}</CardTitle>
                        </div>
                        {(isOwner() || isManager()) && member.cniDocumentUrl ? (
                            <div className="flex gap-2">
                                <Button variant="destructive" size="sm" onClick={handleDeleteCNI} disabled={uploading}>
                                    <X className="h-4 w-4 mr-1" /> {t('common.delete')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                                    <Upload className="mr-2 h-4 w-4" /> {t('common.update')}
                                </Button>
                            </div>
                        ) : (isOwner() || isManager()) && (
                            <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                                <Upload className="mr-2 h-4 w-4" /> {t('members.uploadDocument')}
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
                                            <FileText className="mr-2 h-4 w-4" /> {t('members.viewFullDocument')}
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
                                                <Upload className="mr-2 h-4 w-4 rotate-180" /> {t('common.download')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                                <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">{t('members.noCniDocument')}</p>
                                <p className="text-sm opacity-70 mb-6">{t('members.uploadCniHint')}</p>
                                {isOwner() && <Button onClick={() => setShowUploadDialog(true)}>{t('members.uploadNow')}</Button>}
                            </div>
                        )}
                    </CardContent>
                </Card>


                {/* Subscription History */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('members.subscriptionHistory')}</CardTitle>
                            <CardDescription>{t('members.manageSubscriptions')}</CardDescription>
                        </div>
                        {isOwner() && (
                            <Button onClick={() => navigate(`/members/${memberId}/add-subscription`)} size="sm">
                                <Plus className="mr-2 h-4 w-4" /> {t('members.addSubscription')}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('plans.plan')}</TableHead>
                                    <TableHead>{t('members.startDate')}</TableHead>
                                    <TableHead>{t('members.endDate')}</TableHead>
                                    <TableHead>{t('plans.duration')}</TableHead>
                                    <TableHead>{t('plans.price')}</TableHead>
                                    <TableHead>{t('members.status')}</TableHead>
                                    {isOwner() && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    // Calculate active plans for dynamic ranking (same logic as PDF)
                                    const activePlans = (member.subscriptionHistory || []).filter(sub => !sub.deleted).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                                    return member.subscriptionHistory?.slice().reverse().map((sub, i) => {
                                        // Calculate original index (since array is reversed for display)
                                        const originalIndex = member.subscriptionHistory.length - 1 - i;
                                        const isDeleted = sub.deleted;
                                        const isActive = !isDeleted && new Date(sub.endDate) > new Date();

                                        let rankDisplay = null;
                                        if (!isDeleted) {
                                            const rank = activePlans.findIndex(p => p.startDate === sub.startDate && p.planId === sub.planId) + 1;
                                            if (rank > 0) {
                                                const ordinal = (rank % 10 === 1 && rank % 100 !== 11) ? 'st' :
                                                    (rank % 10 === 2 && rank % 100 !== 12) ? 'nd' :
                                                        (rank % 10 === 3 && rank % 100 !== 13) ? 'rd' : 'th';
                                                rankDisplay = `${rank}${ordinal} Plan`;
                                            }
                                        }

                                        return (
                                            <TableRow key={i} className={isDeleted ? "opacity-50 bg-muted/50" : ""}>
                                                <TableCell className="font-medium">
                                                    <span className={isDeleted ? "line-through" : ""}>
                                                        {sub.planName || 'Unknown'}
                                                        {rankDisplay && (
                                                            <span className="block text-xs text-muted-foreground font-normal">
                                                                {sub.edited ? 'Edited ' : ''}{rankDisplay}
                                                            </span>
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell className={isDeleted ? "line-through" : ""}>{new Date(sub.startDate).toLocaleDateString()}</TableCell>
                                                <TableCell className={isDeleted ? "line-through" : ""}>{new Date(sub.endDate).toLocaleDateString()}</TableCell>
                                                <TableCell className={isDeleted ? "line-through" : ""}>
                                                    {Math.ceil((new Date(sub.endDate) - new Date(sub.startDate)) / (1000 * 60 * 60 * 24))} {t('time.days')}
                                                </TableCell>
                                                <TableCell className={isDeleted ? "line-through" : ""}>{sub.price} MAD</TableCell>
                                                <TableCell>
                                                    {isDeleted ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                                                            {t('status.deleted')}
                                                        </span>
                                                    ) : isActive ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            {t('status.active')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                            {t('status.expired')}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                {isOwner() && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isDeleted ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRestoreSubscription(sub, originalIndex)}
                                                                    title={t('members.restoreSubscription')}
                                                                    disabled={restoringSubscription}
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => generateSubscriptionPDF(member, sub, userProfile?.gymName)}
                                                                        title="Download Subscription PDF"
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => openDeleteSubscriptionDialog(sub, originalIndex)}
                                                                        title={t('members.deleteSubscription')}
                                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    });
                                })()}
                                {(!member.subscriptionHistory || member.subscriptionHistory.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={isOwner() ? 6 : 5} className="text-center text-muted-foreground">{t('members.noSubscriptionHistory')}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Insurance History */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('members.insuranceHistory') || 'Insurance History'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('members.date')}</TableHead>
                                    <TableHead>{t('members.amount')}</TableHead>
                                    <TableHead>{t('members.note')}</TableHead>
                                    <TableHead>{t('members.status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    const insurancePayments = member.payments?.filter(p => p.type === 'insurance').slice().reverse() || [];
                                    const hasActiveInsurancePayment = insurancePayments.some(p => !p.deleted);
                                    const isInsuranceRequired = member.insuranceStatus === 'active' || (member.insuranceFee && member.insuranceFee > 0);

                                    return (
                                        <>
                                            {insurancePayments.map((payment, index) => {
                                                const isDeleted = payment.deleted;
                                                return (
                                                    <TableRow key={index} className={isDeleted ? "opacity-50 bg-muted/50" : ""}>
                                                        <TableCell className={isDeleted ? "line-through" : ""}>
                                                            {new Date(payment.date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className={`font-bold ${isDeleted ? "line-through text-muted-foreground" : "text-green-600"}`}>
                                                            {payment.amount} MAD
                                                        </TableCell>
                                                        <TableCell className={isDeleted ? "line-through" : ""}>
                                                            {payment.note || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isDeleted ? (
                                                                <span className="text-xs text-destructive font-medium">({t('status.deleted')})</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                    {t('status.active')}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}

                                            {/* Unpaid Status Row */}
                                            {isInsuranceRequired && !hasActiveInsurancePayment && (
                                                <TableRow className="bg-red-50 dark:bg-red-900/10">
                                                    <TableCell>-</TableCell>
                                                    <TableCell className="font-bold text-destructive">
                                                        {member.insuranceFee} MAD
                                                    </TableCell>
                                                    <TableCell>-</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                                {t('members.insuranceUnpaid')}
                                                            </span>
                                                            {isOwner() && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-red-200 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/50"
                                                                    onClick={() => handlePayInsurance(member)}
                                                                >
                                                                    {t('members.payInsurance')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {(!isInsuranceRequired && insurancePayments.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground">{t('members.noInsuranceHistory')}</TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    );
                                })()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('members.paymentHistory')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('members.dateTime')}</TableHead>
                                    <TableHead>{t('members.type')}</TableHead>
                                    <TableHead>{t('members.amount')}</TableHead>
                                    <TableHead>{t('members.note')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {member.payments?.filter(p => p.type !== 'insurance').slice().reverse().map((payment, index) => {
                                    const isDeleted = payment.deleted;

                                    // Calculate active plans for linking
                                    const activePlans = (member.subscriptionHistory || []).filter(sub => !sub.deleted).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                                    let linkedPlanInfo = '';
                                    if (!isDeleted) {
                                        const paymentDate = new Date(payment.date);
                                        const matchedPlan = activePlans.find(sub => {
                                            const start = new Date(sub.startDate);
                                            const end = new Date(sub.endDate);
                                            const bufferTime = 24 * 60 * 60 * 1000 * 7;
                                            return paymentDate >= (start.getTime() - bufferTime) && paymentDate <= end;
                                        });

                                        if (matchedPlan) {
                                            const rank = activePlans.indexOf(matchedPlan) + 1;
                                            const ordinal = (rank % 10 === 1 && rank % 100 !== 11) ? 'st' :
                                                (rank % 10 === 2 && rank % 100 !== 12) ? 'nd' :
                                                    (rank % 10 === 3 && rank % 100 !== 13) ? 'rd' : 'th';
                                            linkedPlanInfo = `${rank}${ordinal} Plan: ${matchedPlan.planName || 'Unknown'} (ID: ${matchedPlan.planId || matchedPlan.id})`;
                                            if (matchedPlan.edited) linkedPlanInfo += " (Edited)";
                                        }
                                    }

                                    return (
                                        <TableRow key={index} className={isDeleted ? "opacity-50 bg-muted/50" : ""}>
                                            <TableCell className={isDeleted ? "line-through" : ""}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{new Date(payment.date).toLocaleDateString()}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleTimeString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={isDeleted ? "line-through" : ""}>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="uppercase text-xs">
                                                            {payment.type?.replace('_', ' ') || 'Payment'}
                                                        </Badge>
                                                        {isDeleted && <span className="text-xs text-destructive font-medium">({t('status.deleted')})</span>}
                                                    </div>
                                                    {linkedPlanInfo && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {linkedPlanInfo}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`font-bold ${isDeleted ? "line-through text-muted-foreground" : "text-green-600"}`}>
                                                +{payment.amount} MAD
                                            </TableCell>
                                            <TableCell className={`text-sm ${isDeleted ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>{payment.note || '-'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {(!member.payments || member.payments.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">{t('members.noPayments')}</TableCell>
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
                            <CardTitle>{t('warnings.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {member.warnings.map((warning, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/10">
                                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-destructive">{warning.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(warning.dateTime || warning.date).toLocaleDateString()} {new Date(warning.dateTime || warning.date).toLocaleTimeString()} - {t('members.addedBy')} {warning.addedBy}
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('members.addNewSubscription')}</DialogTitle>
                        <DialogDescription>{t('members.addSubscriptionDesc')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSubscription}>
                        <div className="space-y-4 py-4">
                            {/* Plan Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="sub-plan">{t('plans.plan')} *</Label>
                                <Select
                                    value={subForm.planId}
                                    onValueChange={(v) => setSubForm({ ...subForm, planId: v })}
                                    required
                                >
                                    <SelectTrigger id="sub-plan">
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

                            {/* Start Date */}
                            <div className="space-y-2">
                                <Label htmlFor="sub-start-date">{t('members.startDate')} *</Label>
                                <Input
                                    id="sub-start-date"
                                    type="date"
                                    value={subForm.startDate}
                                    onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Payment Mode Toggle - Clickable Card */}
                            <div
                                onClick={() => setSubForm({ ...subForm, isFullyPaid: !subForm.isFullyPaid })}
                                className="cursor-pointer p-4 rounded-lg border transition-all hover:bg-muted/60 dark:hover:bg-muted/20 bg-muted/40 dark:bg-muted/10"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer text-base">{t('members.fullyPaid')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {subForm.isFullyPaid ? t('plans.fullPayment') : t('plans.partialPayment')}
                                        </p>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            checked={subForm.isFullyPaid}
                                            onCheckedChange={(checked) => setSubForm({ ...subForm, isFullyPaid: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Amount Paid Input (if partial) */}
                            {!subForm.isFullyPaid && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <Label htmlFor="sub-amount-paid">{t('plans.amountPaid')} (MAD) *</Label>
                                    <Input
                                        id="sub-amount-paid"
                                        type="number"
                                        min="0"
                                        value={subForm.amountPaid}
                                        onChange={(e) => setSubForm({ ...subForm, amountPaid: e.target.value })}
                                        placeholder="Enter amount paid"
                                        required
                                    />
                                </div>
                            )}

                            {/* Insurance Section */}
                            <div className="pt-2">
                                <div
                                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${isInsuranceValid() ? 'opacity-70 bg-muted' : 'cursor-pointer hover:bg-muted/60 bg-muted/40'}`}
                                    onClick={() => !isInsuranceValid() && setSubForm({ ...subForm, includeInsurance: !subForm.includeInsurance })}
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="sub-include-insurance"
                                            checked={isInsuranceValid() || subForm.includeInsurance}
                                            disabled={isInsuranceValid()}
                                            onCheckedChange={(checked) => setSubForm({ ...subForm, includeInsurance: checked })}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div>
                                            <Label htmlFor="sub-include-insurance" className={isInsuranceValid() ? "" : "cursor-pointer"}>
                                                {t('plans.includeInsurance')}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {isInsuranceValid()
                                                    ? `${t('members.insuranceValidUntil') || 'Valid until'} ${new Date(member.insuranceExpiryDate).toLocaleDateString()}`
                                                    : `${INSURANCE_FEE} MAD`}
                                            </p>
                                        </div>
                                    </div>
                                    {isInsuranceValid() && (
                                        <Badge className="bg-emerald-500 text-white">{t('members.active')}</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Calculator Section */}
                            {subForm.planId && (
                                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border">
                                    {(() => {
                                        const selectedPlan = plans.find(p => p.id === subForm.planId);
                                        if (!selectedPlan) return null;

                                        const planPrice = Number(selectedPlan.price);
                                        const insuranceNeeded = subForm.includeInsurance && !isInsuranceValid();
                                        const insuranceFee = insuranceNeeded ? INSURANCE_FEE : 0;
                                        const totalPrice = planPrice + insuranceFee;
                                        const amountPaying = subForm.isFullyPaid ? totalPrice : Number(subForm.amountPaid) || 0;
                                        const remaining = Math.max(0, totalPrice - amountPaying);

                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{t('plans.planPrice')}:</span>
                                                    <span className="font-medium">{planPrice} MAD</span>
                                                </div>
                                                {insuranceNeeded && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">{t('plans.insurance')}:</span>
                                                        <span className="font-medium">{INSURANCE_FEE} MAD</span>
                                                    </div>
                                                )}
                                                <div className="border-t pt-2 flex justify-between font-bold">
                                                    <span>{t('plans.totalAmount')}:</span>
                                                    <span className="text-primary">{totalPrice} MAD</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-1">
                                                    <span className="text-muted-foreground">{t('members.amountPaying')}:</span>
                                                    <span className="font-medium text-green-600">{amountPaying} MAD</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{t('members.debtAfterPayment')}:</span>
                                                    <span className={`font-medium ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                        {remaining} MAD
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowSubscriptionDialog(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={!subForm.planId}>
                                {t('members.addSubscription')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit CNI ID Dialog */}
            <Dialog open={showEditCNIDialog} onOpenChange={setShowEditCNIDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('members.editCniId')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateCNIId}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('members.cniIdNumber')}</Label>
                                <Input value={cniIdForm} onChange={(e) => setCniIdForm(e.target.value)} placeholder="AB123456" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowEditCNIDialog(false)}>{t('common.cancel')}</Button>
                            <Button type="submit">{t('common.update')}</Button>
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
                        <DialogTitle>{t('members.uploadCniDocument')}</DialogTitle>
                        <DialogDescription>
                            {t('members.uploadCniMethod')}
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
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.type.startsWith('image/')) {
                                            // Open cropper for images
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setRawImageSrc(reader.result);
                                                setShowCropDialog(true);
                                            };
                                            reader.readAsDataURL(file);
                                        } else {
                                            // Direct upload for PDFs
                                            setUploadFile(file);
                                        }
                                    }
                                    e.target.value = ''; // Reset input
                                }}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                id="camera-upload"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // Always open cropper for camera-captured images
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            setRawImageSrc(reader.result);
                                            setShowCropDialog(true);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                    e.target.value = ''; // Reset input
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
                                <span className="font-medium">{t('members.uploadFromGallery')}</span>
                            </div>

                            <div
                                onClick={() => document.getElementById('camera-upload').click()}
                                className="cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center h-40"
                            >
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                    <Camera className="h-6 w-6" />
                                </div>
                                <span className="font-medium">{t('members.takePhoto')}</span>
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
                                {t('members.readyToUpload')} <span className="font-semibold text-foreground">{uploadFile.name}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)}>{t('common.cancel')}</Button>
                        <Button
                            onClick={handleCNIUpload}
                            disabled={!uploadFile || uploading}
                            className="min-w-[100px]"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {t('members.uploading')}
                                </>
                            ) : (
                                t('members.confirmUpload')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            <Dialog open={showEditMemberDialog} onOpenChange={setShowEditMemberDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('members.editMember')}</DialogTitle>
                        <DialogDescription>{t('members.editMemberDesc') || 'Update member information'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateMember}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('members.firstName')}</Label>
                                    <Input
                                        value={editMemberForm.firstName}
                                        onChange={(e) => setEditMemberForm({ ...editMemberForm, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('members.lastName')}</Label>
                                    <Input
                                        value={editMemberForm.lastName}
                                        onChange={(e) => setEditMemberForm({ ...editMemberForm, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('members.phone')}</Label>
                                <Input
                                    value={editMemberForm.phone}
                                    onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('members.email')}</Label>
                                <Input
                                    type="email"
                                    value={editMemberForm.email}
                                    onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('members.cniId')}</Label>
                                <Input
                                    value={editMemberForm.cniId}
                                    onChange={(e) => setEditMemberForm({ ...editMemberForm, cniId: e.target.value })}
                                    placeholder="AB123456"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowEditMemberDialog(false)}>{t('common.cancel')}</Button>
                            <Button type="submit">{t('common.save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('members.recordPayment')}</DialogTitle>
                        <DialogDescription>{t('members.recordPaymentDesc') || 'Record a payment for this member'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRecordPayment}>
                        <div className="space-y-4 py-4">
                            {/* Current Plan Display (Disabled) */}
                            <div className="space-y-2">
                                <Label>{t('members.currentPlan')}</Label>
                                <Input
                                    value={currentPlan?.name || t('common.notAvailable')}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            {/* Payment Mode Switch */}
                            <div
                                className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setPaymentForm({
                                    ...paymentForm,
                                    payFullAmount: !paymentForm.payFullAmount,
                                    amount: !paymentForm.payFullAmount ? member.outstandingBalance : 0
                                })}
                            >
                                <div>
                                    <p className="font-medium">{t('members.paymentMode') || 'Payment Mode'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {paymentForm.payFullAmount ? t('plans.fullPayment') : t('plans.partialPayment')}
                                    </p>
                                </div>
                                <Switch
                                    checked={paymentForm.payFullAmount}
                                    onCheckedChange={(checked) => setPaymentForm({
                                        ...paymentForm,
                                        payFullAmount: checked,
                                        amount: checked ? member.outstandingBalance : 0
                                    })}
                                />
                            </div>

                            {/* Amount Input (only when partial) */}
                            {!paymentForm.payFullAmount && (
                                <div className="space-y-2">
                                    <Label>{t('members.amountToPay') || 'Amount to Pay'} (MAD) *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={member.outstandingBalance || 0}
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({
                                            ...paymentForm,
                                            amount: Math.min(Number(e.target.value), member.outstandingBalance || 0)
                                        })}
                                        placeholder={t('plans.amountPaid')}
                                    />
                                </div>
                            )}

                            {/* Insurance Section (Separate) */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="include-insurance"
                                            checked={paymentForm.includeInsurance || member.insuranceStatus === 'active'}
                                            disabled={member.insuranceStatus === 'active'}
                                            onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, includeInsurance: checked })}
                                        />
                                        <div>
                                            <Label htmlFor="include-insurance" className="cursor-pointer">
                                                {t('plans.includeInsurance')}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {member.insuranceStatus === 'active'
                                                    ? t('members.insuranceAlreadyPaid') || 'Already paid'
                                                    : `${INSURANCE_FEE} MAD`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    {member.insuranceStatus === 'active' && (
                                        <Badge className="bg-emerald-500 text-white">{t('members.paid')}</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Real-time Calculator */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2 border">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('members.debtBeforePayment') || 'Outstanding Debt'}:</span>
                                    <span className="font-medium text-destructive">{member.outstandingBalance || 0} MAD</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('members.amountPaying') || 'Amount Paying'}:</span>
                                    <span className="font-medium text-green-600">
                                        {paymentForm.payFullAmount ? member.outstandingBalance : paymentForm.amount} MAD
                                    </span>
                                </div>
                                {paymentForm.includeInsurance && member.insuranceStatus !== 'active' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('plans.insurance')}:</span>
                                        <span className="font-medium">{INSURANCE_FEE} MAD</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 flex justify-between font-medium">
                                    <span>{t('plans.totalAmount')}:</span>
                                    <span className="text-primary">
                                        {(() => {
                                            const { totalPayment } = calculatePaymentAmounts();
                                            return `${totalPayment} MAD`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pt-1">
                                    <span className="text-muted-foreground">{t('members.debtAfterPayment') || 'Remaining Debt'}:</span>
                                    <span className={`font-medium ${calculatePaymentAmounts().remainingDebt > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                        {calculatePaymentAmounts().remainingDebt} MAD
                                    </span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setShowPaymentDialog(false)}>{t('common.cancel')}</Button>
                            <Button
                                type="submit"
                                disabled={calculatePaymentAmounts().totalPayment <= 0}
                            >
                                {t('members.recordPayment')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Image Cropper Dialog for CNI */}
            <ImageCropper
                open={showCropDialog}
                onClose={() => {
                    setShowCropDialog(false);
                    setRawImageSrc(null);
                }}
                imageSrc={rawImageSrc}
                onCropComplete={(croppedFile) => {
                    setUploadFile(croppedFile);
                    setShowCropDialog(false);
                    setRawImageSrc(null);
                }}
                aspectRatio={1.59} // ID Card aspect ratio
            />

            {/* Avatar Upload Dialog */}
            <Dialog open={showAvatarUploadDialog} onOpenChange={setShowAvatarUploadDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('members.uploadAvatar')}</DialogTitle>
                        <DialogDescription>
                            {t('members.avatarHint')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Avatar Preview */}
                        <div className="flex justify-center">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar preview"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                                />
                            ) : member?.avatarUrl ? (
                                <img
                                    src={member.avatarUrl}
                                    alt="Current avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg opacity-50"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                                    <User className="h-16 w-16 text-muted-foreground/50" />
                                </div>
                            )}
                        </div>

                        {/* Upload Options */}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="profile-avatar-gallery"
                            onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            id="profile-avatar-camera"
                            onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
                        />

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => document.getElementById('profile-avatar-gallery').click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {t('members.uploadFromGallery')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => document.getElementById('profile-avatar-camera').click()}
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                {t('members.takePhoto')}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAvatarUploadDialog(false);
                                setAvatarFile(null);
                                setAvatarPreview(null);
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleAvatarUpload}
                            disabled={!avatarFile || uploadingAvatar}
                        >
                            {uploadingAvatar ? t('common.uploading') || 'Uploading...' : t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Cropper Dialog for Avatar */}
            <ImageCropper
                open={showAvatarCropDialog}
                onClose={() => {
                    setShowAvatarCropDialog(false);
                    setRawAvatarSrc(null);
                }}
                imageSrc={rawAvatarSrc}
                onCropComplete={handleAvatarCropped}
                aspectRatio={1}
            />

            {/* Delete Subscription Confirmation Dialog */}
            <Dialog open={showDeleteSubscriptionDialog} onOpenChange={(open) => {
                setShowDeleteSubscriptionDialog(open);
                if (!open) {
                    setSubscriptionToDelete(null);
                    setDeleteConfirmText('');
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            {t('members.deleteSubscription')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('members.deleteSubscriptionConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {subscriptionToDelete && (
                            <div className="bg-muted/50 p-3 rounded-lg border">
                                <p className="font-medium">{subscriptionToDelete.planName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(subscriptionToDelete.startDate).toLocaleDateString()} - {new Date(subscriptionToDelete.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                            <p className="text-sm text-destructive font-medium flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {t('members.deleteSubscriptionWarning')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="delete-confirm">{t('members.typeDeleteToConfirm')}</Label>
                            <Input
                                id="delete-confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="delete"
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteSubscriptionDialog(false);
                                setSubscriptionToDelete(null);
                                setDeleteConfirmText('');
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSubscription}
                            disabled={deleteConfirmText.toLowerCase() !== 'delete' || deletingSubscription}
                        >
                            {deletingSubscription ? t('common.processing') : t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
