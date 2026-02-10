import { BrandForm } from "@/components/campaign/brand-form";
import { db } from "@/lib/server/db";

export default async function BrandPage() {
  const brand = await db.brandProfile.findFirst();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Brand Settings</h1>
      <BrandForm
        initial={{
          companyName: brand?.companyName ?? "",
          description: brand?.description ?? "",
          website: brand?.website ?? "",
          primaryOffer: brand?.primaryOffer ?? "",
        }}
      />
    </div>
  );
}
