/** @deprecated Import from `@/lib/media/pickNativeMedia` instead. */
export {
  isUserCancelledImagePick,
  isUserCancelledMediaPick,
  openImagePicker,
  openMediaPicker,
  pickNativeImageFile,
  pickNativeMediaFile,
  takePhotoFile,
  recordVideoFile,
  chooseGalleryFile,
} from '@/lib/media/pickNativeMedia';

import { pickNativeImageFile } from '@/lib/media/pickNativeMedia';

/** @deprecated Use pickNativeImageFile or takePhotoFile */
export async function pickImageFile(): Promise<File | null> {
  return pickNativeImageFile();
}
