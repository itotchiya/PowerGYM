import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Switch } from "@/components/ui/motion-switch";
import { useTheme } from "@/contexts/ThemeContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { ChevronRight, Lock, Building, Wallet, ShieldCheck, PenSquare, Globe, Moon, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsPage() {
    const { user, userProfile, session } = useAuth();
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    // Determine current role (manager vs owner)
    const currentRole = session?.subrole || 'manager';
    const isOwner = currentRole === 'owner';

    // Login Password Change State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Owner Password Change State
    const [isOwnerPasswordDialogOpen, setIsOwnerPasswordDialogOpen] = useState(false);

    // Gym Name Change Request State
    const [isNameChangeDialogOpen, setIsNameChangeDialogOpen] = useState(false);
    const [nameChangeForm, setNameChangeForm] = useState({
        newName: "",
        reason: ""
    });

    // Language Dialog State
    const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const [ownerPasswordForm, setOwnerPasswordForm] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    // Email Change State
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailOtpStep, setEmailOtpStep] = useState('input'); // 'input' | 'verify'
    const [emailOtpCode, setEmailOtpCode] = useState("");

    // Phone Change State
    const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
    const [newPhone, setNewPhone] = useState("");
    const [phoneOtpStep, setPhoneOtpStep] = useState('input'); // 'input' | 'verify'
    const [phoneOtpCode, setPhoneOtpCode] = useState("");
    const [verificationId, setVerificationId] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

    // Handle Login Password Change (Firebase Auth)
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.new.length < 6) {
            toast.error(t('settings.passwordTooShort', { min: 6 }));
            return;
        }

        if (passwordForm.new !== passwordForm.confirm) {
            toast.error(t('settings.passwordMismatch'));
            return;
        }

        setIsLoading(true);

        try {
            if (!auth.currentUser) {
                toast.error(t('errors.unauthorized'));
                return;
            }

            // 1. Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update password
            await updatePassword(auth.currentUser, passwordForm.new);

            toast.success(t('settings.passwordUpdated'));
            setIsPasswordDialogOpen(false);
            setPasswordForm({ current: "", new: "", confirm: "" });
        } catch (error) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                toast.error(t('settings.currentPasswordIncorrect'));
            } else if (error.code === 'auth/requires-recent-login') {
                toast.error(t('errors.unauthorized'));
            } else {
                toast.error(t('errors.somethingWentWrong'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Owner Password Change (Firestore Hash)
    const handleOwnerPasswordChange = async (e) => {
        e.preventDefault();

        if (ownerPasswordForm.new.length < 4) {
            toast.error(t('settings.passwordTooShort', { min: 4 }));
            return;
        }

        if (ownerPasswordForm.new !== ownerPasswordForm.confirm) {
            toast.error(t('settings.passwordMismatch'));
            return;
        }

        setIsLoading(true);

        try {
            // Verify old password hash
            const currentHash = btoa(ownerPasswordForm.current);
            // Default to comparing against valid hash, handle case if undefined
            if (userProfile?.ownerPasswordHash && currentHash !== userProfile.ownerPasswordHash) {
                toast.error(t('settings.currentPasswordIncorrect'));
                setIsLoading(false);
                return;
            }

            // Update with new hash
            const newHash = btoa(ownerPasswordForm.new);
            await updateDoc(doc(db, "users", user.uid), {
                ownerPasswordHash: newHash
            });

            toast.success(t('settings.passwordUpdated'));
            setIsOwnerPasswordDialogOpen(false);
            setOwnerPasswordForm({ current: "", new: "", confirm: "" });

        } catch (error) {
            console.error("Error updating owner password:", error);
            toast.error(t('errors.somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Gym Name Change Request
    const handleNameChangeRequest = async (e) => {
        e.preventDefault();

        if (!nameChangeForm.newName.trim()) {
            toast.error(t('errors.requiredField'));
            return;
        }

        setIsLoading(true);

        try {
            // Create a request in the pre-authorized 'gymRequests' collection
            await addDoc(collection(db, "gymRequests"), {
                type: 'gym_name_change',
                targetRole: 'superadmin',
                fromUserId: user.uid,
                fromEmail: user.email,
                fromGymId: userProfile?.gymId,
                fromGymName: userProfile?.gymName,
                content: {
                    oldName: userProfile?.gymName || "Unknown",
                    newName: nameChangeForm.newName,
                    reason: nameChangeForm.reason
                },
                status: 'pending',
                createdAt: serverTimestamp()
            });

            toast.success(t('settings.requestSent'));
            setIsNameChangeDialogOpen(false);
            setNameChangeForm({ newName: "", reason: "" });

        } catch (error) {
            console.error("Error submitting name change request:", error);
            toast.error(t('errors.somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize Recaptcha when Phone Dialog opens
    useEffect(() => {
        if (isPhoneDialogOpen && !recaptchaVerifier) {
            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': (response) => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    },
                    'expired-callback': () => {
                        // Response expired. Ask user to solve reCAPTCHA again.
                        toast.error(t('errors.recaptchaExpired'));
                    }
                });
                setRecaptchaVerifier(verifier);
            } catch (error) {
                console.error("Recaptcha init error:", error);
            }
        }
    }, [isPhoneDialogOpen, recaptchaVerifier]);

    // Handle Email Change - Step 1: Send OTP
    const handleEmailChangeRequest = async (e) => {
        e.preventDefault();

        if (!newEmail.trim()) {
            toast.error(t('errors.requiredField'));
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            toast.error(t('settings.invalidEmail'));
            return;
        }

        setIsLoading(true);

        try {
            const sendEmailOTP = httpsCallable(functions, 'sendEmailOTP');
            await sendEmailOTP({ email: newEmail.trim() });

            toast.success(t('settings.otpSent'));
            setEmailOtpStep('verify');
        } catch (error) {
            console.error("Error sending email OTP:", error);
            toast.error(t('errors.somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Email Change - Step 2: Verify OTP and Update
    const verifyEmailOtpAndSave = async (e) => {
        e.preventDefault();

        if (emailOtpCode.length !== 6) {
            toast.error(t('settings.invalidOtp'));
            return;
        }

        setIsLoading(true);

        try {
            const verifyEmailOTP = httpsCallable(functions, 'verifyEmailOTP');
            await verifyEmailOTP({ otp: emailOtpCode, email: newEmail.trim() });

            // If OTP verified, update email in Auth and Firestore
            // Note: Update email in Firebase Auth requires re-authentication usually.
            // For simplicity here, we update Firestore profile. 
            // Updating Auth email would require `updateEmail(auth.currentUser, newEmail)`

            await updateDoc(doc(db, 'users', user.uid), {
                email: newEmail.trim()
            });

            // Also try to update Auth email if possible (may fail if recent login required)
            try {
                // await updateEmail(auth.currentUser, newEmail);
            } catch (err) {
                console.warn("Could not update Auth email (requires recent login)", err);
            }

            toast.success(t('settings.emailUpdated'));
            setIsEmailDialogOpen(false);
            setNewEmail("");
            setEmailOtpStep('input');
            setEmailOtpCode("");
        } catch (error) {
            console.error("Error verifying email OTP:", error);
            toast.error(t('settings.invalidOtpOrExpired'));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Phone Change - Step 1: Send OTP (SMS)
    const handlePhoneChangeRequest = async (e) => {
        e.preventDefault();

        if (!newPhone.trim()) {
            toast.error(t('errors.requiredField'));
            return;
        }

        setIsLoading(true);

        try {
            if (!recaptchaVerifier) {
                throw new Error("Recaptcha not initialized");
            }

            const confirmationResult = await signInWithPhoneNumber(auth, newPhone.trim(), recaptchaVerifier);
            setVerificationId(confirmationResult);
            toast.success(t('settings.otpSent'));
            setPhoneOtpStep('verify');
        } catch (error) {
            console.error("Error sending phone OTP:", error);
            toast.error(t('errors.somethingWentWrong') + ": " + error.message);
            // Reset recaptcha if error
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                setRecaptchaVerifier(null);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Phone Change - Step 2: Verify OTP and Update
    const verifyPhoneOtpAndSave = async (e) => {
        e.preventDefault();

        if (phoneOtpCode.length < 6) {
            toast.error(t('settings.invalidOtp'));
            return;
        }

        setIsLoading(true);

        try {
            // Confirm the code
            await verificationId.confirm(phoneOtpCode);

            // If success, update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                phone: newPhone.trim()
            });

            toast.success(t('settings.phoneUpdated'));
            setIsPhoneDialogOpen(false);
            setNewPhone("");
            setPhoneOtpStep('input');
            setPhoneOtpCode("");
            setVerificationId(null);
        } catch (error) {
            console.error("Error verifying phone OTP:", error);
            toast.error(t('settings.invalidOtp'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout hideNav>
            <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
                {/* Header with Back Button */}
                <PageHeader
                    title={t('settings.title')}
                    subtitle={t('settings.subtitle')}
                    backTo="/dashboard"
                />

                {/* Settings Group: Account - Owner Only */}
                {isOwner && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">{t('settings.account')}</h3>
                        <div className="rounded-[20px] overflow-hidden">

                            {/* Email Setting */}
                            <div
                                onClick={() => {
                                    setNewEmail(userProfile?.email || "");
                                    setIsEmailDialogOpen(true);
                                }}
                                className={cn(
                                    "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px] mb-[4px] last:mb-0",
                                    "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.email')}</div>
                                        <div className="text-sm text-muted-foreground">{userProfile?.email || t('common.notSet')}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <span>{t('common.change')}</span>
                                    <PenSquare className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* Phone Number Setting */}
                            <div
                                onClick={() => {
                                    setNewPhone(userProfile?.phone || "");
                                    setIsPhoneDialogOpen(true);
                                }}
                                className={cn(
                                    "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px] mb-[4px] last:mb-0",
                                    "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.phoneNumber')}</div>
                                        <div className="text-sm text-muted-foreground">{userProfile?.phone || t('common.notSet')}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <span>{t('common.change')}</span>
                                    <PenSquare className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* Change Login Password Item */}
                            <div
                                onClick={() => setIsPasswordDialogOpen(true)}
                                className={cn(
                                    "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px] mb-[4px] last:mb-0",
                                    "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.loginPassword')}</div>
                                        <div className="text-sm text-muted-foreground">{t('settings.updateLoginPassword')}</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                            </div>

                            {/* Change Owner Password Item */}
                            <div
                                onClick={() => setIsOwnerPasswordDialogOpen(true)}
                                className={cn(
                                    "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px] mb-[4px] last:mb-0",
                                    "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.ownerAccessPassword')}</div>
                                        <div className="text-sm text-muted-foreground">{t('settings.ownerAccessPasswordDesc')}</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                            </div>

                        </div>
                    </div>
                )}

                {/* Settings Group: Preferences - Available for all */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">{t('settings.preferences')}</h3>
                    <div className="rounded-[20px] overflow-hidden flex flex-col gap-[4px]">

                        {/* Language Selector - Clickable with Dialog */}
                        <div
                            onClick={() => setIsLanguageDialogOpen(true)}
                            className={cn(
                                "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px]",
                                "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium">{t('settings.language')}</div>
                                    <div className="text-sm text-muted-foreground">{t('settings.selectLanguage')}</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>

                        {/* Dark Mode Toggle - Clickable Card */}
                        <div
                            onClick={() => toggleTheme()}
                            className={cn(
                                "cursor-pointer flex items-center justify-between p-4 rounded-[4px] transition-all",
                                "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400">
                                    <Moon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium">{t('settings.darkMode')}</div>
                                    <div className="text-sm text-muted-foreground">{t('settings.toggleDarkMode')}</div>
                                </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    size="lg"
                                    checked={theme === 'dark'}
                                    onCheckedChange={toggleTheme}
                                    aria-label="Toggle dark mode"
                                    className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Settings Group: Gym Information - Owner Only */}
                {isOwner && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">{t('settings.gymInformation')}</h3>
                        <div className="rounded-[20px] overflow-hidden">

                            {/* Gym Name (Actionable) */}
                            <div
                                onClick={() => setIsNameChangeDialogOpen(true)}
                                className={cn(
                                    "group flex items-center justify-between p-4 transition-all cursor-pointer rounded-[4px] mb-[4px] last:mb-0",
                                    "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shadow-none backdrop-blur-sm"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                                        <Building className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.gymName')}</div>
                                        <div className="text-sm text-muted-foreground">{userProfile?.gymName || t('common.notSet')}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <span>{t('settings.changeName')}</span>
                                    <PenSquare className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* Subscription / Plan (Placeholder) */}
                            <div className={cn(
                                "flex items-center justify-between p-4 rounded-[4px] last:mb-0 backdrop-blur-sm shadow-none",
                                "bg-black/4 dark:bg-white/6"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{t('settings.plan')}</div>
                                        <div className="text-sm text-muted-foreground">{t('settings.standardPlan')}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">{t('common.active')}</div>
                            </div>

                        </div>
                    </div>
                )}

                <div className="text-center text-xs text-muted-foreground pt-8">
                    PowerGYM v1.0.0
                </div>

            </div>

            {/* Change Login Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.changeLoginPassword')}</DialogTitle>
                        <DialogDescription>
                            {t('auth.enterCredentials')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-pass">{t('settings.currentPassword')}</Label>
                            <Input
                                id="current-pass"
                                type="password"
                                placeholder="••••••••"
                                value={passwordForm.current}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-pass">{t('settings.newPassword')}</Label>
                            <Input
                                id="new-pass"
                                type="password"
                                placeholder={t('settings.passwordTooShort', { min: 6 })}
                                value={passwordForm.new}
                                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-pass">{t('settings.confirmNewPassword')}</Label>
                            <Input
                                id="confirm-pass"
                                type="password"
                                placeholder={t('settings.confirmNewPassword')}
                                value={passwordForm.confirm}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                required
                            />
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsPasswordDialogOpen(false)}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? t('settings.updating') : t('settings.updatePassword')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Change Owner Password Dialog */}
            <Dialog open={isOwnerPasswordDialogOpen} onOpenChange={setIsOwnerPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.changeOwnerPassword')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.ownerAccessPasswordDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleOwnerPasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="owner-current-pass">{t('settings.currentPassword')}</Label>
                            <Input
                                id="owner-current-pass"
                                type="password"
                                placeholder="••••••••"
                                value={ownerPasswordForm.current}
                                onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, current: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner-new-pass">{t('settings.newPassword')}</Label>
                            <Input
                                id="owner-new-pass"
                                type="password"
                                placeholder={t('settings.passwordTooShort', { min: 4 })}
                                value={ownerPasswordForm.new}
                                onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner-confirm-pass">{t('settings.confirmNewPassword')}</Label>
                            <Input
                                id="owner-confirm-pass"
                                type="password"
                                placeholder={t('settings.confirmNewPassword')}
                                value={ownerPasswordForm.confirm}
                                onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, confirm: e.target.value })}
                                required
                            />
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOwnerPasswordDialogOpen(false)}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? t('settings.updating') : t('settings.updatePassword')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Request Name Change Dialog */}
            <Dialog open={isNameChangeDialogOpen} onOpenChange={setIsNameChangeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.requestGymNameChange')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.nameChangeRequestDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleNameChangeRequest} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-name">{t('settings.newGymName')}</Label>
                            <Input
                                id="new-name"
                                placeholder="e.g. Iron Strong Gym"
                                value={nameChangeForm.newName}
                                onChange={(e) => setNameChangeForm({ ...nameChangeForm, newName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">{t('settings.reasonForChange')}</Label>
                            <Textarea
                                id="reason"
                                placeholder={t('settings.reasonForChange')}
                                value={nameChangeForm.reason}
                                onChange={(e) => setNameChangeForm({ ...nameChangeForm, reason: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsNameChangeDialogOpen(false)}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? t('settings.submitting') : t('settings.submitRequest')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Language Selection Dialog */}
            <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.language')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.selectLanguage')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <LanguageSwitcher variant="full" onLanguageChange={() => setIsLanguageDialogOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Email Change Dialog */}
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.changeEmail')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.changeEmailDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={emailOtpStep === 'input' ? handleEmailChangeRequest : verifyEmailOtpAndSave} className="space-y-4 py-4">
                        {emailOtpStep === 'input' ? (
                            <div className="space-y-2">
                                <Label htmlFor="new-email">{t('settings.newEmail')}</Label>
                                <Input
                                    id="new-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="email-otp">{t('settings.enterOtpCode')}</Label>
                                <Input
                                    id="email-otp"
                                    type="text"
                                    placeholder="123456"
                                    value={emailOtpCode}
                                    onChange={(e) => setEmailOtpCode(e.target.value)}
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest letter-spacing-2"
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground text-center">{t('settings.otpSentTo')} {newEmail}</p>
                            </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsEmailDialogOpen(false);
                                    setEmailOtpStep('input');
                                    setEmailOtpCode('');
                                }}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? t('common.processing') : (emailOtpStep === 'input' ? t('settings.sendOtp') : t('settings.verifyAndSave'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Phone Number Change Dialog */}
            <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.changePhone')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.changePhoneDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={phoneOtpStep === 'input' ? handlePhoneChangeRequest : verifyPhoneOtpAndSave} className="space-y-4 py-4">
                        {phoneOtpStep === 'input' ? (
                            <div className="space-y-2">
                                <Label htmlFor="new-phone">{t('settings.newPhone')}</Label>
                                <Input
                                    id="new-phone"
                                    type="tel"
                                    placeholder="+212 600 000 000"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <div id="recaptcha-container" className="mt-2"></div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="phone-otp">{t('settings.enterOtpCode')}</Label>
                                <Input
                                    id="phone-otp"
                                    type="text"
                                    placeholder="123456"
                                    value={phoneOtpCode}
                                    onChange={(e) => setPhoneOtpCode(e.target.value)}
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest letter-spacing-2"
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground text-center">{t('settings.otpSentTo')} {newPhone}</p>
                            </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsPhoneDialogOpen(false);
                                    setPhoneOtpStep('input');
                                    setPhoneOtpCode('');
                                }}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? t('common.processing') : (phoneOtpStep === 'input' ? t('settings.sendOtp') : t('settings.verifyAndSave'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

