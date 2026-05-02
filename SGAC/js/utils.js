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
  const str = String(value).trim();
  const datePart = str.split("T")[0].split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
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
