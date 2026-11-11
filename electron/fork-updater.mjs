// JustinBot fork: the release feed is upstream's, so an update would replace this build with theirs.
// main.mjs imports startUpdater from here instead of ./updater.mjs. The updater never starts: its
// state stays idle, and the check and install handlers do nothing.
export function startUpdater() {}
