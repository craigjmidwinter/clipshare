import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Timecode } from './Timecode';

describe('Timecode', () => {
  it('formats 0 ms', () => {
    render(<Timecode ms={0} />);
    expect(screen.getByText('00:00:00.000')).toBeInTheDocument();
  });

  it('formats arbitrary ms with padding', () => {
    // 1 hour, 2 minutes, 3 seconds, 45 ms => 3723000 + 45 = 3723045
    render(<Timecode ms={3723045} />);
    expect(screen.getByText('01:02:03.045')).toBeInTheDocument();
  });
});


