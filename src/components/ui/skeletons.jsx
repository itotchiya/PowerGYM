import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function TableSkeleton({ rows = 5, columns = 5 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, j) => (
                        <div
                            key={j}
                            className="h-8 bg-muted rounded animate-pulse flex-1"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                    <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                </div>
            </CardContent>
        </Card>
    );
}

export function KPISkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-muted rounded animate-pulse w-1/3 mb-1" />
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
            </CardHeader>
            <CardContent>
                <div className="h-64 bg-muted rounded animate-pulse" />
            </CardContent>
        </Card>
    );
}

export function LoadingSpinner({ text = "Loading..." }) {
    return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">{text}</p>
            </div>
        </div>
    );
}
