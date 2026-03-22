/**
 * Returns the current CSULB semester as a string like "Fall 2026" or "Spring 2026".
 * CSULB calendar: Spring = Jan–Jul, Fall = Aug–Dec.
 */
export function getCurrentSemester(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const year = now.getFullYear();
  return month >= 8 ? `Fall ${year}` : `Spring ${year}`;
}

/**
 * Returns an ordered list of future semester terms starting from (and including)
 * the current semester, up to `count` entries.
 */
export function getUpcomingTerms(count = 10): string[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Start from current semester
  let isFall = month >= 8;
  let y = year;

  const terms: string[] = [];
  for (let i = 0; i < count; i++) {
    terms.push(isFall ? `Fall ${y}` : `Spring ${y}`);
    if (isFall) {
      y++;
      isFall = false;
    } else {
      isFall = true;
    }
  }
  return terms;
}
