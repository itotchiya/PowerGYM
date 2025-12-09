import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MembersPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Members</h2>
                    <p className="text-muted-foreground">
                        Manage all your gym members
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Members Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Members management features will be added in Phase 5
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
