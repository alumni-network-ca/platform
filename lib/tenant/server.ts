import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { decodeSchool, type PublicSchool } from "@/lib/school";
import { SCHOOL_HEADER } from "./host";

/**
 * The school of this request, resolved by proxy.ts from the host and never taken from the client. Null on the
 * root site. It is a routing hint, not proof of access: RLS and the RPCs still check memberships (ADR 0001).
 */
export async function getSchool(): Promise<PublicSchool | null> {
  return decodeSchool((await headers()).get(SCHOOL_HEADER));
}

/** For school pages: a 404 when the request has no school. */
export async function requireSchool(): Promise<PublicSchool> {
  return (await getSchool()) ?? notFound();
}
