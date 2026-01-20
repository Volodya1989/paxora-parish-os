"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AnnouncementRow from "@/components/announcements/AnnouncementRow";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { MegaphoneIcon } from "@/components/icons/ParishIcons";
import PageHeaderCard from "@/components/layout/PageHeaderCard";
import SectionCard from "@/components/layout/SectionCard";
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
  canManage?: boolean;
};

export default function AnnouncementsView({
  drafts,
  published,
  parishId,
  canManage = true
}: AnnouncementsViewProps) {
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
      <PageHeaderCard
        title="Announcements"
        description={
          canManage
            ? "Share updates with parishioners and keep everyone informed."
            : "Read the latest updates from your parish community."
        }
        actions={
          canManage ? (
            <Button onClick={handleCreateDraft} className="w-full sm:w-auto">
              + New announcement
            </Button>
          ) : null
        }
      />

      <SectionCard
        title="Announcement list"
        description={
          canManage
            ? "Switch between draft and published updates."
            : "Stay in the loop with what is happening at the parish."
        }
        icon={<MegaphoneIcon className="h-5 w-5" />}
        iconClassName="bg-amber-100 text-amber-700"
      >
        {canManage ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap justify-start">
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
            </TabsList>
            <TabsPanel value="draft">
              <div className="mt-4 space-y-4">
                {drafts.length === 0 ? (
                  <EmptyState
                    title="No drafts"
                    description="Create a new announcement to keep your community updated."
                    action={<Button onClick={handleCreateDraft}>+ New announcement</Button>}
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
                    action={<Button onClick={handleCreateDraft}>+ New announcement</Button>}
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
        ) : (
          <div className="mt-4 space-y-4">
            {published.length === 0 ? (
              <EmptyState
                title="No announcements yet"
                description="Check back soon for parish updates."
                action={null}
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
      </SectionCard>
    </div>
  );
}
