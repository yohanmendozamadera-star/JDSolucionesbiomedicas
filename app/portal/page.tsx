import { redirect } from "next/navigation";
import { getSessionUser } from "../app-auth";
import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <PortalClient email={String(user.email||"")} name={String(user.name||"")} role={String(user.role||"owner") as "superowner"|"owner"|"admin"} company={String(user.company||"")} />;
}
