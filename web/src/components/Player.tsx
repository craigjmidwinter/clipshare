'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Timecode } from './Timecode';

type Props = {
  src: string;
  poster?: string;
  inMs?: number | null;
  outMs?: number | null;
  onTimeUpdate?: (ms: number) => void;
};

export function Player({ src, poster, inMs = null, outMs = null, onTimeUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    /* istanbul ignore if */
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      video.src = src;
    }

    const onTime = () => {
      const ms = Math.floor(video.currentTime * 1000);
      setCurrentMs(ms);
      onTimeUpdate?.(ms);
      if (outMs != null && ms >= outMs) {
        video.pause();
      }
    };
    video.addEventListener('timeupdate', onTime);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      hls?.destroy();
    };
  }, [src, outMs, onTimeUpdate]);

  useEffect(() => {
    const video = videoRef.current;
    /* istanbul ignore if */
    if (!video) return;
    if (inMs != null) {
      video.currentTime = inMs / 1000;
    }
  }, [inMs]);

  return (
    <div className="space-y-2">
      <video ref={videoRef} poster={poster} controls className="w-full rounded-md bg-black" playsInline />
      <div className="text-sm text-muted-foreground">
        <Timecode ms={currentMs} />
      </div>
    </div>
  );
}


