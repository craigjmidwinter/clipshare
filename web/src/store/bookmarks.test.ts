import { describe, it, expect } from 'vitest';
import { useBookmarkDraft } from './bookmarks';

describe('useBookmarkDraft store', () => {
  it('sets start, end, label, notes and resets', () => {
    const store = useBookmarkDraft.getState();
    store.setStart(1500);
    store.setEnd(3500);
    store.setLabel('Intro');
    store.setNotes('Tighten up');

    let s = useBookmarkDraft.getState();
    expect(s.startMs).toBe(1500);
    expect(s.endMs).toBe(3500);
    expect(s.label).toBe('Intro');
    expect(s.notes).toBe('Tighten up');

    store.reset();
    s = useBookmarkDraft.getState();
    expect(s.startMs).toBeNull();
    expect(s.endMs).toBeNull();
    expect(s.label).toBe('');
    expect(s.notes).toBe('');
  });
});


