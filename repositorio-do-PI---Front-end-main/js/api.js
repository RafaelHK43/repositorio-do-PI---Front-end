import { API_BASE_URL, AREA_OPTIONS } from "./config.js";
import { getAuthHeader } from "./state.js";

const JSON_HEADERS = {
  "Content-Type": "application/json"
};

export function buildBasicAuthHeader(email, password) {
  return `Basic ${btoa(`${email}:${password}`)}`;
}

async function request(path, options = {}) {
  const authHeader = getAuthHeader();
  const headers = new Headers(options.headers || {});

  if (authHeader && !headers.has("Authorization")) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function normalizeApiError(response) {
  const fallback = {
    status: response.status,
    message: "Não foi possível concluir a operação."
  };

  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return {
        status: response.status,
        message:
          data.message ||
          data.error ||
          data.titulo ||
          "Não foi possível concluir a operação."
      };
    }

    const text = await response.text();

    if (text) {
      return {
        status: response.status,
        message: text
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function checkLogin(authHeader) {
  return request("/api/cursos", {
    method: "GET",
    headers: {
      Authorization: authHeader
    }
  });
}

export async function getCourses() {
  const courses = await request("/api/cursos", {
    method: "GET"
  });

  return Array.isArray(courses)
    ? courses.map((course) => ({
        id: Number(course.id),
        nome: course.nome
      }))
    : [];
}

export async function createCourse(payload) {
  return request("/api/cursos", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });
}

export async function getRulesByCourse(courseId) {
  if (!courseId) {
    return [];
  }

  const rules = await request(`/api/regras/curso/${courseId}`, {
    method: "GET"
  });

  return Array.isArray(rules)
    ? rules.map((rule) => ({
        id: Number(rule.id),
        cursoId: Number(rule.curso?.id || courseId),
        area: rule.area,
        limiteHoras: Number(rule.limiteHoras)
      }))
    : [];
}

export async function saveRule(payload) {
  return request("/api/regras", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });
}

export async function createSubmission({ dados, arquivo }) {
  const formData = new FormData();

  formData.append(
    "dados",
    new Blob([JSON.stringify(dados)], {
      type: "application/json"
    })
  );
  formData.append("arquivo", arquivo);

  return request("/api/submissoes", {
    method: "POST",
    body: formData
  });
}

export function getAreaLabel(value) {
  return AREA_OPTIONS.find((item) => item.value === value)?.label || value;
}
