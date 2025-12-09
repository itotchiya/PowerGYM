import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ExpiringSoonPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expiring Soon</h2>
                    <p className="text-muted-foreground">
                        Members whose subscriptions expire in the next 7 days
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Expiring Memberships</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Expiring members list will be added in Phase 7
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
