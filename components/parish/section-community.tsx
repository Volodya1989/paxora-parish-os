import { Users, ChevronRight, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Group {
  id: string;
  name: string;
  lastActivity?: string;
}

const groups: Group[] = [
  {
    id: "1",
    name: "Young Adults Ministry",
    lastActivity: "New post: Game night this Friday!",
  },
  {
    id: "2",
    name: "Parish Choir",
    lastActivity: "Rehearsal reminder posted",
  },
];

export function SectionCommunity() {
  const isEmpty = groups.length === 0;

  return (
    <section id="community" className="scroll-mt-6 lg:scroll-mt-8">
      <Card className="border-l-4 border-l-community-accent bg-card overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 lg:px-5 lg:pt-5 lg:pb-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-community">
            <Users className="h-4 w-4 lg:h-5 lg:w-5 text-community-foreground" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-card-foreground">
            Community
          </h2>
        </div>

        <CardContent className="px-4 pb-4 pt-0 lg:px-5 lg:pb-5">
          {isEmpty ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">
                {"You haven't joined any groups yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group, index) => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between gap-3 ${index !== groups.length - 1 ? "border-b border-border pb-3" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-card-foreground text-sm">
                      {group.name}
                    </h3>
                    {group.lastActivity && (
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs truncate">
                          {group.lastActivity}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-3 border-community-accent/30 text-community-accent hover:bg-community hover:text-community-foreground bg-transparent"
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}

          <button className="flex items-center gap-1 text-community-accent hover:text-community-foreground text-sm font-medium mt-4 transition-colors">
            Discover groups
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </section>
  );
}
