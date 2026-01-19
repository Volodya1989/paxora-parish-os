import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  day: string;
  time: string;
  location?: string;
}

const services: Service[] = [
  {
    id: "1",
    name: "Sunday Mass",
    day: "Sunday",
    time: "10:00 AM",
    location: "Main Church",
  },
  {
    id: "2",
    name: "Weekday Mass",
    day: "Wednesday",
    time: "8:00 AM",
    location: "Chapel",
  },
  {
    id: "3",
    name: "Confession",
    day: "Saturday",
    time: "4:00 PM",
    location: "Reconciliation Room",
  },
];

export function SectionSchedule() {
  const isEmpty = services.length === 0;

  return (
    <section id="services" className="scroll-mt-6 lg:scroll-mt-8">
      <Card className="border-l-4 border-l-services-accent bg-card overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 lg:px-5 lg:pt-5 lg:pb-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-services">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-services-foreground" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-card-foreground">
            Services
          </h2>
        </div>

        <CardContent className="px-4 pb-4 pt-0 lg:px-5 lg:pb-5">
          {isEmpty ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">
                Nothing scheduled yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 ${index !== services.length - 1 ? "border-b border-border pb-3" : ""}`}
                >
                  <div className="flex flex-col items-center justify-center bg-services/50 rounded-lg px-2.5 py-1.5 min-w-[52px]">
                    <span className="text-xs text-services-foreground font-medium">
                      {item.day.slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold text-services-accent">
                      {item.time.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-services-foreground">
                      {item.time.split(" ")[1]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-card-foreground text-sm">
                      {item.name}
                    </h3>
                    {item.location && (
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="flex items-center gap-1 text-services-accent hover:text-services-foreground text-sm font-medium mt-4 transition-colors">
            View calendar
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </section>
  );
}
