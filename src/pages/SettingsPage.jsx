import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ChevronRight, Lock, Building, Wallet, ShieldCheck, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsPage() {
    const { user, userProfile } = useAuth();

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

    // Handle Login Password Change (Firebase Auth)
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.new.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        if (passwordForm.new !== passwordForm.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            if (!auth.currentUser) {
                toast.error("User not authenticated.");
                return;
            }

            // 1. Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update password
            await updatePassword(auth.currentUser, passwordForm.new);

            toast.success("Login password updated successfully");
            setIsPasswordDialogOpen(false);
            setPasswordForm({ current: "", new: "", confirm: "" });
        } catch (error) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                toast.error("Current password is incorrect");
            } else if (error.code === 'auth/requires-recent-login') {
                toast.error("Please log out and log back in to change your password.");
            } else {
                toast.error("Failed to update password. " + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Owner Password Change (Firestore Hash)
    const handleOwnerPasswordChange = async (e) => {
        e.preventDefault();

        if (ownerPasswordForm.new.length < 4) {
            toast.error("Owner password must be at least 4 characters");
            return;
        }

        if (ownerPasswordForm.new !== ownerPasswordForm.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            // Verify old password hash
            const currentHash = btoa(ownerPasswordForm.current);
            // Default to comparing against valid hash, handle case if undefined
            if (userProfile?.ownerPasswordHash && currentHash !== userProfile.ownerPasswordHash) {
                toast.error("Current owner password is incorrect");
                setIsLoading(false);
                return;
            }

            // Update with new hash
            const newHash = btoa(ownerPasswordForm.new);
            await updateDoc(doc(db, "users", user.uid), {
                ownerPasswordHash: newHash
            });

            toast.success("Owner access password updated successfully");
            setIsOwnerPasswordDialogOpen(false);
            setOwnerPasswordForm({ current: "", new: "", confirm: "" });

        } catch (error) {
            console.error("Error updating owner password:", error);
            toast.error("Failed to update owner password");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Gym Name Change Request
    const handleNameChangeRequest = async (e) => {
        e.preventDefault();

        if (!nameChangeForm.newName.trim()) {
            toast.error("Please enter a new name");
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

            toast.success("Name change request sent to PowerGYM team! You will be notified when it's reviewed.");
            setIsNameChangeDialogOpen(false);
            setNameChangeForm({ newName: "", reason: "" });

        } catch (error) {
            console.error("Error submitting name change request:", error);
            toast.error("Failed to submit request");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your account preferences and gym details.
                    </p>
                </div>

                {/* Settings Group: Account */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">Account</h3>
                    <div className="rounded-[20px] overflow-hidden">

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
                                    <div className="font-medium">Login Password</div>
                                    <div className="text-sm text-muted-foreground">Update your account login password</div>
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
                                    <div className="font-medium">Owner Access Password</div>
                                    <div className="text-sm text-muted-foreground">Password for sensitive owner actions</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        </div>

                    </div>
                </div>

                {/* Settings Group: Gym Information */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground ml-4 uppercase tracking-wider">Gym Information</h3>
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
                                    <div className="font-medium">Gym Name</div>
                                    <div className="text-sm text-muted-foreground">{userProfile?.gymName || "Not set"}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                <span>Change Name</span>
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
                                    <div className="font-medium">Plan</div>
                                    <div className="text-sm text-muted-foreground">Standard Plan</div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">Active</div>
                        </div>

                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground pt-8">
                    PowerGYM v1.0.0
                </div>

            </div>

            {/* Change Login Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Login Password</DialogTitle>
                        <DialogDescription>
                            Enter your current password to verify your identity, then create a new password.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-pass">Current Password</Label>
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
                            <Label htmlFor="new-pass">New Password</Label>
                            <Input
                                id="new-pass"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={passwordForm.new}
                                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-pass">Confirm New Password</Label>
                            <Input
                                id="confirm-pass"
                                type="password"
                                placeholder="Re-enter new password"
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Update Password"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Change Owner Password Dialog */}
            <Dialog open={isOwnerPasswordDialogOpen} onOpenChange={setIsOwnerPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Owner Access Password</DialogTitle>
                        <DialogDescription>
                            This password is used to verify sensitive actions within the owner dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleOwnerPasswordChange} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="owner-current-pass">Current Owner Password</Label>
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
                            <Label htmlFor="owner-new-pass">New Owner Password</Label>
                            <Input
                                id="owner-new-pass"
                                type="password"
                                placeholder="Min. 4 characters"
                                value={ownerPasswordForm.new}
                                onChange={(e) => setOwnerPasswordForm({ ...ownerPasswordForm, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner-confirm-pass">Confirm New Password</Label>
                            <Input
                                id="owner-confirm-pass"
                                type="password"
                                placeholder="Re-enter new password"
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Update Owner Password"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Request Name Change Dialog */}
            <Dialog open={isNameChangeDialogOpen} onOpenChange={setIsNameChangeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Gym Name Change</DialogTitle>
                        <DialogDescription>
                            Submitting this form will send a request to the Super Admin for approval.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleNameChangeRequest} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-name">New Gym Name</Label>
                            <Input
                                id="new-name"
                                placeholder="e.g. Iron Strong Gym"
                                value={nameChangeForm.newName}
                                onChange={(e) => setNameChangeForm({ ...nameChangeForm, newName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Change</Label>
                            <Textarea
                                id="reason"
                                placeholder="Briefly explain why you are changing the name..."
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Submitting..." : "Submit Request"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
