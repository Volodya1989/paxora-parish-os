import Card from "@/components/ui/Card";
import ListSkeleton from "@/components/app/list-skeleton";

export default function LoadingPlatformParishesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-x-hidden pb-2 md:space-y-5">
      <Card>
        <ListSkeleton rows={1} />
      </Card>
      <Card>
        <ListSkeleton rows={4} />
      </Card>
    </div>
  );
}
