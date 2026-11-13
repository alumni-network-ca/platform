import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { serverEnv } from "@/config/env/server";
import { SCHOOL_HEADER, SITE_HEADER } from "@/config/tenancy";
import { decodeSchool, type PublicSchool } from "@/lib/school";
import type { Origin } from "./address";
import { schoolConfig } from "./config";

/**
 * The school of this request, resolved by proxy.ts from the host and never taken from the client, with its branding
 * from the cached config. Null on the root site. It is a routing hint, not proof of access: RLS and the RPCs still
 * check memberships (ADR 0001). Read once per request.
 */
export const getSchool = cache(async (): Promise<PublicSchool | null> => {
  const school = decodeSchool((await headers()).get(SCHOOL_HEADER));
  if (!school) return null;
  const { branding } = await schoolConfig(school.id);
  return { ...school, branding };
});

/** Which site this request is on, as proxy.ts resolved it from the host: the landing page, the console or a school. */
export async function getSite(): Promise<"root" | "admin" | "school"> {
  const site = (await headers()).get(SITE_HEADER);
  return site === "root" || site === "admin" ? site : "school";
}

/** For school pages: a 404 when the request has no school. */
export async function requireSchool(): Promise<PublicSchool> {
  return (await getSchool()) ?? notFound();
}

/** This request's origin, for links between the root site and the schools' addresses (lib/tenant/address.ts). */
export async function getOrigin(): Promise<Origin> {
  const h = await headers();
  const host = h.get("host") ?? "localhost";
  const forwarded = h.get("x-forwarded-proto");
  const local = /(^|\.)localhost(:\d+)?$/.test(host);
  return {
    protocol: forwarded === "https" || (!forwarded && !local) ? "https:" : "http:",
    host,
    rootDomain: serverEnv.rootDomain,
    isPreview: serverEnv.isPreview,
  };
}
