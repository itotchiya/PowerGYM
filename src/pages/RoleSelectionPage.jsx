import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCog, Users } from "lucide-react";

export function RoleSelectionPage() {
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [password, setPassword] = useState("");
    const { setUserSession } = useAuth();
    const navigate = useNavigate();

    const handleManagerSelect = async () => {
        await setUserSession('manager');
        toast.success("Logged in as Manager");
        navigate('/dashboard');
    };

    const handleOwnerSelect = () => {
        setShowPasswordDialog(true);
    };

    const handleOwnerPassword = async (e) => {
        e.preventDefault();

        const ownerPassword = import.meta.env.VITE_OWNER_PASSWORD;

        if (password === ownerPassword) {
            await setUserSession('owner');
            toast.success("Logged in as Owner");
            setShowPasswordDialog(false);
            navigate('/dashboard');
        } else {
            toast.error("Incorrect owner password");
            setPassword("");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Select Your Role</CardTitle>
                    <CardDescription>Choose how you want to access the system</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {/* Manager Card */}
                    <Card
                        className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                        onClick={handleManagerSelect}
                    >
                        <CardContent className="p-6 text-center">
                            <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Manager</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Day-to-day operations and member management
                            </p>
                            <ul className="text-xs text-left space-y-1 text-muted-foreground">
                                <li>• View members and subscriptions</li>
                                <li>• Add warnings and notes</li>
                                <li>• View reports and analytics</li>
                                <li>• No financial access</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Owner Card */}
                    <Card
                        className="cursor-pointer hover:border-orange-500 transition-all hover:shadow-lg border-orange-500/20"
                        onClick={handleOwnerSelect}
                    >
                        <CardContent className="p-6 text-center">
                            <div className="bg-orange-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserCog className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Owner</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Full administrative access and control
                            </p>
                            <ul className="text-xs text-left space-y-1 text-muted-foreground">
                                <li>• Complete member management</li>
                                <li>• Revenue and financial insights</li>
                                <li>• Manage plans and pricing</li>
                                <li>• Access to all features</li>
                            </ul>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            {/* Owner Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Owner Verification</DialogTitle>
                        <DialogDescription>
                            Please enter the owner password to continue
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleOwnerPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="owner-password">Owner Password</Label>
                            <Input
                                id="owner-password"
                                type="password"
                                placeholder="Enter owner password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowPasswordDialog(false);
                                    setPassword("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Verify</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
