// Tracks whether the app has finished its first render. See Icon.tsx for why it matters.
let appMounted = false;

/** Called once by the app after its first commit. */
export function markAppMounted() {
  appMounted = true;
}

export function isAppMounted() {
  return appMounted;
}
