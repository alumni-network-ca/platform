import {
  columns,
  directoryGrid,
  frame,
  mainColumn,
  panel,
  personCard,
  personGrid,
  sideColumn,
} from "@/components/alumni/parts";
import { profileSection, sideBox } from "@/components/alumni/profile";
import { formBody, formCard } from "@/components/profile/FormCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FieldSkeleton, LoadingStatus, PersonCardSkeleton, TextLines, times } from "./parts";

// Skeletons of the alumni pages (home, directory, profile, the profile forms), built from their pages' own classes
// (components/alumni/parts.tsx).

const OFFER_WIDTHS = ["w-24", "w-32", "w-20", "w-28"];

export function HomeSkeleton({ label }: { label: string }) {
  return (
    <main data-ui className={frame.stack} aria-busy="true">
      <LoadingStatus label={label} />
      <div className="flex flex-col gap-1.5" aria-hidden="true">
        <Skeleton className="h-3.5 w-56 max-w-full" />
        <Skeleton className="h-9 w-80 max-w-full" />
      </div>
      <div className={columns} aria-hidden="true">
        <div className={mainColumn}>
          <div className={cn(panel, "flex flex-col gap-4 p-6")}>
            <Skeleton className="h-5 w-56" />
            <div className="flex gap-2.5">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              {OFFER_WIDTHS.map((width) => (
                <Skeleton key={width} className={cn("h-8 rounded-full", width)} />
              ))}
            </div>
          </div>
          {times(2).map((section) => (
            <div key={section} className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className={personGrid}>
                {times(3).map((i) => (
                  <PersonCardSkeleton key={i} className={personCard} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={sideColumn}>
          <div className={cn(panel, "flex flex-col gap-3 p-5.5")}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-[46px] shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 max-w-full" />
              </div>
            </div>
            <TextLines count={1} />
          </div>
          {[2, 3].map((lines) => (
            <div key={lines} className={cn(panel, "flex flex-col gap-3 p-5.5")}>
              <Skeleton className="h-4 w-36" />
              <TextLines count={lines} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/** The directory's grid of people: the page while it loads, and the results while a new search runs. */
export function DirectoryResultsSkeleton() {
  return (
    <ul className={directoryGrid} aria-hidden="true">
      {times(9).map((i) => (
        <li key={i}>
          <PersonCardSkeleton className={personCard} />
        </li>
      ))}
    </ul>
  );
}

export function DirectorySkeleton({ label }: { label: string }) {
  return (
    <main data-ui className={frame.stack} aria-busy="true">
      <LoadingStatus label={label} />
      <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden="true">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-96 max-w-full" />
        </div>
        <Skeleton className="mb-1.5 h-4 w-28" />
      </div>
      <div className="flex flex-col gap-6" aria-hidden="true">
        <div className="flex h-14 items-center justify-end rounded-lg border border-input bg-card px-1.5">
          <Skeleton className="h-10 w-24" />
        </div>
        <div className={columns}>
          <div className="max-w-[280px] min-w-0 flex-[1_1_240px] max-[720px]:max-w-none max-[720px]:basis-full">
            <Skeleton className="h-11 w-28 min-[721px]:hidden" />
            <div className={cn(panel, "flex flex-col gap-5 p-5.5 max-[720px]:hidden")}>
              <Skeleton className="h-4 w-20" />
              {times(4).map((i) => (
                <FieldSkeleton key={i} />
              ))}
              <div className="flex flex-wrap gap-2">
                {OFFER_WIDTHS.map((width) => (
                  <Skeleton key={width} className={cn("h-8 rounded-full", width)} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-11 w-40" />
            </div>
            <DirectoryResultsSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionCard({ lines }: { lines: number }) {
  return (
    <div className={profileSection}>
      <Skeleton className="h-5 w-40" />
      <TextLines count={lines} />
    </div>
  );
}

function SideCard({ lines }: { lines: number }) {
  return (
    <div className={cn(sideBox, "items-stretch")}>
      <Skeleton className="h-4 w-32" />
      <TextLines count={lines} />
    </div>
  );
}

/** A profile: your own (/me) or another alumnus's (/profile/…), which has a back link and a banner. */
export function ProfileSkeleton({ label, other = false }: { label: string; other?: boolean }) {
  return (
    <main data-ui className={frame.split} aria-busy="true">
      <LoadingStatus label={label} />
      {other && (
        <div className="basis-full" aria-hidden="true">
          <Skeleton className="h-5 w-36" />
        </div>
      )}
      <div className={mainColumn} aria-hidden="true">
        {other ? (
          <div className={cn(panel, "overflow-hidden")}>
            <div className="h-[88px] bg-brand" />
            <div className="flex flex-col gap-3.5 px-7 pb-6.5 max-[720px]:px-5">
              <Skeleton className="-mt-11 size-[88px] rounded-full border-4 border-card" />
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(panel, "flex flex-wrap items-center gap-5 p-7 max-[720px]:p-5")}>
            <Skeleton className="size-[84px] shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
        )}
        <SectionCard lines={3} />
        <SectionCard lines={2} />
      </div>
      <div className={sideColumn} aria-hidden="true">
        <SideCard lines={2} />
        <SideCard lines={3} />
      </div>
    </main>
  );
}

/** The one-card forms under /me (edit a section, visibility, delete): a heading, fields and the buttons. */
export function FormPageSkeleton({ label, fields = 4 }: { label: string; fields?: number }) {
  return (
    <main data-ui className={cn(frame.form, frame.narrow)} aria-busy="true">
      <LoadingStatus label={label} />
      <div className={formCard} aria-hidden="true">
        <div className={formBody}>
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          {times(fields).map((i) => (
            <FieldSkeleton key={i} />
          ))}
          <div className="flex gap-3">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      </div>
    </main>
  );
}
