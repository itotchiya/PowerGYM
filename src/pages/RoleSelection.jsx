import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    User,
    LockKeyhole,
    ArrowRight,
    Loader2,
    Unlock
} from "lucide-react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function RoleSelection() {
    const { user, userProfile, setSession } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Dialog states
    const [showPasswordSetup, setShowPasswordSetup] = useState(false);
    const [showPasswordVerify, setShowPasswordVerify] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");

    const hasOwnerPassword = !!userProfile?.ownerPasswordHash;

    const handleOwnerSelect = () => {
        if (!hasOwnerPassword) {
            setShowPasswordSetup(true);
        } else {
            setShowPasswordVerify(true);
        }
    };

    const handleManagerSelect = async () => {
        setLoading(true);
        try {
            await setSession({ subrole: 'manager' });
            navigate('/dashboard');
        } catch (error) {
            console.error("Error setting manager session:", error);
            toast.error("Failed to enter as manager");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSetupSubmit = async (e) => {
        e.preventDefault();

        if (passwordInput.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            // In a real app, use bcrypt on backend. Here using simple hash for demo
            const hash = btoa(passwordInput);

            await updateDoc(doc(db, 'users', user.uid), {
                ownerPasswordHash: hash
            });

            // Update local profile state would happen via AuthContext listener usually,
            // but for immediate transition we proceed
            await setSession({ subrole: 'owner' });
            navigate('/dashboard');
            toast.success("Owner password set successfully");
        } catch (error) {
            console.error("Error setting password:", error);
            toast.error("Failed to set password");
        } finally {
            setLoading(false);
            setShowPasswordSetup(false);
        }
    };

    const handlePasswordVerifySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const hash = btoa(passwordInput);
            if (hash === userProfile.ownerPasswordHash) {
                await setSession({ subrole: 'owner' });
                navigate('/dashboard');
            } else {
                toast.error("Incorrect owner password");
                setPasswordInput("");
            }
        } catch (error) {
            console.error("Error verifying password:", error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="text-center mb-10 space-y-2">
                <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Select Access Level</h1>
                <p className="text-muted-foreground text-lg">
                    Choose how you want to access {userProfile?.gymName || "PowerGYM"}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
                {/* Owner Card */}
                <Card
                    className="group relative cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg overflow-hidden border-2"
                    onClick={handleOwnerSelect}
                >
                    <div className="absolute top-4 right-4 bg-primary/10 text-primary p-2 rounded-full">
                        <LockKeyhole className="h-5 w-5" />
                    </div>
                    <CardContent className="p-8 flex flex-col items-center text-center h-full justify-center space-y-6">
                        <div className="p-4 bg-primary rounded-full group-hover:scale-110 transition-transform duration-300">
                            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Owner Access</h3>
                            <p className="text-muted-foreground">
                                Protected Administrative Area
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Manager Card */}
                <Card
                    className="group relative cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg overflow-hidden border-2"
                    onClick={handleManagerSelect}
                >
                    <div className="absolute top-4 right-4 bg-muted text-muted-foreground p-2 rounded-full">
                        <Unlock className="h-5 w-5" />
                    </div>
                    <CardContent className="p-8 flex flex-col items-center text-center h-full justify-center space-y-6">
                        <div className="p-4 bg-secondary rounded-full group-hover:scale-110 transition-transform duration-300">
                            <User className="h-10 w-10 text-secondary-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Manager Access</h3>
                            <p className="text-muted-foreground">
                                Daily Operations & Members
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Password Verification Dialog */}
            <Dialog open={showPasswordVerify} onOpenChange={setShowPasswordVerify}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Owner Verification</DialogTitle>
                        <DialogDescription>
                            Please enter your owner password to continue.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordVerifySubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="verify-password">Password</Label>
                                <Input
                                    id="verify-password"
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Enter your password"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify & Enter
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Setup Dialog */}
            <Dialog open={showPasswordSetup} onOpenChange={setShowPasswordSetup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Owner Password</DialogTitle>
                        <DialogDescription>
                            Create a secure password for Owner access. You will need this to access sensitive features.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordSetupSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="setup-password">Create Password</Label>
                                <Input
                                    id="setup-password"
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Set Password & Enter
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
