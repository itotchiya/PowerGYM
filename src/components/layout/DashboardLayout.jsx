import { TopHeader } from './TopHeader';
import { NavigationTabs } from './NavigationTabs';

export function DashboardLayout({ children }) {
    return (
        <div className="min-h-screen bg-background">
            {/* Top Header */}
            <TopHeader />

            {/* Navigation Tabs */}
            <NavigationTabs />

            {/* Main Content - Full Width */}
            <main className="p-4 md:p-6 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
