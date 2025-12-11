import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/motion-switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Check, Upload, User, CreditCard, IdCard, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    collection,
    getDocs,
    query,
    addDoc,
    serverTimestamp,
    runTransaction,
    doc
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useEffect } from 'react';
import { ImageCropper } from '@/components/ui/image-cropper';

export function AddMemberPage() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        // Step 1: Information
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        cniId: '',
        description: '',

        // Step 2: Plan
        planId: '',
        isFullyPaid: true,
        amountPaid: '',
        includeInsurance: true,
        insuranceFee: '50',
    });

    // CNI Upload state
    const [cniFile, setCniFile] = useState(null);
    const [cniPreview, setCniPreview] = useState(null);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState(null);
    const [showUploadOptions, setShowUploadOptions] = useState(true);

    // Fetch plans
    useEffect(() => {
        const fetchPlans = async () => {
            if (!userProfile?.gymId) return;
            try {
                const plansQuery = query(collection(db, `gyms/${userProfile.gymId}/plans`));
                const plansSnapshot = await getDocs(plansQuery);
                const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPlans(plansData);
            } catch (error) {
                console.error('Error fetching plans:', error);
                toast.error('Failed to load plans');
            }
        };
        fetchPlans();
    }, [userProfile?.gymId]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep1 = () => {
        if (!formData.firstName.trim()) {
            toast.error('First name is required');
            return false;
        }
        if (!formData.lastName.trim()) {
            toast.error('Last name is required');
            return false;
        }
        if (!formData.phone.trim()) {
            toast.error('Phone number is required');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.planId) {
            toast.error('Please select a membership plan');
            return false;
        }

        const selectedPlan = plans.find(p => p.id === formData.planId);
        if (!selectedPlan) return false;

        if (!formData.isFullyPaid) {
            const amountPaid = Number(formData.amountPaid);
            if (!amountPaid || amountPaid <= 0) {
                toast.error('Please enter the amount paid');
                return false;
            }

            const planPrice = Number(selectedPlan.price);
            const insuranceFee = formData.includeInsurance ? Number(formData.insuranceFee) : 0;
            const totalPrice = planPrice + insuranceFee;

            if (amountPaid > totalPrice) {
                toast.error('Amount paid cannot exceed total price');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleFileSelect = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setRawImageSrc(reader.result);
            setShowCropDialog(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCroppedImage = (croppedBlob) => {
        setCniFile(croppedBlob);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setCniPreview(previewUrl);
        setShowCropDialog(false);
        setRawImageSrc(null);
        setShowUploadOptions(false);
    };

    const handleSubmit = async () => {
        if (!userProfile?.gymId) return;

        setLoading(true);
        try {
            const selectedPlan = plans.find(p => p.id === formData.planId);
            if (!selectedPlan) {
                toast.error('Invalid plan selected');
                return;
            }

            const planPrice = Number(selectedPlan.price);
            const insuranceFee = formData.includeInsurance ? Number(formData.insuranceFee) : 0;
            const totalPrice = planPrice + insuranceFee;

            let amountPaid = 0;
            if (formData.isFullyPaid) {
                amountPaid = totalPrice;
            } else {
                amountPaid = Number(formData.amountPaid);
            }

            const outstandingBalance = totalPrice - amountPaid;

            // Get next member ID
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
                toast.error('Failed to generate member ID');
                return;
            }

            const initialSubscription = {
                planId: formData.planId,
                planName: selectedPlan.name,
                price: planPrice,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
            };

            // Upload CNI file if provided
            let cniDocumentUrl = null;
            if (cniFile) {
                try {
                    const safeFirstName = formData.firstName.replace(/[^a-z0-9]/gi, '');
                    const safeLastName = formData.lastName.replace(/[^a-z0-9]/gi, '');
                    const fileName = `${newMemberId}-${safeFirstName}-${safeLastName}-CNI.jpg`;
                    const storageRef = ref(storage, `gyms/${userProfile.gymId}/cni-documents/${fileName}`);
                    await uploadBytes(storageRef, cniFile);
                    cniDocumentUrl = await getDownloadURL(storageRef);
                } catch (uploadError) {
                    console.error('CNI upload failed:', uploadError);
                    toast.warning('Member created, but CNI upload failed');
                }
            }

            const newMember = {
                memberId: newMemberId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                cniId: formData.cniId || '',
                cniDocumentUrl: cniDocumentUrl,
                email: formData.email || '',
                phone: formData.phone,
                description: formData.description || '',
                currentSubscription: initialSubscription,
                subscriptionHistory: [initialSubscription],
                payments: [{
                    amount: amountPaid,
                    type: 'initial_registration',
                    date: new Date().toISOString(),
                    note: `Initial registration`
                }],
                insuranceStatus: formData.includeInsurance ? 'active' : 'none',
                insuranceFee: insuranceFee,
                warnings: [],
                outstandingBalance: outstandingBalance,
                totalPaid: amountPaid,
                isDeleted: false,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, `gyms/${userProfile.gymId}/members`), newMember);

            toast.success(`Member #${newMemberId} added successfully!`);
            navigate('/members');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    const selectedPlan = plans.find(p => p.id === formData.planId);
    const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
    const insuranceFee = formData.includeInsurance ? Number(formData.insuranceFee) : 0;
    const totalPrice = planPrice + insuranceFee;

    // Calculate outstanding balance in real-time
    const amountPaidValue = formData.isFullyPaid ? totalPrice : Number(formData.amountPaid) || 0;
    const outstandingBalance = Math.max(0, totalPrice - amountPaidValue);

    return (
        <DashboardLayout hideNav>
            <div className="max-w-2xl mx-auto pb-8">
                {/* Page Header with Close Button */}
                <PageHeader
                    title={t('members.addNewMember')}
                    backTo="/members"
                    backLabel={t('members.backToMembers')}
                    showClose
                    onClose={() => navigate('/members')}
                />
                <div className="flex items-center justify-center mb-10">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep >= 1
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            {currentStep > 1 ? <Check className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                        <span className="text-xs mt-2.5 font-medium">Information</span>
                    </div>

                    {/* Connector Line 1 */}
                    <div className={`w-24 h-0.5 mx-3 transition-colors ${currentStep > 1 ? 'bg-foreground' : 'bg-muted'}`} />

                    {/* Step 2 */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep >= 2
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            {currentStep > 2 ? <Check className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                        </div>
                        <span className="text-xs mt-2.5 font-medium">Plan</span>
                    </div>

                    {/* Connector Line 2 */}
                    <div className={`w-24 h-0.5 mx-3 transition-colors ${currentStep > 2 ? 'bg-foreground' : 'bg-muted'}`} />

                    {/* Step 3 */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep >= 3
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <IdCard className="h-5 w-5" />
                        </div>
                        <span className="text-xs mt-2.5 font-medium">ID Document</span>
                    </div>
                </div>

                {/* Form Steps */}
                <Card>
                    <CardContent className="p-6">
                        {/* Step 1: Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                {/* First Name + Last Name Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">{t('members.firstName')} *</Label>
                                        <Input
                                            id="firstName"
                                            value={formData.firstName}
                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            placeholder={t('members.enterFirstName')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">{t('members.lastName')} *</Label>
                                        <Input
                                            id="lastName"
                                            value={formData.lastName}
                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            placeholder={t('members.enterLastName')}
                                        />
                                    </div>
                                </div>

                                {/* Phone + Email Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('members.phoneNumber')} *</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            placeholder={t('members.enterPhone')}
                                            type="tel"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('members.email')} ({t('common.optional')})</Label>
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder={t('members.enterEmail')}
                                            type="email"
                                        />
                                    </div>
                                </div>

                                {/* CNI/ID Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="cniId">{t('members.cniNumber')} ({t('common.optional')})</Label>
                                    <Input
                                        id="cniId"
                                        value={formData.cniId}
                                        onChange={(e) => handleInputChange('cniId', e.target.value)}
                                        placeholder={t('members.enterCni')}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">{t('members.description')} ({t('common.optional')})</Label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder={t('members.enterDescription')}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Plan Selection */}
                        {currentStep === 2 && (
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="plan">Membership Plan *</Label>
                                    <Select value={formData.planId} onValueChange={(value) => handleInputChange('planId', value)}>
                                        <SelectTrigger id="plan">
                                            <SelectValue placeholder="Select a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>
                                                    {plan.name} - {plan.price} MAD ({plan.duration} days)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Fully Paid Toggle - Clickable Card */}
                                <div
                                    onClick={() => handleInputChange('isFullyPaid', !formData.isFullyPaid)}
                                    className="cursor-pointer p-4 rounded-lg border transition-all hover:bg-muted/60 dark:hover:bg-muted/20 bg-muted/40 dark:bg-muted/10"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="cursor-pointer text-base">{t('members.fullyPaid')}</Label>
                                            <p className="text-sm text-muted-foreground">
                                                {formData.isFullyPaid ? t('common.yes') : t('common.no')}
                                            </p>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                size="lg"
                                                checked={formData.isFullyPaid}
                                                onCheckedChange={(checked) => handleInputChange('isFullyPaid', checked)}
                                                className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!formData.isFullyPaid && (
                                    <div className="space-y-2">
                                        <Label htmlFor="amountPaid">Amount Paid (MAD) *</Label>
                                        <Input
                                            id="amountPaid"
                                            type="number"
                                            value={formData.amountPaid}
                                            onChange={(e) => handleInputChange('amountPaid', e.target.value)}
                                            placeholder="Enter amount paid"
                                            min="0"
                                            max={totalPrice}
                                            className={
                                                formData.amountPaid && Number(formData.amountPaid) > totalPrice
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : ''
                                            }
                                        />
                                        {formData.amountPaid && Number(formData.amountPaid) > totalPrice && (
                                            <p className="text-sm text-destructive">
                                                Amount exceeds total price ({totalPrice} MAD)
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Insurance - Clickable Card with Checkbox */}
                                <div
                                    onClick={() => handleInputChange('includeInsurance', !formData.includeInsurance)}
                                    className="cursor-pointer p-4 rounded-lg border transition-all hover:bg-muted/60 dark:hover:bg-muted/20 bg-muted/40 dark:bg-muted/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={formData.includeInsurance}
                                            onCheckedChange={(checked) => handleInputChange('includeInsurance', checked)}
                                            className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <div className="space-y-0.5">
                                            <Label className="cursor-pointer text-base">Include Insurance</Label>
                                            <p className="text-sm text-muted-foreground">
                                                {formData.insuranceFee} MAD
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {selectedPlan && (
                                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg mt-5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Plan Price:</span>
                                            <span className="font-medium">{planPrice} MAD</span>
                                        </div>
                                        {formData.includeInsurance && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Insurance:</span>
                                                <span className="font-medium">{insuranceFee} MAD</span>
                                            </div>
                                        )}
                                        <Separator className="my-2" />
                                        <div className="flex justify-between font-semibold">
                                            <span>Total:</span>
                                            <span>{totalPrice} MAD</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Amount Paid:</span>
                                            <span className="font-medium text-green-600">
                                                {amountPaidValue} MAD
                                            </span>
                                        </div>
                                        {outstandingBalance > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Outstanding:</span>
                                                <span className="font-medium text-destructive">
                                                    {outstandingBalance} MAD
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: CNI Upload */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>CNI/ID Document (Optional)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Upload or take a photo of the member's ID card
                                    </p>
                                </div>

                                {showUploadOptions && !cniPreview ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Upload from Gallery */}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="gallery-upload"
                                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                        />
                                        <div
                                            onClick={() => document.getElementById('gallery-upload').click()}
                                            className="cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center h-40"
                                        >
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <span className="font-medium text-sm">Upload from Gallery</span>
                                        </div>

                                        {/* Take Picture */}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            id="camera-upload"
                                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                        />
                                        <div
                                            onClick={() => document.getElementById('camera-upload').click()}
                                            className="cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center h-40"
                                        >
                                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                                <Camera className="h-6 w-6" />
                                            </div>
                                            <span className="font-medium text-sm">Take Picture</span>
                                        </div>
                                    </div>
                                ) : cniPreview ? (
                                    <div className="space-y-3">
                                        <div className="relative rounded-lg overflow-hidden border">
                                            <img
                                                src={cniPreview}
                                                alt="CNI Preview"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setCniFile(null);
                                                setCniPreview(null);
                                                setShowUploadOptions(true);
                                            }}
                                            className="w-full"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Remove & Upload New
                                        </Button>
                                    </div>
                                ) : null}

                                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <p className="text-sm text-blue-900 dark:text-blue-100">
                                        💡 You can skip this step and add the document later from the member's profile.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 1 || loading}
                        className="flex-1"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {t('common.previous')}
                    </Button>

                    {currentStep < 3 ? (
                        <Button onClick={handleNext} disabled={loading} className="flex-1">
                            {t('common.next')}
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                                    {t('common.loading')}
                                </>
                            ) : (
                                <>
                                    {t('members.addMember')}
                                    <Check className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Image Cropper Dialog */}
            <ImageCropper
                open={showCropDialog}
                onClose={() => {
                    setShowCropDialog(false);
                    setRawImageSrc(null);
                }}
                imageSrc={rawImageSrc}
                onCropComplete={handleCroppedImage}
                aspectRatio={1.59}
            />
        </DashboardLayout>
    );
}
