import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RouteLeg, RouteResult, Stop } from '../types';
import { colors, radii, space, type as T } from '../theme';

const SERVICE_SECONDS = 180;

type Props = {
  result: RouteResult;
  stops: Stop[];
  draggable?: boolean;
  onReorder?: (newIds: string[]) => void;
  loading?: boolean;
};

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h}h${String(rem).padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: Date, ref?: Date): string {
  const hm = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (!ref || isSameDay(date, ref)) return hm;
  const dayDiff = Math.round((date.getTime() - ref.getTime()) / 86_400_000);
  if (dayDiff === 1) return `${hm} (demain)`;
  const dm = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  return `${dm} ${hm}`;
}

function parseRequestedTime(base: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() < base.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

type ScheduleItem = {
  leg: RouteLeg;
  stop: Stop;
  currentIdx: number;
  systemIdx: number;
  displaced: boolean;
  departureAt: Date;
  arrivalAt: Date;
  requestedAt: Date | null;
};

function useSchedule(result: RouteResult, stops: Stop[]): { items: ScheduleItem[]; startAt: Date } {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const shiftMs = Math.max(0, tick - result.departureAt.getTime());
    const startAt = new Date(result.departureAt.getTime() + shiftMs);

    const items: ScheduleItem[] = [];
    let cursor = new Date(startAt);

    result.legs.forEach((leg, idx) => {
      const id = result.orderedStopIds[idx];
      const stop = stops.find((s) => s.id === id);
      if (!stop) return;
      const systemIdx = stop.suggestedIndex ?? idx;
      const departureAt = new Date(cursor);
      const arrivalAt = new Date(leg.arrivalAt.getTime() + shiftMs);
      const requestedAt = parseRequestedTime(result.departureAt, stop.time);
      items.push({
        leg,
        stop,
        currentIdx: idx,
        systemIdx,
        displaced: systemIdx !== idx,
        departureAt,
        arrivalAt,
        requestedAt,
      });
      cursor = new Date(arrivalAt.getTime() + SERVICE_SECONDS * 1000);
    });

    return { items, startAt };
  }, [result, stops, tick]);
}

function delayStatus(item: ScheduleItem): { text: string; tone: 'ontime' | 'late' | 'early' } | null {
  if (!item.requestedAt) return null;
  const diffMin = Math.round((item.arrivalAt.getTime() - item.requestedAt.getTime()) / 60_000);
  if (diffMin > 2) return { text: `+${diffMin} min`, tone: 'late' };
  if (diffMin < -5) return { text: `${-diffMin} min avance`, tone: 'early' };
  return { text: 'à l\'heure', tone: 'ontime' };
}

const TONE_BG: Record<'ontime' | 'late' | 'early', string> = {
  ontime: '#ECFDF3',
  late: '#FEF3F2',
  early: '#EFF8FF',
};
const TONE_FG: Record<'ontime' | 'late' | 'early', string> = {
  ontime: '#067647',
  late: '#B42318',
  early: '#175CD3',
};

function Row({
  item,
  isFirst,
  referenceDate,
  handle,
}: {
  item: ScheduleItem;
  isFirst: boolean;
  referenceDate: Date;
  handle?: React.ReactNode;
}) {
  const delay = delayStatus(item);
  return (
    <View style={styles.row}>
      <View style={styles.timelineCol}>
        <Text style={styles.timeStrong}>{formatTime(item.departureAt, referenceDate)}</Text>
        <View style={styles.dot} />
        <View style={styles.line} />
        <View style={[styles.dot, styles.dotEnd]} />
        <Text style={styles.timeStrong}>{formatTime(item.arrivalAt, referenceDate)}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.bodyHeader}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeTxt}>{item.currentIdx + 1}</Text>
          </View>
          {item.displaced ? (
            <View style={styles.algoHint}>
              <Text style={styles.algoHintTxt}>algo · #{item.systemIdx + 1}</Text>
            </View>
          ) : null}
          {delay ? (
            <View style={[styles.statusPill, { backgroundColor: TONE_BG[delay.tone] }]}>
              <Text style={[styles.statusPillTxt, { color: TONE_FG[delay.tone] }]}>
                {delay.text}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {item.leg.toAddress}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {formatDuration(item.leg.trafficDurationSeconds)} · {formatDistance(item.leg.distanceMeters)}
          </Text>
          {!isFirst ? <Text style={styles.metaDim}>+ 3 min sur place</Text> : null}
          {item.requestedAt ? (
            <Text style={styles.metaDim}>
              Demandé {formatTime(item.requestedAt, referenceDate)}
            </Text>
          ) : null}
        </View>
      </View>

      {handle}
    </View>
  );
}

function WebDraggable({
  items,
  result,
  onReorder,
  referenceDate,
}: {
  items: ScheduleItem[];
  result: RouteResult;
  onReorder: (ids: string[]) => void;
  referenceDate: Date;
}) {
  const dnd = require('@dnd-kit/core');
  const sortable = require('@dnd-kit/sortable');
  const utilities = require('@dnd-kit/utilities');
  const { DndContext, closestCenter, PointerSensor, useSensor, useSensors } = dnd;
  const { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } = sortable;
  const { CSS } = utilities;

  function Item({ item }: { item: ScheduleItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: item.stop.id,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.65 : 1,
      position: 'relative',
      zIndex: isDragging ? 10_000 : 1,
    } as const;
    const handle = (
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          padding: '0 8px',
          minWidth: 32,
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textFaint,
          fontSize: 20,
          fontWeight: 700,
          userSelect: 'none',
          touchAction: 'none',
        }}
        title="Glissez pour réordonner"
      >
        ⋮⋮
      </div>
    );
    return (
      <div ref={setNodeRef} style={style as any}>
        <Row
          item={item}
          isFirst={item.currentIdx === 0}
          referenceDate={referenceDate}
          handle={handle}
        />
      </div>
    );
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const onDragEnd = (e: { active: { id: string }; over: { id: string } | null }) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = result.orderedStopIds;
    const oldIdx = ids.indexOf(e.active.id);
    const newIdx = ids.indexOf(e.over!.id);
    onReorder(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={result.orderedStopIds} strategy={verticalListSortingStrategy}>
        <View style={{ gap: space.sm }}>
          {items.map((item) => (
            <Item key={item.stop.id} item={item} />
          ))}
        </View>
      </SortableContext>
    </DndContext>
  );
}

