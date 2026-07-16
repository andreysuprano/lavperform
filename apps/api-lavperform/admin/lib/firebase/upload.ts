import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { storage } from "./config"

function buildStoragePath(folder: string, fileName: string): string {
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_")
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `admin/${sanitizedFolder}/${Date.now()}-${sanitizedName}`
}

export async function uploadImageToFirebase(
  file: File,
  folder = "campaigns"
): Promise<string> {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : "jpg"
  const uniqueName = `${crypto.randomUUID().slice(0, 8)}.${extension ?? "jpg"}`
  const storageRef = ref(storage, buildStoragePath(folder, uniqueName))

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  })

  return getDownloadURL(storageRef)
}
