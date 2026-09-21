export function registerPlace(repository, candidate, name) {
  if (!candidate) {
    throw new Error('保存する地点候補がありません');
  }

  return repository.save({
    name,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  });
}
