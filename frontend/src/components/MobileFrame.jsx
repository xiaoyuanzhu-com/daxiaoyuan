import { C } from '../theme.js';

// Centers the app on desktop, full-bleed on mobile. The whole UI was
// prototyped at ~390px wide; we keep a similar max width so the H5 reads
// the same as the WeChat mini-program.
export function MobileFrame({ children }) {
  return (
    <div className="dxy-frame-outer" style={{
      background: C.pageBg,
      backgroundImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.04) 0%, transparent 70%)',
      display: 'flex', justifyContent: 'center',
    }}>
      <div className="dxy-frame-inner" style={{
        width: '100%',
        maxWidth: 460,
        background: C.paper,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.10)',
      }}>
        {children}
      </div>
    </div>
  );
}
