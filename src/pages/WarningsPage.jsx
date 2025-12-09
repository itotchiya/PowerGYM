import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WarningsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Warnings</h2>
                    <p className="text-muted-foreground">
                        Review warnings submitted by managers
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending Warnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Warnings management will be added in Phase 7
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
