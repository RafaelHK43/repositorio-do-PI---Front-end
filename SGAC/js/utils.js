export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
export function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
export function statusClass(status = "") {
  if (status === "aprovada") return "tag aprovada";
  if (status === "reprovada") return "tag reprovada";
  return "tag pendente";
}
export function uniqueNumbers(values = []) {
  return [...new Set(values.map(Number).filter(Boolean))];
}
export function filterBySearch(items, search, getter) {
  if (!search) return items;
  const normalized = search.trim().toLowerCase();
  return items.filter((item) =>
    getter(item).toLowerCase().includes(normalized),
  );
}
