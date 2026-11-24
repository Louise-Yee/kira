import { Fragment, useEffect, useRef, useState } from "react";
import { ReceiptText, User, Users } from "lucide-react";
import { toastUndo } from '@/lib/toast'
import { EmptyState } from "@/components/empty-state";
import { Fab } from "@/components/fab";
import { ListRow } from "@/components/list-row";
import { Money } from "@/components/money";
import { ReceiptSheet } from "@/components/receipt-sheet";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { SplitEditor } from "@/components/split-editor";
import { SwipeRow } from "@/components/swipe-row";
import { addDays, dayLabel, monthLabel } from "@/lib/date";
import {
  createShare,
  deleteSplit,
  saveSplit,
  setPaid,
  useCategories,
  useFriendships,
  useOlderSplits,
  useRecentSplits,
  useSettings,
  SPLITS_PAGE,
  type Split,
  type WithId,
} from "@/lib/db";
import type { AppUser } from "@/lib/firebase";
import { otherUid, splitFriendships } from "@/lib/friends";
import { owedOn } from "@/lib/split";

export function SplitScreen({ user, today }: { user: AppUser; today: string }) {
  const since = addDays(today, -30);
  const [tab, setTab] = useState<"recent" | "history">("recent");
  const [count, setCount] = useState(SPLITS_PAGE);
  const recent = useRecentSplits(user.uid, since);
  const older = useOlderSplits(user.uid, since, count, tab === "history");
  const splits = tab === "recent" ? recent : older;
  // Infinite scroll: when the sentinel scrolls into view and the last page was full, ask for another page.
  // The effect re-runs per page, so a sentinel that is still visible fires again.
  const sentinel = useRef<HTMLDivElement>(null);
  const more =
    tab === "history" && older !== undefined && older.length >= count;
  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setCount((c) => c + SPLITS_PAGE),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, older?.length]);
  const categories = useCategories(user.uid) ?? [];
  // My friends on kira, offered in the editor before names from past splits.
  const friends = splitFriendships(useFriendships(user.uid) ?? [], user.uid).friends.map((f) => {
    const uid = otherUid(f, user.uid);
    return { uid, displayName: f.names[uid]?.displayName ?? "", photoURL: f.names[uid]?.photoURL ?? null };
  });
  const qr = useSettings(user.uid)?.tngQr;
  // `open` and `split` are separate so a sheet keeps its content while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; split?: WithId<Split> }>({
    open: false,
  });
  const [receipt, setReceipt] = useState<{
    open: boolean;
    split?: WithId<Split>;
  }>({ open: false });
  // The receipt sheet shows the live split, so a link made a moment ago is found again on the next tap.
  const receiptSplit =
    [...(recent ?? []), ...(older ?? [])].find(
      (s) => s.id === receipt.split?.id,
    ) ?? receipt.split;
  const open = (split?: WithId<Split>) => setSheet({ open: true, split });
  // The editor shows the live split, so a tick made a moment ago is seen at once.
  const editing =
    [...(recent ?? []), ...(older ?? [])].find((s) => s.id === sheet.split?.id) ?? sheet.split;

  // Names from past splits (newest first, without me), offered as one-tap additions.
  const suggestions = [
    ...new Set(
      [...(recent ?? []), ...(older ?? [])].flatMap((s) => s.people.slice(1)),
    ),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Split">
        <Segmented
          options={[
            { value: "recent", label: "Recent" },
            { value: "history", label: "History" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageHeader>

      {splits?.length === 0 &&
        (tab === "recent" ? (
          <EmptyState
            icon={ReceiptText}
            text="Split one bill you paid, once. For a running tab with friends, make a group in People."
            action={{ label: "New split", onClick: () => open() }}
          />
        ) : (
          <EmptyState icon={ReceiptText} text="No older splits yet." />
        ))}
      <div className="flex flex-col gap-2">
        {splits?.map((s, i) => (
          <Fragment key={s.id}>
            {tab === "history" &&
              (i === 0 ||
                s.date.slice(0, 7) !== splits[i - 1].date.slice(0, 7)) && (
                <h2 className="px-1 pt-3 text-base font-semibold text-muted-foreground">
                  {monthLabel(s.date.slice(0, 7))}
                </h2>
              )}
            <SwipeRow
              label="Share"
              hintKey={i === 0 ? 'kira.hint.swipe-share' : undefined}
              onSwipe={() => setReceipt({ open: true, split: s })}
            >
              <ListRow
                icon={
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                    <Users className="size-5" aria-hidden />
                  </span>
                }
                title={s.title}
                subtitle={
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-base font-semibold text-secondary-foreground">
                      <User className="size-4" aria-hidden />
                      <span aria-label={`${s.people.length} people`}>
                        {s.people.length}
                      </span>
                    </span>
                    {dayLabel(s.date, today)}
                  </span>
                }
                trailing={
                  <span className="flex shrink-0 flex-col items-end">
                    <Money
                      sen={s.shares[0].total}
                      currency={s.currency}
                      className="text-base font-semibold"
                    />
                    <Owed split={s} />
                  </span>
                }
                onClick={() => open(s)}
              />
            </SwipeRow>
          </Fragment>
        ))}
        {more && <div ref={sentinel} className="h-8" />}
      </div>

      <Fab label="Add" onClick={() => open()} />
      <SplitEditor
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        suggestions={suggestions}
        friends={friends}
        initial={editing}
        onSave={(draft) => saveSplit(user.uid, draft, editing)}
        onPaid={(person, paid) => editing && setPaid(user.uid, editing, person, paid)}
        onDelete={() => sheet.split && toastUndo('Split deleted', deleteSplit(user.uid, sheet.split))}
        onShare={() => sheet.split && setReceipt({ open: true, split: sheet.split })}
      />
      <ReceiptSheet
        open={receipt.open}
        onClose={() => setReceipt((r) => ({ ...r, open: false }))}
        split={receiptSplit}
        qr={qr}
        onCreateLink={(split, person) => createShare(user.uid, split, person)}
      />
    </div>
  );
}

/** What the others still owe on a split, or "Settled" once everyone has paid back. Nothing when nobody owes. */
function Owed({ split }: { split: WithId<Split> }) {
  const { owed, people } = owedOn(split);
  if (people === 0) return null;
  return owed === 0 ? (
    <span className="text-base text-muted-foreground">Settled</span>
  ) : (
    <span className="text-base text-muted-foreground">
      <Money sen={owed} currency={split.currency} /> owed
    </span>
  );
}
