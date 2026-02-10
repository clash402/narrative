"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Lock,
  RefreshCcw,
  Sparkles,
  Unlock,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  approveOutlineDay,
  approvePostDay,
  generateOutlineAct,
  generateOutlineAll,
  generateOutlineDay,
  generatePostDay,
  generatePostsAll,
  lockCampaign,
  restoreVersion,
  saveEditsOutlineDay,
  saveEditsPostDay,
  unlockCampaign,
  updateCampaignBible,
} from "@/app/actions/campaign";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DayOutlineVersionData,
  DayPostVersionData,
  WorkspaceData,
} from "@/lib/types";

type WorkspaceProps = {
  data: WorkspaceData;
};

type PendingAction =
  | "generateOutlineAll"
  | "regenerateAct"
  | "lock"
  | "unlock"
  | "generatePostsAll"
  | "saveOutline"
  | "savePost"
  | "regenerateDay"
  | "regeneratePost"
  | "approveOutline"
  | "approvePost"
  | "saveBible"
  | "restore"
  | null;

function serializeBulletList(items: string[]): string {
  return items.join("\n");
}

function parseBulletList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString();
}

function statusVariant(status: "DRAFT" | "APPROVED"): "secondary" | "success" {
  return status === "APPROVED" ? "success" : "secondary";
}

