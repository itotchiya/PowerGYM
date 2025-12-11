import { TopHeader } from './TopHeader';
import { NavigationTabs } from './NavigationTabs';

export function DashboardLayout({ children, hideNav = false }) {
    return (
        <div className="min-h-screen bg-background">
            {/* Top Header - always visible, but without border on internal pages */}
            <TopHeader hideBorder={hideNav} />

            {/* Navigation Tabs - hide on internal pages */}
            {!hideNav && <NavigationTabs />}

            {/* Main Content - Full Width */}
            <main className={`p-4 md:p-6 max-w-7xl mx-auto`}>
                {children}
            </main>
        </div>
    );
}


