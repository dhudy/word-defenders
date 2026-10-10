export function starsFor({ hearts, retried }) {
  if (retried || hearts <= 3) return 1;
  if (hearts <= 7) return 2;
  return 3;
}
