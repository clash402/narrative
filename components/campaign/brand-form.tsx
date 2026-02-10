"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateBrandProfile } from "@/app/actions/campaign";
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
import { Textarea } from "@/components/ui/textarea";

type BrandFormProps = {
  initial: {
    companyName: string;
    description: string;
    website: string;
    primaryOffer: string;
  };
};

export function BrandForm({ initial }: BrandFormProps) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(initial);

  const onSubmit = () => {
    startTransition(async () => {
      try {
        await updateBrandProfile(form);
        toast.success("Brand profile saved.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save brand profile.";
        toast.error(message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Profile</CardTitle>
        <CardDescription>
          This profile is optional in MVP, but useful context for campaign and
          post generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Brand Name</Label>
          <Input
            id="companyName"
            value={form.companyName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, companyName: event.target.value }))
            }
            placeholder="Acme Advisory"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="What your business does and for whom"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, website: event.target.value }))
              }
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryOffer">Primary Offer</Label>
            <Input
              id="primaryOffer"
              value={form.primaryOffer}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  primaryOffer: event.target.value,
                }))
              }
              placeholder="Consulting / product / service"
            />
          </div>
        </div>

        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? "Saving..." : "Save Brand Profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
