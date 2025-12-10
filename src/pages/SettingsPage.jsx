import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Lock, Shield } from "lucide-react";

export function SettingsPage() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setLoading(true);

        try {
            // Verify old password hash
            const currentHash = btoa(currentPassword);
            if (currentHash !== userProfile?.ownerPasswordHash) {
                toast.error("Current password is incorrect");
                setLoading(false);
                return;
            }

            // Update with new hash
            const newHash = btoa(newPassword);
            await updateDoc(doc(db, "users", user.uid), {
                ownerPasswordHash: newHash
            });

            toast.success("Owner password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Error updating password:", error);
            toast.error("Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-2xl mx-auto py-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your gym settings and security preferences.
                    </p>
                </div>
                <Separator />

                <div className="space-y-6">
                    {/* Security Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <CardTitle>Owner Security</CardTitle>
                            </div>
                            <CardDescription>
                                Manage the password used to access the Owner Dashboard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current">Current Owner Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="current"
                                            type="password"
                                            className="pl-9"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter current password"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="new">New Password</Label>
                                        <Input
                                            id="new"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm">Confirm New Password</Label>
                                        <Input
                                            id="confirm"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* General Settings Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gym Information</CardTitle>
                            <CardDescription>
                                Update your gym's public details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Gym Name</Label>
                                <Input disabled value={userProfile?.gymName || ""} />
                                <p className="text-xs text-muted-foreground">
                                    Contact Super Admin to change your gym name.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
