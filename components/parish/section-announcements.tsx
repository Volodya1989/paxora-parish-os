import { Megaphone, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Announcement {
  id: string;
  title: string;
  snippet: string;
  postedDate: string;
}

const announcements: Announcement[] = [
  {
    id: "1",
    title: "Parish Picnic Save the Date",
    snippet:
      "Join us for our annual parish picnic on June 15th. Bring your family and a dish to share!",
    postedDate: "Jan 15",
  },
  {
    id: "2",
    title: "Lenten Mission Series",
    snippet:
      "Fr. Michael will lead a three-evening reflection series starting March 3rd.",
    postedDate: "Jan 14",
  },
];

export function SectionAnnouncements() {
  const isEmpty = announcements.length === 0;

  return (
    <section id="announcements" className="scroll-mt-6 lg:scroll-mt-8">
      <Card className="border-l-4 border-l-announcements-accent bg-card overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 lg:px-5 lg:pt-5 lg:pb-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-announcements">
            <Megaphone className="h-4 w-4 lg:h-5 lg:w-5 text-announcements-foreground" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-card-foreground">
            Announcements
          </h2>
        </div>

        <CardContent className="px-4 pb-4 pt-0 lg:px-5 lg:pb-5">
          {isEmpty ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">
                No announcements right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((item, index) => (
                <div
                  key={item.id}
                  className={`${index !== announcements.length - 1 ? "border-b border-border pb-3" : ""}`}
                >
                  <h3 className="font-medium text-card-foreground text-sm">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {item.snippet}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5">
                    {item.postedDate}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button className="flex items-center gap-1 text-announcements-accent hover:text-announcements-foreground text-sm font-medium mt-4 transition-colors">
            View all announcements
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </section>
  );
}