function NativeReorder({
  items,
  result,
  onReorder,
  referenceDate,
}: {
  items: ScheduleItem[];
  result: RouteResult;
  onReorder: (ids: string[]) => void;
  referenceDate: Date;
}) {
  const DraggableFlatList = require('react-native-draggable-flatlist').default;
  const { ScaleDecorator } = require('react-native-draggable-flatlist');

  return (
    <DraggableFlatList
      data={items}
      keyExtractor={(it: ScheduleItem) => it.stop.id}
      scrollEnabled={false}
      activationDistance={8}
      contentContainerStyle={{ gap: space.sm }}
      onDragEnd={({ data }: { data: ScheduleItem[] }) => {
        onReorder(data.map((it) => it.stop.id));
      }}
      renderItem={({
        item,
        drag,
        isActive,
        getIndex,
      }: {
        item: ScheduleItem;
        drag: () => void;
        isActive: boolean;
        getIndex: () => number | undefined;
      }) => (
        <ScaleDecorator>
          <View style={[isActive && { opacity: 0.8 }]}>
            <Row
              item={item}
              isFirst={(getIndex() ?? 0) === 0}
              referenceDate={referenceDate}
              handle={
                <Pressable
                  onLongPress={drag}
                  delayLongPress={120}
                  style={styles.dragHandle}
                  hitSlop={8}
                >
                  <Text style={styles.dragHandleTxt}>⋮⋮</Text>
                </Pressable>
              }
            />
          </View>
        </ScaleDecorator>
      )}
    />
  );
}

function StaticList({
  items,
  referenceDate,
}: {
  items: ScheduleItem[];
  referenceDate: Date;
}) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item, idx) => (
        <Row
          key={item.stop.id}
          item={item}
          isFirst={idx === 0}
          referenceDate={referenceDate}
        />
      ))}
    </View>
  );
}

export function RouteResultView({ result, stops, draggable, onReorder, loading }: Props) {
  const { items, startAt } = useSchedule(result, stops);
  const lastArrival = items.length > 0 ? items[items.length - 1].arrivalAt : startAt;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={styles.loadingPill}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.loadingTxt}>Recalcul en cours…</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryKicker}>Tournée</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryBlockLabel}>Départ</Text>
            <Text style={styles.summaryBlockValue}>{formatTime(startAt)}</Text>
          </View>
          <Text style={styles.summaryArrow}>→</Text>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryBlockLabel}>Arrivée finale</Text>
            <Text style={styles.summaryBlockValue}>{formatTime(lastArrival, startAt)}</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetaRow}>
          <Text style={styles.summaryMetaTxt}>
            {formatDuration(result.totalDurationSeconds)} · {formatDistance(result.totalDistanceMeters)}
          </Text>
          {result.totalTrafficDelaySeconds > 0 ? (
            <Text style={styles.summaryTrafficTxt}>
              +{formatDuration(result.totalTrafficDelaySeconds)} trafic
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ordre optimisé</Text>

      {draggable && onReorder ? (
        Platform.OS === 'web' ? (
          <WebDraggable
            items={items}
            result={result}
            onReorder={onReorder}
            referenceDate={startAt}
          />
        ) : (
          <NativeReorder
            items={items}
            result={result}
            onReorder={onReorder}
            referenceDate={startAt}
          />
        )
      ) : (
        <StaticList items={items} referenceDate={startAt} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: radii.lg,
    zIndex: 100,
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.dark,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  loadingTxt: { color: colors.surface, fontWeight: '700', fontSize: 13 },
  summaryCard: {
    backgroundColor: colors.dark,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
  },
  summaryKicker: {
    ...T.caps,
    color: '#98A2B3',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  summaryBlock: { flex: 1 },
  summaryBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#98A2B3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryBlockValue: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  summaryArrow: {
    color: '#475467',
    fontSize: 22,
    fontWeight: '700',
    paddingBottom: 6,
  },
  summaryDivider: { height: 1, backgroundColor: '#1D2939' },
  summaryMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryMetaTxt: { color: '#D0D5DD', fontSize: 13, fontWeight: '700' },
  summaryTrafficTxt: { color: '#F79009', fontSize: 13, fontWeight: '700' },
  sectionTitle: {
    ...T.caps,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  timelineCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 56,
    paddingVertical: 2,
  },
  timeStrong: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotEnd: { backgroundColor: colors.success },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  body: { flex: 1, gap: 6, justifyContent: 'center' },
  bodyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  currentBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBadgeTxt: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  algoHint: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#EFF8FF',
    borderWidth: 1,
    borderColor: '#B2DDFF',
  },
  algoHintTxt: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '800' },
  address: { fontSize: 15, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meta: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  metaDim: { fontSize: 12, color: colors.textFaint, fontWeight: '500' },
  dragHandle: {
    alignSelf: 'stretch',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    minWidth: 36,
  },
  dragHandleTxt: { color: colors.textMuted, fontSize: 20, fontWeight: '700' },
});
