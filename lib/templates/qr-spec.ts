const QR_SIZE = 139;
const QR_BOTTOM = 76;

// Same size and bottom offset on every card, vertical or horizontal — the
// card face is what has room reserved for it (see each template's contact
// block), not the other way around. Horizontal cards keep the QR
// right-anchored, like a printed corner stamp; vertical cards are narrow
// enough that right-anchoring reads off-balance, so it's centered instead.
// Centering is expressed as left: 50% + a translateX(-50%) at the call site
// rather than a hardcoded left offset — that's exact regardless of the QR's
// actual rendered width, instead of assuming one.
export const CARD_QR_HORIZONTAL = { size: QR_SIZE, bottom: QR_BOTTOM, right: 36 } as const;
export const CARD_QR_VERTICAL = { size: QR_SIZE, bottom: QR_BOTTOM, center: true } as const;
