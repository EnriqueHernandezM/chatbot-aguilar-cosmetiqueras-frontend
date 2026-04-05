const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "";
const CLOUDINARY_FOLDER = (import.meta.env.VITE_CLOUDINARY_FOLDER ?? "messages").replace(/^\/+|\/+$/g, "");

function assertCloudinaryConfig() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Faltan variables de entorno de Cloudinary para subir imagenes");
  }
}

async function uploadSingleImage(file: File): Promise<string> {
  assertCloudinaryConfig();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  if (CLOUDINARY_FOLDER) {
    formData.append("folder", CLOUDINARY_FOLDER);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  console.log(data);
  console.log("||?>?>><><><><");

  if (!response.ok || !data?.secure_url) {
    const errorMessage = data?.error?.message || `No se pudo subir la imagen ${file.name} a Cloudinary`;
    throw new Error(errorMessage);
  }

  return data.secure_url;
}

export async function uploadImagesToCloudinary(files: File[]): Promise<string[]> {
  if (!files.length) {
    return [];
  }

  return Promise.all(files.map((file) => uploadSingleImage(file)));
}
