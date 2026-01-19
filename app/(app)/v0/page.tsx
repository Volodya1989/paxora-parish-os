import { QuickBlocksRow } from "@/components/parish/quick-blocks-row";
import { SectionAnnouncements } from "@/components/parish/section-announcements";
import { SectionSchedule } from "@/components/parish/section-schedule";
import { SectionCommunity } from "@/components/parish/section-community";
import { SectionOpportunities } from "@/components/parish/section-opportunities";

export default function ThisWeekPage() {
    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-xl lg:text-2xl font-semibold text-foreground">This Week</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Your parish at a glance
                    </p>
                </div>
            </header>

            <div className="px-4 py-4 lg:px-8 lg:py-6 space-y-5 lg:space-y-6 max-w-6xl mx-auto">
                {/* Quick Blocks Navigation */}
                <QuickBlocksRow />

                {/* Main Content Sections - 2 columns on desktop */}
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
                    <div className="space-y-4 lg:space-y-6">
                        <SectionAnnouncements />
                        <SectionSchedule />
                    </div>
                    <div className="space-y-4 lg:space-y-6">
                        <SectionCommunity />
                        <SectionOpportunities />
                    </div>
                </div>
            </div>
        </main>
    );
}
