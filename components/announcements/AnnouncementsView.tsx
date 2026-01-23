"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AnnouncementRow from "@/components/announcements/AnnouncementRow";
import Button from "@/components/ui/Button";
import ListEmptyState from "@/components/app/list-empty-state";
import ListSkeleton from "@/components/app/list-skeleton";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import {
  archiveAnnouncement,
  deleteAnnouncement,
  setAnnouncementPublished,
  unarchiveAnnouncement
} from "@/server/actions/announcements";
import type { AnnouncementListItem, AnnouncementStatus } from "@/lib/queries/announcements";
import PageShell from "@/components/app/page-shell";
import Card from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

type AnnouncementsViewProps = {
  drafts: AnnouncementListItem[];
  published: AnnouncementListItem[];
  canManage?: boolean;
};

export default function AnnouncementsView({
  drafts,
  published,
  canManage = true
}: AnnouncementsViewProps) {
  const [activeTab, setActiveTab] = useState<AnnouncementStatus>("draft");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementListItem | null>(null);
  const { addToast } = useToast();
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const refreshList = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runAnnouncementAction = async (announcementId: string, action: () => Promise<void>) => {
    setPendingId(announcementId);
    try {
      await action();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "We couldn't update that announcement. Please try again."
      });
    } finally {
      setPendingId(null);
      refreshList();
    }
  };

  const handleTogglePublish = async (
    announcementId: string,
    nextPublished: boolean,
    previousPublishedAt: Date | null
  ) => {
    await runAnnouncementAction(announcementId, async () => {
      await setAnnouncementPublished({ id: announcementId, published: nextPublished });
      if (nextPublished) {
        addToast({
          title: "Announcement published",
          description: "This announcement is now live.",
          actionLabel: "Undo",
          onAction: () => {
            void runAnnouncementAction(announcementId, async () => {
              await setAnnouncementPublished({ id: announcementId, published: false });
            });
          }
        });
      } else {
        addToast({
          title: "Announcement unpublished",
          description: "This announcement is back in drafts.",
          actionLabel: "Undo",
          onAction: () => {
            void runAnnouncementAction(announcementId, async () => {
              await setAnnouncementPublished({
                id: announcementId,
                published: true,
                publishedAt: previousPublishedAt?.toISOString()
              });
            });
          }
        });
      }
    });
  };

  const handleArchive = async (announcementId: string) => {
    await runAnnouncementAction(announcementId, async () => {
      await archiveAnnouncement({ id: announcementId });
      addToast({
        title: "Announcement archived",
        description: "This announcement is tucked away but can be restored.",
        actionLabel: "Undo",
        onAction: () => {
          void runAnnouncementAction(announcementId, async () => {
            await unarchiveAnnouncement({ id: announcementId });
          });
        }
      });
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await runAnnouncementAction(deleteTarget.id, async () => {
      await deleteAnnouncement({ id: deleteTarget.id });
      addToast({
        title: "Announcement deleted",
        description: "That announcement has been removed."
      });
    });
    setDeleteTarget(null);
  };

  return (
    <div className="section-gap">
      <PageShell
        title="Announcements"
        description={
          canManage
            ? "Share quick updates with the parish community."
            : "Read the latest updates from your parish community."
        }
        summaryChips={[
          {
            label: `${published.length} published`,
            tone: "amber"
          }
        ]}
        actions={
          canManage ? (
            <Button onClick={() => router.push("/announcements/new")} className="h-9 px-3 text-sm">
              New announcement
            </Button>
          ) : null
        }
      >
        <Card>
          {canManage ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap justify-start">
                <TabsTrigger value="draft">Drafts</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
              </TabsList>
              <TabsPanel value="draft">
                <div className="mt-4 space-y-4">
                  {isRefreshing ? (
                    <ListSkeleton rows={3} />
                  ) : drafts.length === 0 ? (
                    <ListEmptyState
                      title="No drafts"
                      description="Create a new announcement to keep your community updated."
                      action={
                        <Button onClick={() => router.push("/announcements/new")}>
                          New announcement
                        </Button>
                      }
                    />
                  ) : (
                    drafts.map((announcement) => (
                      <AnnouncementRow
                        key={announcement.id}
                        announcement={announcement}
                        onTogglePublish={handleTogglePublish}
                        onArchive={handleArchive}
                        onEdit={(id) => router.push(`/announcements/${id}/edit`)}
                        onDelete={(id) =>
                          setDeleteTarget(drafts.find((item) => item.id === id) ?? null)
                        }
                        isBusy={pendingId === announcement.id}
                      />
                    ))
                  )}
                </div>
              </TabsPanel>
              <TabsPanel value="published">
                <div className="mt-4 space-y-4">
                  {isRefreshing ? (
                    <ListSkeleton rows={3} />
                  ) : published.length === 0 ? (
                    <ListEmptyState
                      title="No published announcements"
                      description="Create a new announcement to keep your community updated."
                      action={
                        <Button onClick={() => router.push("/announcements/new")}>
                          New announcement
                        </Button>
                      }
                    />
                  ) : (
                    published.map((announcement) => (
                      <AnnouncementRow
                        key={announcement.id}
                        announcement={announcement}
                        onTogglePublish={handleTogglePublish}
                        onArchive={handleArchive}
                        onEdit={(id) => router.push(`/announcements/${id}/edit`)}
                        onDelete={(id) =>
                          setDeleteTarget(published.find((item) => item.id === id) ?? null)
                        }
                        isBusy={pendingId === announcement.id}
                      />
                    ))
                  )}
                </div>
              </TabsPanel>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {published.length === 0 ? (
                <ListEmptyState
                  title="No announcements yet"
                  description="Check back soon for parish updates."
                />
              ) : (
                published.map((announcement) => (
                  <AnnouncementRow
                    key={announcement.id}
                    announcement={announcement}
                    onTogglePublish={handleTogglePublish}
                    onArchive={handleArchive}
                    isBusy={pendingId === announcement.id}
                    isReadOnly
                  />
                ))
              )}
            </div>
          )}
        </Card>
      </PageShell>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete announcement"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-500">
          This will permanently delete “{deleteTarget?.title}”. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
