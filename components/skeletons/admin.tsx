import { Skeleton } from "@/components/ui/skeleton";
import { FieldSkeleton, LoadingStatus, TextLines, times } from "./parts";
import { ui } from "@/components/admin/parts";

// Skeletons of the school admin pages and the platform console. They render inside the shell's <main>, under the
// nav bar and beside the admin menu, which stay in place while the page loads.

function Title({ subtitle = true, action = false }: { subtitle?: boolean; action?: boolean }) {
  return (
    <div className={ui.shellTitle} aria-hidden="true">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-8 w-56 max-w-full" />
        {subtitle && <Skeleton className="h-4 w-72 max-w-full" />}
      </div>
      {action && <Skeleton className="h-11 w-44" />}
    </div>
  );
}

function Stats({ count }: { count: number }) {
  return (
    <div className={ui.statGrid} aria-hidden="true">
      {times(count).map((i) => (
        <div key={i} className={ui.statCard}>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  );
}

function Panel({ lines = 3, heading = true }: { lines?: number; heading?: boolean }) {
  return (
    <div className={ui.panel} aria-hidden="true">
      {heading && <Skeleton className="h-5 w-40" />}
      <TextLines count={lines} />
    </div>
  );
}

function Table({ rows, columns }: { rows: number; columns: number }) {
  return (
    <div className={ui.tableBox} aria-hidden="true">
      <table className={ui.dataTable}>
        <thead>
          <tr>
            {times(columns).map((c) => (
              <th key={c}>
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times(rows).map((r) => (
            <tr key={r}>
              {times(columns).map((c) => (
                <td key={c}>
                  {c === 0 ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-24" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The dashboard: title with the period filter, the "needs you" banner, the counts and recent activity. */
export function AdminDashboardSkeleton({ label }: { label: string }) {
  return (
    <>
      <LoadingStatus label={label} />
      <Title action />
      <Skeleton className="h-[88px] rounded-lg" />
      <Stats count={4} />
      <Panel lines={5} />
    </>
  );
}

/** A list page: title, then tabs or filters, then the table. The console's lists start with counts. */
export function AdminTableSkeleton({
  label,
  tabs = false,
  filters = false,
  stats = 0,
  columns = 4,
}: {
  label: string;
  tabs?: boolean;
  filters?: boolean;
  stats?: number;
  columns?: number;
}) {
  return (
    <>
      <LoadingStatus label={label} />
      <Title />
      {stats > 0 && <Stats count={stats} />}
      {tabs && (
        <div className={ui.adminTabs} aria-hidden="true">
          {["w-24", "w-28", "w-20"].map((width) => (
            <Skeleton key={width} className={`h-9 ${width}`} />
          ))}
        </div>
      )}
      {filters && (
        <div className={ui.adminFilters} aria-hidden="true">
          {times(3).map((i) => (
            <FieldSkeleton key={i} className="w-44" />
          ))}
        </div>
      )}
      <Table rows={8} columns={columns} />
    </>
  );
}

/** One record: the back link, its title, then panels side by side. */
export function AdminDetailSkeleton({ label, stats = 0 }: { label: string; stats?: number }) {
  return (
    <>
      <LoadingStatus label={label} />
      <Skeleton className="h-4 w-32" />
      <Title />
      {stats > 0 && <Stats count={stats} />}
      <div className={ui.panelGrid} aria-hidden="true">
        <Panel lines={4} />
        <Panel lines={4} />
      </div>
      <Panel lines={3} />
    </>
  );
}

/** A settings or editing page: title, then a panel of fields and the save button. */
export function AdminFormSkeleton({ label, fields = 4 }: { label: string; fields?: number }) {
  return (
    <>
      <LoadingStatus label={label} />
      <Title />
      <div className={ui.panel} aria-hidden="true">
        <Skeleton className="h-5 w-40" />
        {times(fields).map((i) => (
          <FieldSkeleton key={i} className="max-w-xl" />
        ))}
        <Skeleton className="h-11 w-28" />
      </div>
    </>
  );
}
