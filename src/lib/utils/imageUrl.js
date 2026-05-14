const IMAGE_BASE = "https://api.matmat.online/api/image";

export function imageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  console.log("Generated image URL:", `${IMAGE_BASE}/${clean}`);
  return `${IMAGE_BASE}/${clean}`;
}
