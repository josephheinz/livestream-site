// Static placeholder content for the /design-system showcase (and the footer's
// channel-name brand mark). Everything else moved to live backend data in spec 003
// (FR-018) — nothing here is fetched or persisted.

export type Stream = {
  channelName: string;
};

export const stream: Stream = {
  channelName: "Joseph Heinz",
};
