"use client";

import Image from "next/image";
import Link from "next/link";
import { schoolBranding } from "@/lib/school";
import { useSchool } from "./SchoolProvider";

export function Brand() {
  const { shortName, networkName, logo } = schoolBranding(useSchool());
  const initials = shortName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    // The visible text is the accessible name (axe label-content-name-mismatch); the logo is decorative.
    <Link className="brand" href="/">
      {logo ? (
        <Image src={logo} alt="" width={68} height={68} className="brandLogo brandIcon" priority />
      ) : (
        <span className="brandMonogram" aria-hidden="true">
          {initials}
        </span>
      )}
      <div className="brandText">
        <div className="brandName">{networkName}</div>
        <div className="brandSub">Private · verified · connected</div>
      </div>
    </Link>
  );
}
