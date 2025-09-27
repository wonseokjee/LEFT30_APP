export function splitInto30MinEndTimes(
  started_at: Date,
  ended_at: Date,
): Date[] {
  const endTimes: Date[] = [];
  let current = new Date(started_at);

  while (current < ended_at) {
    current.setMinutes(current.getMinutes() + 30);
    if (current > ended_at) {
      endTimes.push(new Date(ended_at));
      break;
    }
    endTimes.push(new Date(current));
  }
  return endTimes;
}
