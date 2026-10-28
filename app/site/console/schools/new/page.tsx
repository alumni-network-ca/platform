import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { getOrigin } from "@/lib/tenant/server";
import { NewSchoolForm } from "./NewSchoolForm";

// S1.2 Create a school.
export default async function NewSchoolPage() {
  await requirePlatformAdmin("/console/schools/new");
  return (
    <>
      <Link className="backLink" href="/console">
        ← Schools
      </Link>
      <div className="shellTitle">
        <div>
          <h1>New school</h1>
          <p>The school&apos;s network is live at its address as soon as it is created.</p>
        </div>
      </div>
      <NewSchoolForm origin={await getOrigin()} />
    </>
  );
}
