import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ff5a1f',
          color: '#fff8f4',
          fontSize: 280,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        N
      </div>
    ),
    { ...size }
  );
}
