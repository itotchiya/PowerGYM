import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DeletedMembersPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Deleted Members</h2>
                    <p className="text-muted-foreground">
                        Restore or permanently delete members
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Soft-Deleted Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Deleted members management will be added in Phase 7
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
