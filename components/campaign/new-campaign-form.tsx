"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createCampaign } from "@/app/actions/campaign";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignTemplateData } from "@/lib/types";

type NewCampaignFormProps = {
  templates: CampaignTemplateData[];
};

export function NewCampaignForm({ templates }: NewCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultTemplateId = templates[0]?.id ?? "";

  const [form, setForm] = useState({
    name: "",
    theme: "",
    templateId: defaultTemplateId,
    voiceStyle: "Clear, candid, tactical.",
    audience: "Operators, founders, and GTM leads.",
    goal: "Build trust and qualified inbound conversations.",
    pillars: "Practical execution\nStrategic clarity\nReal examples",
    forbidden:
      "No vague platitudes\nNo manipulative urgency\nNo hashtags stuffing",
    ctaPreference: "Invite practical discussion in comments.",
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId),
    [form.templateId, templates],
  );

  const onSubmit = () => {
    startTransition(async () => {
      try {
        const result = await createCampaign(form);
        toast.success("Campaign created.");
        router.push(`/campaigns/${result.campaignId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create campaign.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
          <CardDescription>
            Start with a template arc, theme, and campaign bible guardrails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Q2 Founder Story Arc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                value={form.theme}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, theme: event.target.value }))
                }
                placeholder="Operational clarity for scaling teams"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Template Arc</Label>
            <Select
              value={form.templateId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, templateId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose campaign template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice-style">Voice Style</Label>
              <Textarea
                id="voice-style"
                value={form.voiceStyle}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    voiceStyle: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Textarea
                id="audience"
                value={form.audience}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, audience: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Campaign Goal</Label>
            <Textarea
              id="goal"
              value={form.goal}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, goal: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pillars">Pillars (3-5 bullets)</Label>
              <Textarea
                id="pillars"
                value={form.pillars}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pillars: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forbidden">Forbidden (3-5 bullets)</Label>
              <Textarea
                id="forbidden"
                value={form.forbidden}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    forbidden: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta-pref">CTA Preference (optional)</Label>
            <Input
              id="cta-pref"
              value={form.ctaPreference}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ctaPreference: event.target.value,
                }))
              }
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={isPending || templates.length === 0}
          >
            {isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Intent</CardTitle>
          <CardDescription>
            Acts are fixed at 10 days each for the 30-day campaign arc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {selectedTemplate ? (
            <>
              <p className="text-muted">{selectedTemplate.description}</p>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Act 1:</span>{" "}
                  {selectedTemplate.act1Intent}
                </p>
                <p>
                  <span className="font-semibold">Act 2:</span>{" "}
                  {selectedTemplate.act2Intent}
                </p>
                <p>
                  <span className="font-semibold">Act 3:</span>{" "}
                  {selectedTemplate.act3Intent}
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold">Suggested Format Rotation</p>
                <p className="text-muted">
                  {selectedTemplate.formatRotation.join(" • ")}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted">
              No templates found. Run `npm run db:seed`.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
