"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AnnouncementRow from "@/components/announcements/AnnouncementRow";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import {
  archiveAnnouncement,
  createAnnouncementDraft,
  setAnnouncementPublished,
  unarchiveAnnouncement
} from "@/server/actions/announcements";
import type { AnnouncementListItem, AnnouncementStatus } from "@/lib/queries/announcements";

type AnnouncementsViewProps = {
  drafts: AnnouncementListItem[];
  published: AnnouncementListItem[];
  parishId: string;
};

export default function AnnouncementsView({ drafts, published, parishId }: AnnouncementsViewProps) {
  const [activeTab, setActiveTab] = useState<AnnouncementStatus>("draft");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { addToast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

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

  const handleCreateDraft = async () => {
    await runAnnouncementAction("new", async () => {
      await createAnnouncementDraft({ parishId });
    });
  };

  return (
    <div className="section-gap">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-h1">Announcements</h1>
            <p className="text-sm text-ink-500">
              Share updates with parishioners and keep everyone informed.
            </p>
          </div>
          <Button onClick={handleCreateDraft}>+ New Announcement</Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-h3">Announcement list</h2>
            <p className="text-xs text-ink-400">Switch between draft and published updates.</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
            </TabsList>
            <TabsPanel value="draft">
              <div className="mt-4 space-y-4">
                {drafts.length === 0 ? (
                  <EmptyState
                    title="No drafts"
                    description="Create a new announcement to keep your community updated."
                    action={<Button onClick={handleCreateDraft}>+ New Announcement</Button>}
                  />
                ) : (
                  drafts.map((announcement) => (
                    <AnnouncementRow
                      key={announcement.id}
                      announcement={announcement}
                      onTogglePublish={handleTogglePublish}
                      onArchive={handleArchive}
                      isBusy={pendingId === announcement.id}
                    />
                  ))
                )}
              </div>
            </TabsPanel>
            <TabsPanel value="published">
              <div className="mt-4 space-y-4">
                {published.length === 0 ? (
                  <EmptyState
                    title="No published announcements"
                    description="Create a new announcement to keep your community updated."
                    action={<Button onClick={handleCreateDraft}>+ New Announcement</Button>}
                  />
                ) : (
                  published.map((announcement) => (
                    <AnnouncementRow
                      key={announcement.id}
                      announcement={announcement}
                      onTogglePublish={handleTogglePublish}
                      onArchive={handleArchive}
                      isBusy={pendingId === announcement.id}
                    />
                  ))
                )}
              </div>
            </TabsPanel>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
