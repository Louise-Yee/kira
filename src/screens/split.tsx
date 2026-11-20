import { Fragment, useEffect, useRef, useState } from "react";
import { ReceiptText, Share2, User, Users } from "lucide-react";
import { motion } from "motion/react";
import { toastUndo } from '@/lib/toast'
import { EmptyState } from "@/components/empty-state";
import { Fab } from "@/components/fab";
import { ListRow } from "@/components/list-row";
import { Money } from "@/components/money";
import { ReceiptSheet } from "@/components/receipt-sheet";
import { Segmented } from "@/components/segmented";
import { SplitEditor } from "@/components/split-editor";
import { SwipeRow } from "@/components/swipe-row";
import { addDays, dayLabel, monthLabel } from "@/lib/date";
import {
  createShare,
  deleteSplit,
  saveSplit,
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

  // Names from past splits (newest first, without me), offered as one-tap additions.
  const suggestions = [
    ...new Set(
      [...(recent ?? []), ...(older ?? [])].flatMap((s) => s.people.slice(1)),
    ),
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Split
      </h1>

      <Segmented
        options={[
          { value: "recent", label: "Recent" },
          { value: "history", label: "History" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {splits?.length === 0 &&
        (tab === "recent" ? (
          <EmptyState
            icon={ReceiptText}
            text="No splits in the last 30 days. Your own share of a bill lands in your expenses."
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
              onSwipe={() => setReceipt({ open: true, split: s })}
            >
              <div className="flex gap-2">
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
                  <Money
                    sen={s.shares[0].total}
                    className="text-base font-semibold"
                  />
                }
                onClick={() => open(s)}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }} // a small target needs a deeper press to read like the row's 0.96
                aria-label={`Share ${s.title}`}
                onClick={() => setReceipt({ open: true, split: s })}
                className="flex w-14 shrink-0 items-center justify-center rounded-2xl bg-card text-muted-foreground transition-colors active:bg-secondary active:text-foreground"
              >
                <Share2 className="size-5" aria-hidden />
              </motion.button>
              </div>
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
        initial={sheet.split}
        onSave={(draft) => saveSplit(user.uid, draft, sheet.split)}
        onDelete={() => sheet.split && toastUndo('Split deleted', deleteSplit(user.uid, sheet.split))}
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
