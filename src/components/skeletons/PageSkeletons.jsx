import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Dashboard Skeleton - Used for GymDashboard and SuperAdminDashboard
 * Shows: Header, KPI Cards, Charts placeholders
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[150px]" />
            </div>

            {/* KPI Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px] mb-2" />
                            <Skeleton className="h-3 w-[80px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[250px] w-full rounded-lg" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[250px] w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Members Table Skeleton - Used for MembersPage
 * Shows: Filter bar, Table header, Table rows
 */
export function MembersTableSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[150px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-10 w-[180px]" />
            </div>

            {/* Filters Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <Skeleton className="h-10 col-span-2" />
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                    </div>
                </CardContent>
            </Card>

            {/* Table Card */}
            <Card>
                <CardHeader className="py-4">
                    <Skeleton className="h-5 w-[120px]" />
                </CardHeader>
                <CardContent>
                    {/* Table Header */}
                    <div className="flex items-center gap-4 py-3 border-b">
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[60px]" />
                    </div>
                    {/* Table Rows */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                            <Skeleton className="h-4 w-[60px]" />
                            <div className="flex flex-col gap-1">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                            <Skeleton className="h-6 w-[80px] rounded-full" />
                            <Skeleton className="h-6 w-[90px] rounded-full" />
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-6 w-[70px] rounded-full" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Profile Skeleton - Used for MemberProfilePage
 * Shows: Profile header, tabs, info cards
 */
export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-8 w-[200px]" />
            </div>

            {/* Profile Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <Skeleton className="h-24 w-24 rounded-full" />
                        {/* Info */}
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-6 w-[200px]" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-[60px]" />
                                    <Skeleton className="h-5 w-[100px]" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-[60px]" />
                                    <Skeleton className="h-5 w-[120px]" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-[60px]" />
                                    <Skeleton className="h-5 w-[80px]" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-[60px]" />
                                    <Skeleton className="h-5 w-[90px]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
            </div>

            {/* Content Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Plans Skeleton - Used for PlansPage
 * Shows: Header, Grid of plan cards
 */
export function PlansSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[250px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-[120px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-8 w-[100px]" />
                                <Skeleton className="h-6 w-[60px] rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[80%]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/**
 * Table Skeleton - Generic table skeleton
 * Used for: AuditLogPage, DeletedMembersPage, WarningsPage, ExpiringSoonPage, etc.
 */
export function TableSkeleton({ rows = 8, columns = 6 }) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[180px]" />
                    <Skeleton className="h-4 w-[250px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 flex-1 max-w-sm" />
                        <Skeleton className="h-10 w-[150px]" />
                        <Skeleton className="h-10 w-[150px]" />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
                        {Array.from({ length: columns }).map((_, i) => (
                            <Skeleton key={i} className="h-4 flex-1" />
                        ))}
                    </div>
                    {/* Rows */}
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                            {Array.from({ length: columns }).map((_, j) => (
                                <Skeleton key={j} className="h-4 flex-1" />
                            ))}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Form Skeleton - Used for SettingsPage, SuperAdminSettingsPage
 * Shows: Tabs, Form fields
 */
export function FormSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-[150px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[180px]" />
                    <Skeleton className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent className="space-y-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                    <Skeleton className="h-10 w-[120px]" />
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Notifications Skeleton - List-based skeleton
 * Used for NotificationsPage
 */
export function NotificationsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[180px]" />
                    <Skeleton className="h-4 w-[250px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* Notification Items */}
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-[60%]" />
                                    <Skeleton className="h-4 w-[80%]" />
                                    <Skeleton className="h-3 w-[100px]" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/**
 * Role Selection Skeleton
 * Used for RoleSelection page
 */
export function RoleSelectionSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Skeleton className="h-8 w-[200px] mx-auto" />
                    <Skeleton className="h-4 w-[250px] mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Gym Requests Skeleton - Card grid for SuperAdmin
 * Used for GymRequestsPage
 */
export function GymRequestsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
                <Skeleton className="h-9 w-[100px]" />
            </div>

            {/* Request Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-[150px]" />
                                <Skeleton className="h-6 w-[80px] rounded-full" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[80%]" />
                            <div className="flex gap-2 pt-2">
                                <Skeleton className="h-9 flex-1" />
                                <Skeleton className="h-9 flex-1" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
