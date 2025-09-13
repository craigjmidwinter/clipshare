import { create } from 'zustand';

export type BookmarkDraft = {
  startMs: number | null;
  endMs: number | null;
  label: string;
  notes: string;
};

type BookmarkState = BookmarkDraft & {
  setStart: (ms: number) => void;
  setEnd: (ms: number) => void;
  setLabel: (label: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
};

const initial: BookmarkDraft = { startMs: null, endMs: null, label: '', notes: '' };

export const useBookmarkDraft = create<BookmarkState>()((set) => ({
  ...initial,
  setStart: (ms) => set({ startMs: ms }),
  setEnd: (ms) => set({ endMs: ms }),
  setLabel: (label) => set({ label }),
  setNotes: (notes) => set({ notes }),
  reset: () => set({ ...initial }),
}));


