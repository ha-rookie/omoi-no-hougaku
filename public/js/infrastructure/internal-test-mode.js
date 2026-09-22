export function isInternalTestMode(search = '') {
  try {
    const params = new URLSearchParams(String(search ?? ''));
    return params.getAll('internal_test').includes('1');
  } catch {
    return false;
  }
}
