export type ScanCamera = { id: string; label: string };

const rearCameraPattern = /back|rear|environment|world/i;

export function hasCameraLabels(cameras: ScanCamera[]) {
  return cameras.some((camera) => camera.label.trim().length > 0);
}

export function preferredCamera(cameras: ScanCamera[]) {
  return cameras.find((camera) => rearCameraPattern.test(camera.label)) ?? cameras[0];
}

export function nextCameraId(cameras: ScanCamera[], currentCameraId: string | null) {
  if (cameras.length < 2) return null;
  const currentIndex = cameras.findIndex((camera) => camera.id === currentCameraId);
  return cameras[(currentIndex + 1 + cameras.length) % cameras.length]?.id ?? null;
}
