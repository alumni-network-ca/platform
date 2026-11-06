import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FieldSkeleton, LoadingStatus, PersonCardSkeleton, TextLines, times } from "./parts";

// Skeletons of the alumni pages (home, directory, profile, the profile forms), in their pages' own layout classes.

const OFFER_WIDTHS = ["w-24", "w-32", "w-20", "w-28"];

export function HomeSkeleton({ label }: { label: string }) {
  return (
    <main className="homePage" aria-busy="true">
      <LoadingStatus label={label} />
      <div className="homeHead" aria-hidden="true">
        <Skeleton className="h-3.5 w-56 max-w-full" />
        <Skeleton className="h-9 w-80 max-w-full" />
      </div>
      <div className="homeColumns" aria-hidden="true">
        <div className="homeMain">
          <div className="homePanel">
            <Skeleton className="h-5 w-56" />
            <div className="flex gap-2.5">
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              {OFFER_WIDTHS.map((width) => (
                <Skeleton key={width} className={cn("h-8 rounded-full", width)} />
              ))}
            </div>
          </div>
          {times(2).map((section) => (
            <div key={section} className="homeSection">
              <div className="homeSectionHead">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="homeGrid">
                {times(3).map((i) => (
                  <PersonCardSkeleton key={i} className="homeCard" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="homeSide">
          <div className="homePanel">
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
            <div key={lines} className="homePanel">
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
    <ul className="dirGrid" aria-hidden="true">
      {times(9).map((i) => (
        <li key={i}>
          <PersonCardSkeleton className="dirCard" />
        </li>
      ))}
    </ul>
  );
}

export function DirectorySkeleton({ label }: { label: string }) {
  return (
    <main className="dir" aria-busy="true">
      <LoadingStatus label={label} />
      <div className="dirHead" aria-hidden="true">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-96 max-w-full" />
        </div>
        <Skeleton className="mb-1.5 h-4 w-28" />
      </div>
      <div className="dirForm" aria-hidden="true">
        <Skeleton className="h-14 rounded-lg" />
        <div className="dirBody">
          <div className="dirFilters">
            <Skeleton className="h-10 w-28 min-[721px]:hidden" />
            <div className="dirPanel">
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
          <div className="dirResults">
            <div className="dirResultsHead">
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
    <div className="meCard meSection">
      <Skeleton className="h-5 w-40" />
      <TextLines count={lines} />
    </div>
  );
}

/** A profile: your own (/me) or another alumnus's (/profile/…), which has a back link and a banner. */
export function ProfileSkeleton({ label, other = false }: { label: string; other?: boolean }) {
  return (
    <main className={other ? "me profPage" : "me"} aria-busy="true">
      <LoadingStatus label={label} />
      {other && (
        <div className="meBackLink profBack" aria-hidden="true">
          <Skeleton className="h-4 w-36" />
        </div>
      )}
      <div className="meMain" aria-hidden="true">
        {other ? (
          <div className="meCard profHead">
            <div className="profBanner" />
            <div className="profHeadBody">
              <Skeleton className="-mt-11 size-[88px] rounded-full border-4 border-white" />
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="meCard meHead">
            <Skeleton className="size-[84px] shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
        )}
        <SectionCard lines={3} />
        <SectionCard lines={2} />
      </div>
      <div className="meSide" aria-hidden="true">
        <SectionCard lines={2} />
        <SectionCard lines={3} />
      </div>
    </main>
  );
}

/** The one-card forms under /me (edit a section, visibility, delete): a heading, fields and the buttons. */
export function FormPageSkeleton({ label, fields = 4 }: { label: string; fields?: number }) {
  return (
    <main className="onb meNarrow" aria-busy="true">
      <LoadingStatus label={label} />
      <div className="onbCard" aria-hidden="true">
        <div className="onbBody">
          <div className="flex flex-col gap-2.5">
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
