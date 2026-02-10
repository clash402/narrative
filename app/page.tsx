import Link from "next/link";
import { ArrowRight, Lock, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCampaignList } from "@/lib/server/workspace";

export default async function DashboardPage() {
  const campaigns = await getCampaignList();

  return (
    <div className="space-y-6">
      <section className="bg-panel rounded-xl border p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="text-muted text-sm font-medium tracking-[0.16em] uppercase">
              Campaign Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              30-Day LinkedIn Campaign Builder
            </h1>
            <p className="text-muted text-sm">
              Create thematic campaigns with locked outlines, per-day approvals,
              and on-voice post generation.
            </p>
          </div>
          <Button asChild>
            <Link href="/campaigns/new">
              New Campaign
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No campaigns yet</CardTitle>
              <CardDescription>
                Create your first 30-day campaign and start shaping your
                narrative arc.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ) : (
          campaigns.map((campaign) => {
            const approvedOutlineCount = campaign.dayOutlines.filter(
              (day) => day.status === "APPROVED",
            ).length;
            const approvedPostCount = campaign.dayPosts.filter(
              (day) => day.status === "APPROVED",
            ).length;

            return (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{campaign.name}</CardTitle>
                    {campaign.isOutlineLocked ? (
                      <Badge variant="warning">
                        <Lock className="mr-1 h-3 w-3" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <PenLine className="mr-1 h-3 w-3" />
                        Editable
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{campaign.theme}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted space-y-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">Template</p>
                    <p>{campaign.template.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs tracking-wide uppercase">
                        Outline Approved
                      </p>
                      <p className="text-foreground font-semibold">
                        {approvedOutlineCount}/30
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-wide uppercase">
                        Posts Approved
                      </p>
                      <p className="text-foreground font-semibold">
                        {approvedPostCount}/30
                      </p>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/campaigns/${campaign.id}`}>
                      Open Workspace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
