export function shouldEnterAlignedState({
  session,
  viewMode,
  alreadyAligned,
}) {
  return Boolean(
    session?.alignment?.aligned === true &&
      viewMode === 'compass' &&
      alreadyAligned !== true
  );
}
