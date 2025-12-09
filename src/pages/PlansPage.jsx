import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlansPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Plans & Fees</h2>
                    <p className="text-muted-foreground">
                        Manage membership plans and pricing
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Membership Plans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Plans management will be added in Phase 7
                        </p>
                    </CardContent>
                </Card>

                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Insurance Fee</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">100 MAD</div>
                        <p className="text-xs text-muted-foreground">System-wide insurance fee</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
