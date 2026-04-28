import { STORAGE_KEYS, initialData } from "./config.js";
function clone(value) {
  return structuredClone(value);
}
function migrateLegacyData(raw) {
  if (!raw) return clone(initialData);
  const courses = Array.isArray(raw.courses)
    ? raw.courses.map((course) => ({
        id: Number(course.id),
        name: course.name,
        workload_required: Number(
          course.workload_required || course.workloadRequired || 0,
        ),
      }))
    : clone(initialData.courses);
  const courseIdByName = (name) =>
    courses.find((course) => course.name === name)?.id;
  return {
    courses,
    coordinators: Array.isArray(raw.coordinators)
      ? raw.coordinators.map((item) => ({
          id: Number(item.id),
          name: item.name,
          email: item.email,
          password: item.password || "123456",
          courseIds: Array.isArray(item.courseIds)
            ? item.courseIds.map(Number)
            : item.course_name
              ? [courseIdByName(item.course_name)].filter(Boolean)
              : [],
        }))
      : clone(initialData.coordinators),
    students: Array.isArray(raw.students)
      ? raw.students.map((item) => ({
          id: Number(item.id),
          name: item.name,
          email: item.email,
          password: item.password || "123456",
          courseIds: Array.isArray(item.courseIds)
            ? item.courseIds.map(Number)
            : item.course_name
              ? [courseIdByName(item.course_name)].filter(Boolean)
              : [],
        }))
      : clone(initialData.students),
    areas: Array.isArray(raw.areas)
      ? raw.areas.map((item) => ({
          id: Number(item.id),
          name: item.name,
          courseId: Number(
            item.courseId || courseIdByName(item.course_name) || 1,
          ),
          hour_limit: Number(item.hour_limit || item.hourLimit || 0),
          description: item.description || "",
        }))
      : clone(initialData.areas),
    activities: Array.isArray(raw.activities)
      ? raw.activities.map((item) => ({
          id: Number(item.id),
          studentId: Number(
            item.studentId ||
              raw.students?.find(
                (student) => student.email === item.student_email,
              )?.id ||
              1,
          ),
          courseId: Number(
            item.courseId || courseIdByName(item.course_name) || 1,
          ),
          areaId: Number(
            item.areaId ||
              raw.areas?.find((area) => area.name === item.area_name)?.id ||
              1,
          ),
          title: item.title,
          description: item.description || "",
          workload: Number(item.workload || 0),
          activityDate: item.activityDate || item.activity_date || "",
          proofFile: item.proofFile || item.proof_file || "",
          status: item.status || "pendente",
          feedback: item.feedback || "",
        }))
      : clone(initialData.activities),
  };
}
export function getData() {
  const saved = localStorage.getItem(STORAGE_KEYS.data);
  if (!saved) {
    const data = clone(initialData);
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(data));
    return data;
  }
  const parsed = JSON.parse(saved);
  const migrated = migrateLegacyData(parsed);
  localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(migrated));
  return migrated;
}
export function saveData(data) {
  localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(data));
}
export function getUser() {
  const user = localStorage.getItem(STORAGE_KEYS.user);
  return user ? JSON.parse(user) : null;
}
export function setUser(user) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}
export function clearUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
}
export function getPage() {
  return localStorage.getItem(STORAGE_KEYS.page) || "login";
}
export function setPage(page) {
  localStorage.setItem(STORAGE_KEYS.page, page);
}
export function nextId(items) {
  return items.length
    ? Math.max(...items.map((item) => Number(item.id))) + 1
    : 1;
}
export function getCourseName(courseId, data = getData()) {
  return (
    data.courses.find((course) => Number(course.id) === Number(courseId))
      ?.name || "Nenhum curso vinculado"
  );
}
export function getCourseNames(courseIds = [], data = getData()) {
  return courseIds.map((id) => getCourseName(id, data));
}
export function getAreaName(areaId, data = getData()) {
  return (
    data.areas.find((area) => Number(area.id) === Number(areaId))?.name || "-"
  );
}
export function getStudentById(studentId, data = getData()) {
  return data.students.find(
    (student) => Number(student.id) === Number(studentId),
  );
}
export function createCourse(payload) {
  const data = getData();
  data.courses.push({ id: nextId(data.courses), ...payload });
  saveData(data);
}
export function updateCourse(id, payload) {
  const data = getData();
  const item = data.courses.find((course) => Number(course.id) === Number(id));
  if (!item) return;
  Object.assign(item, payload);
  saveData(data);
}
export function deleteCourse(id) {
  const data = getData();
  data.courses = data.courses.filter((item) => Number(item.id) !== Number(id));
  data.areas = data.areas.filter(
    (item) => Number(item.courseId) !== Number(id),
  );
  data.activities = data.activities.filter(
    (item) => Number(item.courseId) !== Number(id),
  );
  data.students = data.students.map((student) => ({
    ...student,
    courseIds: student.courseIds.filter(
      (courseId) => Number(courseId) !== Number(id),
    ),
  }));
  data.coordinators = data.coordinators.map((coord) => ({
    ...coord,
    courseIds: coord.courseIds.filter(
      (courseId) => Number(courseId) !== Number(id),
    ),
  }));
  saveData(data);
}
export function createCoordinator(payload) {
  const data = getData();
  data.coordinators.push({ id: nextId(data.coordinators), ...payload });
  saveData(data);
}
export function updateCoordinator(id, payload) {
  const data = getData();
  const item = data.coordinators.find(
    (coord) => Number(coord.id) === Number(id),
  );
  if (!item) return;
  Object.assign(item, payload);
  saveData(data);
}
export function deleteCoordinator(id) {
  const data = getData();
  data.coordinators = data.coordinators.filter(
    (item) => Number(item.id) !== Number(id),
  );
  saveData(data);
}
export function createStudent(payload) {
  const data = getData();
  data.students.push({ id: nextId(data.students), ...payload });
  saveData(data);
}
export function updateStudent(id, payload) {
  const data = getData();
  const item = data.students.find(
    (student) => Number(student.id) === Number(id),
  );
  if (!item) return;
  Object.assign(item, payload);
  saveData(data);
}
export function deleteStudent(id) {
  const data = getData();
  data.students = data.students.filter(
    (item) => Number(item.id) !== Number(id),
  );
  data.activities = data.activities.filter(
    (item) => Number(item.studentId) !== Number(id),
  );
  saveData(data);
}
export function createArea(payload) {
  const data = getData();
  data.areas.push({ id: nextId(data.areas), ...payload });
  saveData(data);
}
export function updateArea(id, payload) {
  const data = getData();
  const item = data.areas.find((area) => Number(area.id) === Number(id));
  if (!item) return;
  Object.assign(item, payload);
  saveData(data);
}
export function deleteArea(id) {
  const data = getData();
  data.areas = data.areas.filter((item) => Number(item.id) !== Number(id));
  data.activities = data.activities.filter(
    (item) => Number(item.areaId) !== Number(id),
  );
  saveData(data);
}
export function createActivity(payload) {
  const data = getData();
  data.activities.push({ id: nextId(data.activities), ...payload });
  saveData(data);
}
export function updateActivityStatus(id, status, feedback = "") {
  const data = getData();
  const item = data.activities.find(
    (activity) => Number(activity.id) === Number(id),
  );
  if (!item) return;
  item.status = status;
  item.feedback = feedback;
  saveData(data);
}
export function deleteActivity(id) {
  const data = getData();
  data.activities = data.activities.filter(
    (item) => Number(item.id) !== Number(id),
  );
  saveData(data);
}
