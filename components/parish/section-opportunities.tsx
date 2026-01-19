import { HandHeart, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: "Open" | "In progress";
}

const opportunities: Opportunity[] = [
  {
    id: "1",
    title: "Volunteer for Soup Kitchen",
    description: "Help serve meals to those in need",
    dueDate: "Jan 20",
    dueTime: "11:00 AM",
    status: "Open",
  },
];

export function SectionOpportunities() {
  const isEmpty = opportunities.length === 0;

  return (
    <section id="opportunities" className="scroll-mt-6 lg:scroll-mt-8">
      <Card className="border-l-4 border-l-opportunities-accent bg-card overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 lg:px-5 lg:pt-5 lg:pb-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-opportunities">
            <HandHeart className="h-4 w-4 lg:h-5 lg:w-5 text-opportunities-foreground" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-card-foreground">
            Opportunities to Help
          </h2>
        </div>

        <CardContent className="px-4 pb-4 pt-0 lg:px-5 lg:pb-5">
          {isEmpty ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">
                No opportunities right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((item, index) => (
                <div
                  key={item.id}
                  className={`${index !== opportunities.length - 1 ? "border-b border-border pb-3" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-card-foreground text-sm">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        item.status === "Open"
                          ? "bg-opportunities/60 text-opportunities-foreground"
                          : "bg-services/60 text-services-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-opportunities-accent">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      Due {item.dueDate}
                      {item.dueTime && ` at ${item.dueTime}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="flex items-center gap-1 text-opportunities-accent hover:text-opportunities-foreground text-sm font-medium mt-4 transition-colors">
            View all opportunities
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </section>
  );
}
