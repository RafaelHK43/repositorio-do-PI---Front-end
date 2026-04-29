export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = String(value).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function formatHours(value) {
  const hours = Number(value || 0);

  if (Number.isInteger(hours)) {
    return `${hours}h`;
  }

  return `${hours.toFixed(2)}h`;
}

export function statusClass(status = "") {
  const normalized = String(status).toLowerCase();

  if (normalized === "aprovada") {
    return "tag aprovada";
  }

  if (normalized === "reprovada") {
    return "tag reprovada";
  }

  return "tag pendente";
}
