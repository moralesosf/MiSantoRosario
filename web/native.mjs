// Only the Android wrapper injects this origin-scoped channel.
export function nativeMessage(type, payload = {}) {
  if (!globalThis.RosarioAndroid?.postMessage) return false;
  globalThis.RosarioAndroid.postMessage(JSON.stringify({type, ...payload}));
  return true;
}

export function exportJson(value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (nativeMessage('export', {text})) return;
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rosario.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
