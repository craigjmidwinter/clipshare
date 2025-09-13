import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import Hls from 'hls.js';
import { Player } from './Player';

let hlsIsSupported = false;
vi.mock('hls.js', () => ({
  default: class HlsMock {
    loadSource() {}
    attachMedia() {}
    destroy() {}
    static isSupported() { return hlsIsSupported; }
  },
}));

describe('Player', () => {
  it('pauses when current time reaches outMs and calls onTimeUpdate', () => {
    const onTimeUpdate = vi.fn();
    const { container } = render(<Player src="/test.m3u8" outMs={2000} onTimeUpdate={onTimeUpdate} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    // Stub pause to observe calls
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    // Advance current time past outMs and dispatch timeupdate
    Object.defineProperty(video, 'currentTime', { value: 2.1, writable: true });
    act(() => {
      video.dispatchEvent(new Event('timeupdate'));
    });

    expect(onTimeUpdate).toHaveBeenCalled();
    expect(pauseSpy).toHaveBeenCalled();

    pauseSpy.mockRestore();
  });

  it('seeks to inMs on mount and supports HLS path', async () => {
    hlsIsSupported = true;
    const { container, rerender } = render(<Player src="/hls.m3u8" inMs={3000} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    // currentTime should be set to inMs/1000 after effect runs
    await act(async () => {});
    expect(video.currentTime).toBeCloseTo(3, 2);

    // Change inMs, effect should seek again
    rerender(<Player src="/hls.m3u8" inMs={5000} />);
    await act(async () => {});
    expect(video.currentTime).toBeCloseTo(5, 2);
    hlsIsSupported = false;
  });

  it('destroys HLS instance on unmount (cleanup branch)', () => {
    hlsIsSupported = true;
    const { unmount } = render(<Player src="/hls-cleanup.m3u8" />);
    // Spy on HlsMock.prototype.destroy via prototype since new instances created inside
    const destroySpy = vi.spyOn((Hls as any).prototype, 'destroy');
    unmount();
    expect(destroySpy).toHaveBeenCalled();
    destroySpy.mockRestore();
    hlsIsSupported = false;
  });

  it('does not seek when inMs is null', async () => {
    const { container } = render(<Player src="/no-seek.m3u8" inMs={null} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    const initial = video.currentTime;
    await act(async () => {});
    expect(video.currentTime).toBe(initial);
  });

  it('plays via native HLS when canPlayType is supported', async () => {
    const original = (HTMLMediaElement.prototype as any).canPlayType;
    // Simulate native HLS support globally before render
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
      configurable: true,
      value: () => 'maybe',
    });
    const { container } = render(<Player src="/native.m3u8" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    await act(async () => {});
    act(() => {
      video.dispatchEvent(new Event('timeupdate'));
    });
    // Restore
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
      configurable: true,
      value: original,
    });
  });

  it('falls back to direct src when neither HLS nor native supported', async () => {
    hlsIsSupported = false;
    const { container } = render(<Player src="/direct.m3u8" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    const original = video.canPlayType;
    // No native HLS
    // @ts-expect-error override for test
    video.canPlayType = () => '';
    await act(async () => {});
    expect(video.src.endsWith('/direct.m3u8')).toBe(true);
    video.canPlayType = original;
  });

  it('does not pause when current time is below outMs', () => {
    const { container } = render(<Player src="/test.m3u8" outMs={5000} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    Object.defineProperty(video, 'currentTime', { value: 3, writable: true });
    act(() => {
      video.dispatchEvent(new Event('timeupdate'));
    });
    expect(pauseSpy).not.toHaveBeenCalled();
    pauseSpy.mockRestore();
  });

  it('does not call onTimeUpdate when not provided', () => {
    const { container } = render(<Player src="/test.m3u8" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 1.234, writable: true });
    expect(() => {
      act(() => {
        video.dispatchEvent(new Event('timeupdate'));
      });
    }).not.toThrow();
  });

  it('does not pause when outMs is null', () => {
    const { container } = render(<Player src="/test.m3u8" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    act(() => {
      video.dispatchEvent(new Event('timeupdate'));
    });
    expect(pauseSpy).not.toHaveBeenCalled();
    pauseSpy.mockRestore();
  });
});


