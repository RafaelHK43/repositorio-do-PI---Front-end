import { showToast } from "./ui.js";

function authHeaders() {
  const token =
    localStorage.getItem("tokenBasic") ||
    localStorage.getItem("authBasic") ||
    "";
  if (!token) return {};
  return {
    Authorization: token.startsWith("Basic ") ? token : `Basic ${token}`,
  };
}

function filenameFromUrl(url = "") {
  const pathname = new URL(url, window.location.origin).pathname;
  return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "comprovante");
}

async function fetchProtectedFile(url) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error("Não foi possível carregar o comprovante.");
  }
  return response.blob();
}

export async function abrirArquivoProtegido(url) {
  try {
    const blob = await fetchProtectedFile(url);
    const blobUrl = URL.createObjectURL(blob);
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      URL.revokeObjectURL(blobUrl);
      showToast(
        "O navegador bloqueou a abertura do comprovante. Permita pop-ups para este site.",
        "danger",
      );
      return;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Não foi possível abrir o comprovante.", "danger");
  }
}

export async function baixarArquivoProtegido(url, filename = "") {
  try {
    const blob = await fetchProtectedFile(url);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || filenameFromUrl(url);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Não foi possível baixar o comprovante.", "danger");
  }
}
