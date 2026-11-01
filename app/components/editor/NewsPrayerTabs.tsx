"use client";

import { useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import type { BulletinData, NewsItem, PrayerRequest } from "@/lib/bulletin-types";
import { Field, SectionTitle, Card, AddBtn, RemoveBtn } from "@/app/components/editor/ui";

export function NewsDragCard({
  item, index, onUpdate, onDelete,
}: {
  item: NewsItem;
  index: number;
  onUpdate: (patch: Partial<NewsItem>) => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: "none" }}
      whileDrag={{ scale: 1.025, zIndex: 50 }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 38 } }}
    >
      <motion.div
        layout
        animate={{ boxShadow: "0 2px 12px rgba(68,114,196,0.07)" }}
        whileDrag={{ boxShadow: "0 14px 44px rgba(68,114,196,0.22)" }}
        style={{
          borderRadius: 14, border: "1px solid #EEF2FF", background: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* Drag rail */}
          <div
            onPointerDown={e => controls.start(e)}
            style={{
              width: 38, flexShrink: 0,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "flex-start", paddingTop: 13, gap: 5,
              background: "linear-gradient(180deg,#EEF2FF 0%,#F8FAFC 100%)",
              borderRight: "1px solid #EEF2FF",
              cursor: "grab", userSelect: "none",
            }}
          >
            <motion.span
              key={index}
              initial={{ scale: 1.4, color: "#4472C4" }}
              animate={{ scale: 1, color: "#4472C4" }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              style={{ fontSize: 12, fontWeight: 900, lineHeight: 1 }}
            >
              {index + 1}
            </motion.span>
            <GripVertical size={13} color="#C7D2E8" />
          </div>
          {/* Content */}
          <div style={{ flex: 1, padding: "13px 13px 13px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Title" value={item.title} onChange={v => onUpdate({ title: v })} />
              <Field label="Body" value={item.body} onChange={v => onUpdate({ body: v })} multiline rows={3} />
            </div>
            <RemoveBtn onClick={onDelete} />
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ---------------------------------------------------------------------------
// Tab: News
// ---------------------------------------------------------------------------

export function NewsTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const MAX_NEWS = 5;
  const keyMap = useRef(new WeakMap<NewsItem, string>());
  const getKey = (item: NewsItem) => {
    if (!keyMap.current.has(item)) keyMap.current.set(item, Math.random().toString(36).slice(2));
    return keyMap.current.get(item)!;
  };

  const updateNews = (i: number, patch: Partial<NewsItem>) => {
    set({ news: data.news.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) });
  };
  const deleteNews = (i: number) =>
    set({ news: data.news.filter((_, idx) => idx !== i) });
  const addNews = () => {
    if (data.news.length < MAX_NEWS)
      set({ news: [...data.news, { title: "", body: "" }] });
  };
  const updateJoint = (i: number, patch: Partial<NewsItem>) => {
    set({
      jointPrayer: data.jointPrayer.map((n, idx) =>
        idx === i ? { ...n, ...patch } : n
      ),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>NY Church News</SectionTitle>
        <Reorder.Group
          axis="y"
          values={data.news}
          onReorder={newOrder => set({ news: newOrder })}
          style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <AnimatePresence initial={false}>
            {data.news.map((item, i) => (
              <NewsDragCard
                key={getKey(item)}
                item={item}
                index={i}
                onUpdate={patch => updateNews(i, patch)}
                onDelete={() => deleteNews(i)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        {Array.from({ length: MAX_NEWS - data.news.length }, (_, j) => {
          const i = data.news.length + j;
          return (
            <motion.div
              key={`empty-${i}`}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                borderRadius: 12, border: "1.5px dashed #E2E8F0",
                padding: "11px 14px", opacity: 0.55,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 900, color: "#CBD5E1", width: 20 }}>{i + 1}</span>
              <button onClick={addNews} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                + Add news item
              </button>
            </motion.div>
          );
        })}
      </Card>

      <Card>
        <SectionTitle>Joint Prayer</SectionTitle>
        {data.jointPrayer.map((item, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 flex flex-col gap-3">
              <Field
                label="Title"
                value={item.title}
                onChange={(v) => updateJoint(i, { title: v })}
              />
              <Field
                label="Body"
                value={item.body}
                onChange={(v) => updateJoint(i, { body: v })}
                multiline
                rows={3}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  jointPrayer: data.jointPrayer.filter((_, idx) => idx !== i),
                })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({ jointPrayer: [...data.jointPrayer, { title: "", body: "" }] })
          }
          label="Add joint prayer"
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Prayer Requests
// ---------------------------------------------------------------------------

export function PrayerTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const update = (i: number, patch: Partial<PrayerRequest>) => {
    set({
      prayerRequests: data.prayerRequests.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r
      ),
    });
  };

  return (
    <Card>
      <SectionTitle>Prayer Requests</SectionTitle>
      <div className="flex flex-col gap-2">
        {data.prayerRequests.map((req, i) => (
          <div
            key={i}
            className="flex gap-2 items-center rounded-xl border border-stone-100 p-2"
          >
            <div className="flex-1 grid grid-cols-3 gap-2">
              <Field
                label="Who (requester)"
                value={req.who}
                onChange={(v) => update(i, { who: v })}
              />
              <Field
                label="Whom (person)"
                value={req.whom}
                onChange={(v) => update(i, { whom: v })}
              />
              <Field
                label="Relation"
                value={req.relation}
                onChange={(v) => update(i, { relation: v })}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  prayerRequests: data.prayerRequests.filter((_, idx) => idx !== i),
                })
              }
            />
          </div>
        ))}
      </div>
      <AddBtn
        onClick={() =>
          set({
            prayerRequests: [
              ...data.prayerRequests,
              { who: "", whom: "", relation: "" },
            ],
          })
        }
        label="Add prayer request"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sidebar panel: Bible Seminar Service
// ---------------------------------------------------------------------------
