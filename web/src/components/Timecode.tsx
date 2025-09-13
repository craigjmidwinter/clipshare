'use client';

type Props = { ms: number };

export function Timecode({ ms }: Props) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  const millis = Math.floor(ms % 1000)
    .toString()
    .padStart(3, '0');
  return <span>{hours}:{minutes}:{seconds}.{millis}</span>;
}


