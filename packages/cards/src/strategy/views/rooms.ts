import type { AreaRegistryEntry } from '@fluvy/core';
import { flowed } from '../layout.js';
import { roomAsTab, roomPart, roomsOf, roomsView } from '../rooms.js';
import type { CapKey, Section, StrategyContext, ViewSpec } from '../types.js';

/*
 * The rooms dashboard (`custom:fluvy-rooms`): a tab a floor when the house has two or more, else every room on one
 * tab; each room a card that opens the room's own subview. Where it is asked (`rooms_as: tabs`, 1.22, #202), "All
 * rooms" first, every room's card under its floor's heading, then a tab a room. And the dashboards of one kind of
 * thing (`custom:fluvy-lights`, `custom:fluvy-climate`): Home's view of it, then a tab a room that holds some.
 */

/** The columns of the views of rooms. */
const COLUMNS = 3;

/** The floors with a room on them. */
const floorsOf = (ctx: StrategyContext) => {
  const rooms = roomsOf(ctx.home);
  const floors = ctx.home.floors.filter((floor) =>
    rooms.some((room) => room.floor_id === floor.floor_id),
  );
  return { rooms, floors };
};

const grid = (ctx: StrategyContext, rooms: readonly AreaRegistryEntry[]): Section[] =>
  flowed(
    ctx,
    rooms.map((area) => roomPart(ctx, area)),
    [],
    COLUMNS,
  );

/**
 * The views: one a floor (its name, its icon) plus the rooms on no floor, or all the rooms as one; with the rooms as
 * tabs, all of them first as Home's Rooms view draws them, then each in the house's order of its rooms.
 */
export function roomsViews(ctx: StrategyContext): ViewSpec[] {
  const { rooms, floors } = floorsOf(ctx);
  const all: ViewSpec = {
    key: 'rooms',
    icon: 'fluvy:rooms',
    title: 'strategy.rooms',
    build: (c) => grid(c, rooms),
    when: () => true,
  };
  if (ctx.style.roomTabs)
    return [
      { ...all, title: 'strategy.all_rooms', build: roomsView },
      ...rooms.map((area) => roomAsTab(area, COLUMNS)),
    ];
  if (floors.length < 2) return [all];
  const unplaced = rooms.filter(
    (room) => !floors.some((floor) => floor.floor_id === room.floor_id),
  );
  return [
    ...floors.map((floor): ViewSpec => ({
      key: `floor-${floor.floor_id}`,
      icon: floor.icon ?? 'fluvy:home',
      title: 'strategy.rooms',
      name: floor.name,
      build: (c) =>
        grid(
          c,
          rooms.filter((room) => room.floor_id === floor.floor_id),
        ),
      when: () => true,
    })),
    ...(unplaced.length
      ? [
          {
            ...all,
            title: 'strategy.other_rooms' as const,
            build: (c: StrategyContext) => grid(c, unplaced),
          },
        ]
      : []),
  ];
}

/**
 * The tab a room is reached from: its floor's, or the rooms' when there is one tab or the room has no floor; with the
 * rooms as tabs, the one of them all.
 */
export function roomTab(ctx: StrategyContext, area: AreaRegistryEntry): string {
  const { floors } = floorsOf(ctx);
  const floor =
    !ctx.style.roomTabs && floors.length >= 2 && floors.find((f) => f.floor_id === area.floor_id);
  return floor ? `floor-${floor.floor_id}` : 'rooms';
}

/**
 * The views of a dashboard of one kind of thing, room by room: Home's view of it whole (`first`), then a tab a room
 * that holds some, in the house's order of its rooms — its page's own parts of that kind (`parts`), with their ids,
 * their caps and their names.
 */
export const byRoomViews =
  (first: ViewSpec, parts: readonly CapKey[]) =>
  (ctx: StrategyContext): ViewSpec[] => [
    first,
    ...roomsOf(ctx.home).map((area) => roomAsTab(area, COLUMNS, parts)),
  ];
