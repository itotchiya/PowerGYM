import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dumbbell, Loader2, Building2, AlertCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Registration form state
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        ownerName: "",
        email: "",
        phone: "",
        gymName: "",
        gymAddress: "",
        message: ""
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(""); // Clear previous error

        const result = await signIn(email, password);

        if (result.success) {
            toast.success(t('auth.signedInSuccess') || 'Signed in successfully!');
        } else {
            // Parse Firebase error codes for user-friendly messages
            let errorMessage = t('auth.invalidCredentials') || 'Invalid email or password';

            if (result.error?.includes('user-not-found') || result.error?.includes('wrong-password') || result.error?.includes('invalid-credential')) {
                errorMessage = t('auth.invalidCredentials') || 'Invalid email or password. Please check your credentials and try again.';
            } else if (result.error?.includes('too-many-requests')) {
                errorMessage = t('auth.tooManyAttempts') || 'Too many failed attempts. Please try again later.';
            } else if (result.error?.includes('network')) {
                errorMessage = t('auth.networkError') || 'Network error. Please check your connection.';
            } else if (result.error?.includes('user-disabled')) {
                errorMessage = t('auth.accountDisabled') || 'This account has been disabled. Contact support.';
            }

            setError(errorMessage);
            toast.error(errorMessage);
        }

        setLoading(false);
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();

        if (!registerForm.ownerName || !registerForm.email || !registerForm.phone || !registerForm.gymName) {
            toast.error(t('errors.requiredField'));
            return;
        }

        setRegisterLoading(true);

        try {
            await addDoc(collection(db, "gymRequests"), {
                ...registerForm,
                status: "pending",
                createdAt: serverTimestamp(),
            });

            toast.success("Application submitted! We will contact you soon.");
            setShowRegisterDialog(false);
            setRegisterForm({
                ownerName: "",
                email: "",
                phone: "",
                gymName: "",
                gymAddress: "",
                message: ""
            });
        } catch (error) {
            console.error("Error submitting application:", error);
            toast.error(t('errors.somethingWentWrong'));
        } finally {
            setRegisterLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary p-3 rounded-full">
                            <Dumbbell className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Welcome to PowerGYM</CardTitle>
                    <CardDescription>{t('auth.enterCredentials')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">{t('auth.email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@gymmaster.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                required
                                disabled={loading}
                                className={error ? "border-destructive" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('auth.password')}</Label>
                            <PasswordInput
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                required
                                disabled={loading}
                                className={error ? "border-destructive" : ""}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? `${t('common.loading')}` : t('auth.signIn')}
                        </Button>
                    </form>

                    {/* Gym Owner Registration Link */}
                    <div className="mt-6 pt-6 border-t text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                            {t('auth.dontHaveAccount')}
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowRegisterDialog(true)}
                        >
                            <Building2 className="mr-2 h-4 w-4" />
                            I'm a Gym Owner - Join PowerGYM
                        </Button>
                    </div>

                </CardContent>
            </Card>

            {/* Registration Dialog */}
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Join PowerGYM
                        </DialogTitle>
                        <DialogDescription>
                            Fill out the form below and we'll contact you to set up your gym account.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ownerName">Your Name *</Label>
                                <Input
                                    id="ownerName"
                                    placeholder="John Doe"
                                    value={registerForm.ownerName}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, ownerName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="regPhone">{t('members.phoneNumber')} *</Label>
                                <Input
                                    id="regPhone"
                                    type="tel"
                                    placeholder="+212 600 000 000"
                                    value={registerForm.phone}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="regEmail">{t('auth.emailAddress')} *</Label>
                            <Input
                                id="regEmail"
                                type="email"
                                placeholder="you@example.com"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gymName">{t('settings.gymName')} *</Label>
                            <Input
                                id="gymName"
                                placeholder="Fitness Pro Gym"
                                value={registerForm.gymName}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, gymName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gymAddress">{t('members.address')}</Label>
                            <Input
                                id="gymAddress"
                                placeholder="123 Main Street, City"
                                value={registerForm.gymAddress}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, gymAddress: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Tell us about your gym..."
                                value={registerForm.message}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, message: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRegisterDialog(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={registerLoading}>
                                {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {registerLoading ? t('settings.submitting') : t('common.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}


