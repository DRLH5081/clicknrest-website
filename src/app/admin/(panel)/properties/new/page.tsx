import { PageHeader, Flash } from "@/components/admin/ui";
import { PropertyDetailsForm } from "@/components/admin/PropertyDetailsForm";
import { saveProperty } from "../../../actions";

export const metadata = { title: "Add property" };

export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader back={{ href: "/admin/properties", label: "Properties" }} title="Add a property" description="It starts as a draft. Add prices and photos, then publish when ready." />
      <Flash error={sp.error} />
      <PropertyDetailsForm action={saveProperty.bind(null, null)} />
    </>
  );
}