export function CampaignWorkspace({ data }: WorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedAct, setSelectedAct] = useState<string>("1");
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [bibleForm, setBibleForm] = useState({
    voiceStyle: data.campaign.voiceStyle,
    audience: data.campaign.audience,
    goal: data.campaign.goal,
    pillars: serializeBulletList(data.campaign.pillars),
    forbidden: serializeBulletList(data.campaign.forbidden),
    ctaPreference: data.campaign.ctaPreference ?? "",
  });

  const outlineByDay = useMemo(
    () => new Map(data.outlines.map((outline) => [outline.dayNumber, outline])),
    [data.outlines],
  );
  const postByDay = useMemo(
    () => new Map(data.posts.map((post) => [post.dayNumber, post])),
    [data.posts],
  );

  const selectedOutline = outlineByDay.get(selectedDay);
  const selectedPost = postByDay.get(selectedDay);

  const [outlineForm, setOutlineForm] = useState({
    title: selectedOutline?.title ?? "",
    hook: selectedOutline?.hook ?? "",
    format: selectedOutline?.format ?? "",
    keyPoints: serializeBulletList(selectedOutline?.keyPoints ?? ["", "", ""]),
    cta: selectedOutline?.cta ?? "",
    constraints: selectedOutline?.constraints ?? "",
  });

  const [postForm, setPostForm] = useState({
    text: selectedPost?.text ?? "",
    altHooks: serializeBulletList(selectedPost?.altHooks ?? ["", "", ""]),
  });

  useEffect(() => {
    setOutlineForm({
      title: selectedOutline?.title ?? "",
      hook: selectedOutline?.hook ?? "",
      format: selectedOutline?.format ?? "",
      keyPoints: serializeBulletList(
        selectedOutline?.keyPoints ?? ["", "", ""],
      ),
      cta: selectedOutline?.cta ?? "",
      constraints: selectedOutline?.constraints ?? "",
    });

    setPostForm({
      text: selectedPost?.text ?? "",
      altHooks: serializeBulletList(selectedPost?.altHooks ?? ["", "", ""]),
    });
  }, [selectedOutline, selectedPost]);

  const outlineVersions = useMemo(() => {
    if (!selectedOutline) {
      return [] as DayOutlineVersionData[];
    }

    return data.outlineVersions
      .filter((version) => version.dayOutlineId === selectedOutline.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data.outlineVersions, selectedOutline]);

  const postVersions = useMemo(() => {
    if (!selectedPost) {
      return [] as DayPostVersionData[];
    }

    return data.postVersions
      .filter((version) => version.dayPostId === selectedPost.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data.postVersions, selectedPost]);

  const hasPosts = data.posts.length > 0;

  const runAction = async (
    action: () => Promise<void>,
    successMessage: string,
    key: PendingAction,
  ) => {
    setPendingAction(key);
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Action failed.";
        toast.error(message);
      } finally {
        setPendingAction(null);
      }
    });
  };

  const exportText = useMemo(() => {
    return data.outlines
      .map((outline) => {
        const post = postByDay.get(outline.dayNumber);
        const body = post?.text || "[No generated post]";

        return `Day ${outline.dayNumber} - ${outline.title}\n\n${body}`;
      })
      .join("\n\n----------------------------------------\n\n");
  }, [data.outlines, postByDay]);

  const acts = [1, 2, 3].map((actNumber) => ({
    actNumber,
    days: data.outlines.filter((day) => day.actNumber === actNumber),
  }));

  return (
    <div className="space-y-4">
      <section className="bg-panel rounded-xl border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-muted text-xs tracking-[0.16em] uppercase">
              Campaign Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.campaign.name}
            </h1>
            <p className="text-muted text-sm">
              Theme:{" "}
              <span className="text-foreground font-medium">
                {data.campaign.theme}
              </span>{" "}
              · Template: {data.campaign.template.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={data.campaign.isOutlineLocked ? "warning" : "secondary"}
            >
              {data.campaign.isOutlineLocked ? (
                <>
                  <Lock className="mr-1 h-3 w-3" /> Outline Locked
                </>
              ) : (
                <>
                  <Unlock className="mr-1 h-3 w-3" /> Outline Editable
                </>
              )}
            </Badge>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () => generateOutlineAll({ campaignId: data.campaign.id }),
                  "30-day outline generated.",
                  "generateOutlineAll",
                )
              }
            >
              <Sparkles className="h-4 w-4" />
              {pendingAction === "generateOutlineAll"
                ? "Generating..."
                : "Generate Outline"}
            </Button>
            <Select value={selectedAct} onValueChange={setSelectedAct}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Act" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Act 1</SelectItem>
                <SelectItem value="2">Act 2</SelectItem>
                <SelectItem value="3">Act 3</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () =>
                    generateOutlineAct({
                      campaignId: data.campaign.id,
                      actNumber: Number.parseInt(selectedAct, 10),
                    }),
                  `Act ${selectedAct} regenerated.`,
                  "regenerateAct",
                )
              }
            >
              <RefreshCcw className="h-4 w-4" />
              {pendingAction === "regenerateAct"
                ? "Regenerating..."
                : "Regenerate Act"}
            </Button>
            {data.campaign.isOutlineLocked ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  if (hasPosts) {
                    setShowUnlockWarning(true);
                    return;
                  }

                  void runAction(
                    () => unlockCampaign({ campaignId: data.campaign.id }),
                    "Outline unlocked.",
                    "unlock",
                  );
                }}
              >
                <Unlock className="h-4 w-4" />
                Unlock
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => lockCampaign({ campaignId: data.campaign.id }),
                    "Outline locked.",
                    "lock",
                  )
                }
              >
                <Lock className="h-4 w-4" />
                Lock Outline
              </Button>
            )}
            <Button
              disabled={isPending || !data.campaign.isOutlineLocked}
              onClick={() =>
                runAction(
                  () => generatePostsAll({ campaignId: data.campaign.id }),
                  "All posts generated.",
                  "generatePostsAll",
                )
              }
            >
              <WandSparkles className="h-4 w-4" />
              {pendingAction === "generatePostsAll"
                ? "Generating..."
                : "Generate All Posts"}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Export</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Export 30-Day Campaign</DialogTitle>
                  <DialogDescription>
                    Copy plain text for all posts. Days without posts are marked
                    explicitly.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={exportText}
                  readOnly
                  className="min-h-[420px] font-mono text-xs"
                />
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(exportText);
                      toast.success("Copied export text.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <details
        open={isSettingsOpen}
        onToggle={(event) =>
          setIsSettingsOpen((event.target as HTMLDetailsElement).open)
        }
        className="bg-panel rounded-xl border p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold select-none">
          Campaign Bible Settings
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Voice Style</Label>
            <Textarea
              value={bibleForm.voiceStyle}
              onChange={(event) =>
                setBibleForm((prev) => ({
                  ...prev,
                  voiceStyle: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Textarea
              value={bibleForm.audience}
              onChange={(event) =>
                setBibleForm((prev) => ({
                  ...prev,
                  audience: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Goal</Label>
            <Textarea
              value={bibleForm.goal}
              onChange={(event) =>
                setBibleForm((prev) => ({ ...prev, goal: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Preference</Label>
            <Input
              value={bibleForm.ctaPreference}
              onChange={(event) =>
                setBibleForm((prev) => ({
                  ...prev,
                  ctaPreference: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Pillars</Label>
            <Textarea
              value={bibleForm.pillars}
              onChange={(event) =>
                setBibleForm((prev) => ({
                  ...prev,
                  pillars: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Forbidden</Label>
            <Textarea
              value={bibleForm.forbidden}
              onChange={(event) =>
                setBibleForm((prev) => ({
                  ...prev,
                  forbidden: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              runAction(
                () =>
                  updateCampaignBible({
                    campaignId: data.campaign.id,
                    ...bibleForm,
                  }),
                "Campaign bible updated.",
                "saveBible",
              )
            }
          >
            {pendingAction === "saveBible" ? "Saving..." : "Save Bible"}
          </Button>
        </div>
      </details>

      <section className="grid min-h-[700px] gap-4 xl:grid-cols-[460px_1fr]">
        <aside className="bg-panel rounded-xl border p-3">
          <div className="space-y-4">
            {acts.map((act) => (
              <div key={act.actNumber} className="space-y-2">
                <p className="text-muted px-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  Act {act.actNumber}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {act.days.map((day) => {
                    const postStatus = postByDay.get(day.dayNumber)?.status;
                    const isActive = day.dayNumber === selectedDay;

                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDay(day.dayNumber)}
                        className={`rounded-lg border p-2 text-left transition ${
                          isActive
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-border bg-panel-2 hover:border-zinc-400"
                        }`}
                      >
                        <p className="text-xs font-semibold tracking-wide uppercase">
                          Day {day.dayNumber}
                        </p>
                        <p className="line-clamp-2 text-xs">{day.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge
                            variant={
                              day.status === "APPROVED"
                                ? "success"
                                : "secondary"
                            }
                            className={isActive ? "bg-white text-zinc-900" : ""}
                          >
                            O:{day.status === "APPROVED" ? "A" : "D"}
                          </Badge>
                          <Badge
                            variant={
                              postStatus === "APPROVED" ? "success" : "outline"
                            }
                            className={
                              isActive ? "border-white text-white" : ""
                            }
                          >
                            P:
                            {postStatus === "APPROVED"
                              ? "A"
                              : postStatus
                                ? "D"
                                : "-"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="bg-panel rounded-xl border p-4">
          {selectedOutline ? (
            <Tabs defaultValue="outline">
              <TabsList>
                <TabsTrigger value="outline">Outline</TabsTrigger>
                <TabsTrigger value="post">Post</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
              </TabsList>

              <TabsContent value="outline" className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Day {selectedOutline.dayNumber} Outline
                    </h2>
                    <p className="text-muted text-sm">
                      Act {selectedOutline.actNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(selectedOutline.status)}>
                      {selectedOutline.status === "APPROVED"
                        ? "Approved"
                        : "Draft"}
                    </Badge>
                    <Badge variant="outline">
                      v{selectedOutline.versionNumber}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={outlineForm.title}
                      disabled={data.campaign.isOutlineLocked}
                      onChange={(event) =>
                        setOutlineForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Hook</Label>
                    <Textarea
                      value={outlineForm.hook}
                      disabled={data.campaign.isOutlineLocked}
                      onChange={(event) =>
                        setOutlineForm((prev) => ({
                          ...prev,
                          hook: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Format</Label>
                      <Input
                        value={outlineForm.format}
                        disabled={data.campaign.isOutlineLocked}
                        onChange={(event) =>
                          setOutlineForm((prev) => ({
                            ...prev,
                            format: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>CTA</Label>
                      <Input
                        value={outlineForm.cta}
                        disabled={data.campaign.isOutlineLocked}
                        onChange={(event) =>
                          setOutlineForm((prev) => ({
                            ...prev,
                            cta: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Key Points (3 bullets)</Label>
                    <Textarea
                      value={outlineForm.keyPoints}
                      disabled={data.campaign.isOutlineLocked}
                      onChange={(event) =>
                        setOutlineForm((prev) => ({
                          ...prev,
                          keyPoints: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Constraints</Label>
                    <Input
                      value={outlineForm.constraints}
                      disabled={data.campaign.isOutlineLocked}
                      onChange={(event) =>
                        setOutlineForm((prev) => ({
                          ...prev,
                          constraints: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={isPending || data.campaign.isOutlineLocked}
                    onClick={() => {
                      const keyPoints = parseBulletList(outlineForm.keyPoints);
                      if (keyPoints.length !== 3) {
                        toast.error(
                          "Key points must contain exactly 3 bullets.",
                        );
                        return;
                      }

                      void runAction(
                        () =>
                          saveEditsOutlineDay({
                            dayOutlineId: selectedOutline.id,
                            ...outlineForm,
                            keyPoints,
                          }),
                        "Outline saved.",
                        "saveOutline",
                      );
                    }}
                  >
                    {pendingAction === "saveOutline"
                      ? "Saving..."
                      : "Save Outline Edits"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending || data.campaign.isOutlineLocked}
                    onClick={() =>
                      runAction(
                        () =>
                          generateOutlineDay({
                            campaignId: data.campaign.id,
                            dayNumber: selectedOutline.dayNumber,
                          }),
                        "Day outline regenerated.",
                        "regenerateDay",
                      )
                    }
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {pendingAction === "regenerateDay"
                      ? "Regenerating..."
                      : "Regenerate Day Outline"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          approveOutlineDay({
                            dayOutlineId: selectedOutline.id,
                            approved: selectedOutline.status !== "APPROVED",
                          }),
                        selectedOutline.status === "APPROVED"
                          ? "Outline marked draft."
                          : "Outline approved.",
                        "approveOutline",
                      )
                    }
                  >
                    <Check className="h-4 w-4" />
                    {selectedOutline.status === "APPROVED"
                      ? "Mark Draft"
                      : "Approve Outline"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="post" className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Day {selectedOutline.dayNumber} Post
                    </h2>
                    <p className="text-muted text-sm">
                      {data.campaign.isOutlineLocked
                        ? "Outline locked: post generation enabled."
                        : "Lock outline to generate posts."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPost ? (
                      <>
                        <Badge variant={statusVariant(selectedPost.status)}>
                          {selectedPost.status === "APPROVED"
                            ? "Approved"
                            : "Draft"}
                        </Badge>
                        <Badge variant="outline">
                          v{selectedPost.versionNumber}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline">No post yet</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>LinkedIn Post Text</Label>
                  <Textarea
                    className="min-h-[280px]"
                    value={postForm.text}
                    onChange={(event) =>
                      setPostForm((prev) => ({
                        ...prev,
                        text: event.target.value,
                      }))
                    }
                  />
                  <p className="text-muted text-xs">
                    {postForm.text.length}/2200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Alt Hooks (optional, up to 3)</Label>
                  <Textarea
                    value={postForm.altHooks}
                    onChange={(event) =>
                      setPostForm((prev) => ({
                        ...prev,
                        altHooks: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={isPending || !data.campaign.isOutlineLocked}
                    onClick={() =>
                      runAction(
                        () =>
                          generatePostDay({
                            campaignId: data.campaign.id,
                            dayNumber: selectedOutline.dayNumber,
                          }),
                        "Post generated.",
                        "regeneratePost",
                      )
                    }
                  >
                    <WandSparkles className="h-4 w-4" />
                    {selectedPost
                      ? pendingAction === "regeneratePost"
                        ? "Regenerating..."
                        : "Regenerate Post"
                      : pendingAction === "regeneratePost"
                        ? "Generating..."
                        : "Generate Post"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      if (postForm.text.length > 2200) {
                        toast.error(
                          "Post text must be 2200 characters or less.",
                        );
                        return;
                      }

                      void runAction(
                        () =>
                          saveEditsPostDay({
                            campaignId: data.campaign.id,
                            dayNumber: selectedOutline.dayNumber,
                            text: postForm.text,
                            altHooks: parseBulletList(postForm.altHooks).slice(
                              0,
                              3,
                            ),
                          }),
                        "Post saved.",
                        "savePost",
                      );
                    }}
                  >
                    {pendingAction === "savePost"
                      ? "Saving..."
                      : "Save Post Edits"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending || !selectedPost}
                    onClick={() => {
                      if (!selectedPost) {
                        return;
                      }

                      void runAction(
                        () =>
                          approvePostDay({
                            campaignId: data.campaign.id,
                            dayNumber: selectedOutline.dayNumber,
                            approved: selectedPost.status !== "APPROVED",
                          }),
                        selectedPost.status === "APPROVED"
                          ? "Post marked draft."
                          : "Post approved.",
                        "approvePost",
                      );
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {selectedPost?.status === "APPROVED"
                      ? "Mark Draft"
                      : "Approve Post"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="versions" className="space-y-4 pt-2">
                <div>
                  <h2 className="text-xl font-semibold">Version History</h2>
                  <p className="text-muted text-sm">
                    Restore previous outline or post versions for this day.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border-border space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-semibold">Outline Versions</p>
                    <Separator />
                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                      {outlineVersions.length === 0 ? (
                        <p className="text-muted text-sm">
                          No outline versions yet.
                        </p>
                      ) : (
                        outlineVersions.map((version) => (
                          <div
                            key={version.id}
                            className="rounded-md border p-2 text-xs"
                          >
                            <p className="font-medium">
                              v{version.versionNumber}
                            </p>
                            <p className="text-muted">
                              {formatDate(version.createdAt)}
                            </p>
                            <p className="text-muted">
                              Source: {version.source}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    restoreVersion({
                                      type: "outline",
                                      versionId: version.id,
                                    }),
                                  "Outline version restored.",
                                  "restore",
                                )
                              }
                            >
                              Restore
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-border space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-semibold">Post Versions</p>
                    <Separator />
                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                      {postVersions.length === 0 ? (
                        <p className="text-muted text-sm">
                          No post versions yet.
                        </p>
                      ) : (
                        postVersions.map((version) => (
                          <div
                            key={version.id}
                            className="rounded-md border p-2 text-xs"
                          >
                            <p className="font-medium">
                              v{version.versionNumber}
                            </p>
                            <p className="text-muted">
                              {formatDate(version.createdAt)}
                            </p>
                            <p className="text-muted">
                              Source: {version.source}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    restoreVersion({
                                      type: "post",
                                      versionId: version.id,
                                    }),
                                  "Post version restored.",
                                  "restore",
                                )
                              }
                            >
                              Restore
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-muted text-sm">No day selected.</p>
          )}
        </section>
      </section>

      <Dialog open={showUnlockWarning} onOpenChange={setShowUnlockWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock outline?</DialogTitle>
            <DialogDescription>
              Posts already exist. Unlocking and regenerating outline days can
              cause campaign drift.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>
                Confirm only if you intend to revise the campaign arc and
                regenerate impacted posts.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlockWarning(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowUnlockWarning(false);
                void runAction(
                  () =>
                    unlockCampaign({
                      campaignId: data.campaign.id,
                      confirmDrift: true,
                    }),
                  "Outline unlocked.",
                  "unlock",
                );
              }}
            >
              Unlock Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
