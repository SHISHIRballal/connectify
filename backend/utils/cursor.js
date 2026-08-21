/**
 * Cursor Pagination Utility
 * Encodes and decodes composite cursors containing timestamp and document ID.
 */

export const encodeCursor = ({ createdAt, _id }) => {
  if (!createdAt || !_id) return null;
  const isoString = new Date(createdAt).toISOString();
  const idString = _id.toString();
  return Buffer.from(`${isoString}|${idString}`).toString("base64");
};

export const decodeCursor = (cursorString) => {
  if (!cursorString || typeof cursorString !== "string") return null;

  try {
    const decoded = Buffer.from(cursorString, "base64").toString("utf-8");
    const [isoString, idString] = decoded.split("|");

    if (!isoString || !idString) return null;

    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    // Verify 24-character hexadecimal ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(idString)) return null;

    return {
      createdAt: date,
      _id: idString,
    };
  } catch {
    return null;
  }
};
