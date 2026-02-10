import { CampaignWorkspace } from "@/components/campaign/workspace";
import { getWorkspace } from "@/lib/server/workspace";

type CampaignPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const workspace = await getWorkspace(id);

  return <CampaignWorkspace data={workspace} />;
}
