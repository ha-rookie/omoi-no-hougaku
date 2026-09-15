export function registerPlace(candidate, name, { repository }) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('保存する場所がありません');
  }

  return repository.add({
    name,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  });
}
