export const number = (n: number, digits = 3) =>
  (Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n).toFixed(digits);
export function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
