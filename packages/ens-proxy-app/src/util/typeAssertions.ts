export function notNull<T>(x: T | null | undefined): T {
  if (x == null) {
    throw new Error("Unexpected absent value.");
  }
  return x;
}
