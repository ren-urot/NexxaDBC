const QR_SIZE = 139;
const QR_BOTTOM = 76;
// The rendered QR box is the code plus its white p-1.5 padding (6px a side).
const QR_BOX_WIDTH = QR_SIZE + 12;

// Same size and bottom offset on every card, vertical or horizontal — the
// card face is what has room reserved for it (see each template's contact
// block), not the other way around. Horizontal cards keep the QR
// right-anchored, like a printed corner stamp; vertical cards are narrow
// enough that right-anchoring reads off-balance, so it's centered instead.
export const CARD_QR_HORIZONTAL = { size: QR_SIZE, bottom: QR_BOTTOM, right: 36 };
export const CARD_QR_VERTICAL = { size: QR_SIZE, bottom: QR_BOTTOM, left: (320 - QR_BOX_WIDTH) / 2 };
