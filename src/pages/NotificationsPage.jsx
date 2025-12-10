import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, ArrowRight, Clock, Building2, AlertCircle } from "lucide-react";
import { formatDistanceToNow, isToday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
    const { user, userProfile, session } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [dialogType, setDialogType] = useState(null); // 'approve' | 'decline'
    const [declineReason, setDeclineReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Determine Role
    const currentRole = userProfile?.role === 'superadmin' ? 'superadmin' : session?.subrole;
    const isManager = currentRole === 'manager';

    useEffect(() => {
        if (!userProfile || isManager) {
            setLoading(false);
            return;
        }

        let q;
        if (currentRole === 'superadmin') {
            // Super Admin: View ALL gym requests (history included)
            q = query(
                collection(db, "gymRequests"),
                orderBy("createdAt", "desc"),
                limit(100)
            );
        } else if (currentRole === 'owner') {
            if (!user?.uid) {
                setLoading(false);
                return;
            }
            // Owner: View OWN gym requests (without orderBy to avoid composite index requirement)
            q = query(
                collection(db, "gymRequests"),
                where("fromUserId", "==", user.uid),
                limit(50)
            );
        } else {
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort client-side for owner (since we removed orderBy to avoid index)
            if (currentRole === 'owner') {
                notes = notes.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA; // Descending
                });
            }

            setNotifications(notes);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, userProfile, session, currentRole, isManager]);

    const handleActionClick = (request, type) => {
        setSelectedRequest(request);
        setDialogType(type);
        setDeclineReason("");
    };

    const handleConfirmAction = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true);

        try {
            const requestRef = doc(db, "gymRequests", selectedRequest.id);

            if (dialogType === 'decline') {
                if (!declineReason.trim()) {
                    toast.error("Please provide a reason for declining.");
                    setIsProcessing(false);
                    return;
                }

                await updateDoc(requestRef, {
                    status: 'rejected',
                    rejectionReason: declineReason,
                    processedAt: serverTimestamp()
                });
                toast.success("Request declined.");
            }
            else if (dialogType === 'approve') {
                // 1. Update the Request Status
                await updateDoc(requestRef, {
                    status: 'approved',
                    processedAt: serverTimestamp()
                });

                // 2. Perform the actual change (if it's a Name Change)
                if (selectedRequest.type === 'gym_name_change') {
                    const newName = selectedRequest.content.newName;

                    // Update Gym Document
                    if (selectedRequest.fromGymId) {
                        const gymRef = doc(db, "gyms", selectedRequest.fromGymId);
                        await updateDoc(gymRef, { name: newName });
                    }

                    // Update User Profile (Owner)
                    if (selectedRequest.fromUserId) {
                        try {
                            const userRef = doc(db, "users", selectedRequest.fromUserId);
                            await updateDoc(userRef, { gymName: newName });
                        } catch (userErr) {
                            console.warn("Could not update user profile (non-fatal):", userErr);
                        }
                    }
                }
                toast.success("Request approved and changes applied.");
            }

            // Close dialogs
            setDialogType(null);
            setSelectedRequest(null);

        } catch (error) {
            console.error("Error processing request:", error);
            toast.error("Failed to process request.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Grouping Logic
    const todayNotifications = notifications.filter(n => n.createdAt?.toDate && isToday(n.createdAt.toDate()));
    const recentNotifications = notifications.filter(n => n.createdAt?.toDate && !isToday(n.createdAt.toDate()));

    const NotificationItem = ({ note }) => {
        const isPending = note.status === 'pending';
        const isApproved = note.status === 'approved';
        const isRejected = note.status === 'rejected';

        return (
            <div className={cn(
                "flex flex-col sm:flex-row gap-3 p-4 items-start sm:items-center justify-between group transition-all rounded-[4px]",
                "bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10"
            )}>
                <div className="flex items-start gap-3 w-full">
                    {/* Icon */}
                    <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isPending && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        isApproved && "bg-green-500/10 text-green-600 dark:text-green-400",
                        isRejected && "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                        {note.type === 'gym_name_change' ? <Building2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                    {note.type === 'gym_name_change' ? "Gym Name Change" : "System Notification"}
                                </span>
                                {/* Status Badge - No shadows, simpler */}
                                {isPending && <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">Pending</span>}
                                {isApproved && <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">Approved</span>}
                                {isRejected && <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400">Declined</span>}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(note.createdAt?.toDate() || new Date(), { addSuffix: true })}
                            </span>
                        </div>

                        {/* Contextual Status Message for Owner */}
                        {currentRole === 'owner' && note.type === 'gym_name_change' && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isPending && "Request sent to PowerGYM team for review"}
                                {isApproved && `Your gym name has been updated to "${note.content.newName}"`}
                                {isRejected && "Your name change request was declined"}
                            </p>
                        )}

                        {/* Submitted by Gym (for Super Admin view) */}
                        {currentRole === 'superadmin' && note.fromGymName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Submitted by <span className="font-medium text-foreground/70">{note.fromGymName}</span>
                            </p>
                        )}

                        {/* Name Change Details */}
                        {note.type === 'gym_name_change' && (
                            <div className="flex items-center gap-2 mt-1.5 text-sm">
                                <span className="text-muted-foreground">{note.content.oldName}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                                <span className={cn("font-medium", isApproved && "text-green-600 dark:text-green-400")}>
                                    {note.content.newName}
                                </span>
                            </div>
                        )}

                        {/* Description/Reason if provided */}
                        {note.content?.reason && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic">
                                "{note.content.reason}"
                            </p>
                        )}

                        {/* Rejection Reason */}
                        {isRejected && note.rejectionReason && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 italic">
                                "{note.rejectionReason}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions (Super Admin & Pending only) */}
                {currentRole === 'superadmin' && isPending && (
                    <div className="flex items-center gap-2 pl-12 sm:pl-0 w-full sm:w-auto justify-end">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleActionClick(note, 'decline')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full bg-primary hover:bg-primary/90"
                            onClick={() => handleActionClick(note, 'approve')}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    if (isManager) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[50vh]">
                    <p className="text-muted-foreground">You do not have permission to view notifications.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 max-w-3xl space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        View your request history and system alerts.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-muted/30 border-dashed border-2 rounded-xl p-12 text-center text-muted-foreground">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 opacity-40" />
                            </div>
                        </div>
                        <h3 className="font-medium">No notifications</h3>
                        <p className="text-sm mt-1">You don't have any activity yet.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* TODAY SECTION */}
                        {todayNotifications.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                    Today
                                </h2>
                                <div className="rounded-[20px] overflow-hidden flex flex-col gap-[4px]">
                                    {todayNotifications.map(note => (
                                        <NotificationItem key={note.id} note={note} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* RECENT SECTION */}
                        {recentNotifications.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                    Recent
                                </h2>
                                <div className="rounded-[20px] overflow-hidden flex flex-col gap-[4px]">
                                    {recentNotifications.map(note => (
                                        <NotificationItem key={note.id} note={note} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Interaction Dialog */}
            <Dialog open={!!dialogType} onOpenChange={(open) => !open && setDialogType(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'approve' ? "Approve Name Change" : "Decline Request"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogType === 'approve'
                                ? "This will update the gym's official name immediately."
                                : "Please provide a reason for declining this request."}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogType === 'approve' && selectedRequest && (
                        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center gap-3 text-sm">
                            <span className="text-muted-foreground line-through">{selectedRequest.content.oldName}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-green-600 dark:text-green-400">{selectedRequest.content.newName}</span>
                        </div>
                    )}

                    {dialogType === 'decline' && (
                        <div className="py-2">
                            <Textarea
                                placeholder="Reason for rejection..."
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogType(null)} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button
                            variant={dialogType === 'decline' ? "destructive" : "default"}
                            onClick={handleConfirmAction}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Processing..." : (dialogType === 'approve' ? "Confirm" : "Decline")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
