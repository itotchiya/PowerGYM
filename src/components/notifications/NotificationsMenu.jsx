import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Bell, Check, X, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function NotificationsMenu() {
    const { user, userProfile, session } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Dialog States
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [dialogType, setDialogType] = useState(null); // 'approve' | 'decline'
    const [declineReason, setDeclineReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Determine Role
    const currentRole = userProfile?.role === 'superadmin' ? 'superadmin' : session?.subrole;
    const isManager = currentRole === 'manager';

    // Fetch Notifications
    useEffect(() => {
        if (!userProfile || isManager) {
            setNotifications([]);
            return;
        }

        let q;
        if (currentRole === 'superadmin') {
            // Super Admin: View ALL gym requests
            q = query(
                collection(db, "gymRequests"),
                orderBy("createdAt", "desc"),
                limit(20)
            );
        } else if (currentRole === 'owner') {
            // Check for valid user before query
            if (!user?.uid) {
                setNotifications([]);
                return;
            }
            // Owner: View OWN gym requests (without orderBy to avoid composite index requirement)
            q = query(
                collection(db, "gymRequests"),
                where("fromUserId", "==", user.uid),
                limit(20)
            );
        } else {
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(n => {
                // Super Admin: Only see Pending items
                if (currentRole === 'superadmin') return n.status !== 'approved' && n.status !== 'rejected';
                // Owner: See everything (Pending, Approved, Rejected) so they catch the result
                return true;
            });

            // Sort client-side for owner (since we removed orderBy to avoid index)
            if (currentRole === 'owner') {
                notes = notes.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA; // Descending
                });
            }

            setNotifications(notes);

            // Unread count logic
            // For SuperAdmin: count all pending
            // For Owner: count those that are 'pending' OR (approved/rejected but somehow new? - simplified to just count list for now or 0)
            // Let's just count list length for visual cue
            setUnreadCount(notes.length);
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

                    // Update Gym Document (Critical)
                    if (selectedRequest.fromGymId) {
                        const gymRef = doc(db, "gyms", selectedRequest.fromGymId);
                        await updateDoc(gymRef, { name: newName });
                    }

                    // Update User Profile (Non-critical, for caching)
                    if (selectedRequest.fromUserId) {
                        try {
                            const userRef = doc(db, "users", selectedRequest.fromUserId);
                            await updateDoc(userRef, { gymName: newName });
                        } catch (userErr) {
                            console.warn("Could not update user profile gymName (non-fatal):", userErr);
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
            toast.error("Failed to process request: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isManager) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[400px] p-0 overflow-hidden rounded-xl shadow-lg border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h4 className="font-semibold">Notifications</h4>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {unreadCount} pending
                        </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                <div className="flex justify-center mb-3">
                                    <Bell className="h-8 w-8 opacity-20" />
                                </div>
                                No new notifications
                            </div>
                        ) : (
                            notifications.map((note) => (
                                <div key={note.id} className="group flex flex-col gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                                <AvatarImage src="" />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                    {(note.fromGymName || "GYM").substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-sm font-semibold flex items-center gap-2">
                                                    {currentRole === 'owner' ? (
                                                        <>
                                                            {note.status === 'approved' && <span className="text-green-600">Request Approved</span>}
                                                            {note.status === 'rejected' && <span className="text-red-600">Request Declined</span>}
                                                            {note.status === 'pending' && <span>Request Pending</span>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {note.type === 'gym_name_change' ? "Gym Name Change" : "Notification"}
                                                        </>
                                                    )}
                                                    {/* Status Dot */}
                                                    {note.status === 'pending' && <span className="flex h-2 w-2 rounded-full bg-blue-500" />}
                                                    {note.status === 'approved' && <span className="flex h-2 w-2 rounded-full bg-green-500" />}
                                                    {note.status === 'rejected' && <span className="flex h-2 w-2 rounded-full bg-red-500" />}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(note.createdAt?.toDate() || new Date(), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content (Name Change Specific) */}
                                    {note.type === 'gym_name_change' && (
                                        <div className="pl-[48px]">
                                            <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-md mb-2">
                                                <span className="line-through text-muted-foreground">{note.content.oldName}</span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-semibold text-primary">{note.content.newName}</span>
                                            </div>

                                            {/* Rejection Reason (Custom Layout) */}
                                            {note.status === 'rejected' && note.rejectionReason && (
                                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-2 rounded-md mb-2">
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">REJECTION REASON</p>
                                                    <p className="text-xs text-red-600/90 dark:text-red-400/90 italic">"{note.rejectionReason}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions (Only for Super Admin and Pending) */}
                                    {currentRole === 'superadmin' && note.status === 'pending' && (
                                        <div className="flex items-center gap-2 pl-[48px]">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5 text-xs border-dashed text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/5"
                                                onClick={() => handleActionClick(note, 'decline')}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Decline
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-8 gap-1.5 text-xs bg-primary/90 hover:bg-primary shadow-sm"
                                                onClick={() => handleActionClick(note, 'approve')}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                Approve Change
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t bg-muted/30">
                        <Button
                            variant="ghost"
                            className="w-full text-xs h-8 text-muted-foreground hover:text-primary"
                            onClick={() => window.location.href = '/notifications'}
                        >
                            View all notifications
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Interactions Dialog */}
            <Dialog open={!!dialogType} onOpenChange={(open) => !open && setDialogType(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'approve' ? "Approve Name Change" : "Decline Request"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogType === 'approve'
                                ? "Are you sure you want to approve this name change? This will update the gym's official name immediately."
                                : "Please provide a reason for declining this request. The owner will be notified."}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogType === 'approve' && selectedRequest && (
                        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center gap-3 text-sm">
                            <span className="text-muted-foreground">{selectedRequest.content.oldName}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-bold">{selectedRequest.content.newName}</span>
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
                            {isProcessing ? "Processing..." : (dialogType === 'approve' ? "Confirm Approval" : "Decline Request")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
