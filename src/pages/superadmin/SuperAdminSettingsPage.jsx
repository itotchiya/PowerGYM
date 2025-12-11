import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { ChevronRight, Lock, Globe, Moon, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function SuperAdminSettingsPage() {
    const { user, userProfile } = useAuth();
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(false);

    // Password Change State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    // Language Dialog State
    const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);

    // Email Change State
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailOtpStep, setEmailOtpStep] = useState('input');
    const [emailOtpCode, setEmailOtpCode] = useState("");

    // Phone Change State
    const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
    const [newPhone, setNewPhone] = useState("");
    const [phoneOtpStep, setPhoneOtpStep] = useState('input');
    const [phoneOtpCode, setPhoneOtpCode] = useState("");
    const [verificationId, setVerificationId] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

    // Initialize Recaptcha when Phone Dialog opens
    useEffect(() => {
        if (isPhoneDialogOpen && !recaptchaVerifier) {
            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-superadmin', {
                    'size': 'invisible',
                    'callback': () => { },
                    'expired-callback': () => {
                        toast.error(t('errors.recaptchaExpired'));
                    }
                });
                setRecaptchaVerifier(verifier);
            } catch (error) {
                console.error("Recaptcha init error:", error);
            }
        }
    }, [isPhoneDialogOpen, recaptchaVerifier]);

    // Handle Password Change
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

            const credential = EmailAuthProvider.credential(
                auth.currentUser.email,
                passwordForm.current
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, passwordForm.new);

            toast.success(t('settings.passwordUpdated'));
            setIsPasswordDialogOpen(false);
            setPasswordForm({ current: "", new: "", confirm: "" });
        } catch (error) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/wrong-password') {
                toast.error(t('settings.wrongPassword'));
            } else {
                toast.error(t('errors.somethingWentWrong'));
            }
        } finally {
            setIsLoading(false);
        }
    };

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

            await updateDoc(doc(db, 'users', user.uid), {
                email: newEmail.trim()
            });

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

    // Handle Phone Change - Step 1: Send OTP
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
            await verificationId.confirm(phoneOtpCode);

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
        <DashboardLayout>
            <PageHeader title={t('settings.title')} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Appearance Section */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">{t('settings.appearance')}</h3>
                    <div className="rounded-[20px] overflow-hidden">
                        {/* Language */}
                        <div
                            className={cn(
                                "bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                "flex items-center justify-between p-4"
                            )}
                            onClick={() => setIsLanguageDialogOpen(true)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{t('settings.language')}</p>
                                    <p className="text-sm text-muted-foreground">{t('settings.selectLanguage')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
                        </div>

                        <div className="h-px bg-border mx-4" />

                        {/* Dark Mode */}
                        <div
                            className={cn(
                                "bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                "flex items-center justify-between p-4"
                            )}
                            onClick={toggleTheme}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Moon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{t('settings.darkMode')}</p>
                                    <p className="text-sm text-muted-foreground">{t('settings.toggleDarkMode')}</p>
                                </div>
                            </div>
                            <Switch
                                checked={theme === 'dark'}
                                onCheckedChange={toggleTheme}
                            />
                        </div>
                    </div>
                </div>

                {/* Account Section */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">{t('settings.account')}</h3>
                    <div className="rounded-[20px] overflow-hidden">
                        {/* Email */}
                        <div
                            className={cn(
                                "bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                "flex items-center justify-between p-4"
                            )}
                            onClick={() => setIsEmailDialogOpen(true)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium">{t('settings.email')}</p>
                                    <p className="text-sm text-muted-foreground">{userProfile?.email || user?.email || '-'}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm">{t('common.change')}</Button>
                        </div>

                        <div className="h-px bg-border mx-4" />

                        {/* Phone */}
                        <div
                            className={cn(
                                "bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                "flex items-center justify-between p-4"
                            )}
                            onClick={() => setIsPhoneDialogOpen(true)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-medium">{t('settings.phoneNumber')}</p>
                                    <p className="text-sm text-muted-foreground">{userProfile?.phone || '-'}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm">{t('common.change')}</Button>
                        </div>

                        <div className="h-px bg-border mx-4" />

                        {/* Password */}
                        <div
                            className={cn(
                                "bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                "flex items-center justify-between p-4"
                            )}
                            onClick={() => setIsPasswordDialogOpen(true)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="font-medium">{t('settings.changePassword')}</p>
                                    <p className="text-sm text-muted-foreground">{t('settings.changePasswordDesc')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.changePassword')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.changePasswordDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-pass">{t('settings.currentPassword')}</Label>
                            <Input
                                id="current-pass"
                                type="password"
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

            {/* Language Dialog */}
            <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.language')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.selectLanguage')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <LanguageSwitcher variant="list" onLanguageChange={() => setIsLanguageDialogOpen(false)} />
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
                                    className="text-center text-2xl tracking-widest"
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

            {/* Phone Change Dialog */}
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
                                <div id="recaptcha-container-superadmin" className="mt-2"></div>
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
                                    className="text-center text-2xl tracking-widest"
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
