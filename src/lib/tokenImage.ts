import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./firebase";

export const MAX_TOKEN_IMAGE_BYTES = 2 * 1024 * 1024;

const ACCEPTED_PREFIX = "image/";

export function validateTokenImage(file: File): string | null {
  if (!file.type.startsWith(ACCEPTED_PREFIX)) {
    return "O arquivo precisa ser uma imagem.";
  }
  if (file.size > MAX_TOKEN_IMAGE_BYTES) {
    return "Imagem maior que 2 MB.";
  }
  return null;
}

/** Sobe a imagem do token e devolve o downloadURL. */
export async function uploadTokenImage(
  campaignId: string,
  tokenId: string,
  file: File,
): Promise<string> {
  const err = validateTokenImage(file);
  if (err) throw new Error(err);
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `tokens/${campaignId}/${tokenId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function deleteTokenImage(imageUrl: string): Promise<void> {
  try {
    await deleteObject(ref(storage, imageUrl));
  } catch {
    // URL externa ou já removida — nada a fazer.
  }
}
