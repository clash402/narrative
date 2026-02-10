import { NewCampaignForm } from "@/components/campaign/new-campaign-form";
import { getTemplates } from "@/lib/server/workspace";

export default async function NewCampaignPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>
      <NewCampaignForm templates={templates} />
    </div>
  );
}
