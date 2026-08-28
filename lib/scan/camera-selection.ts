export type ScanCamera = { id: string; label: string };

const rearCameraPattern = /back|rear|environment|world|خلف/i;
const frontCameraPattern = /front|user|selfie|أمام/i;

type CameraFacing = "front" | "rear" | "unknown";

function cameraFacing(camera: ScanCamera | undefined): CameraFacing {
  if (!camera) return "unknown";
  if (frontCameraPattern.test(camera.label)) return "front";
  if (rearCameraPattern.test(camera.label)) return "rear";
  return "unknown";
}

export function hasCameraLabels(cameras: ScanCamera[]) {
  return cameras.some((camera) => camera.label.trim().length > 0);
}

export function preferredCamera(cameras: ScanCamera[]) {
  return (
    cameras.find((camera) => rearCameraPattern.test(camera.label)) ?? cameras[0]
  );
}

export function nextCameraId(
  cameras: ScanCamera[],
  currentCameraId: string | null,
) {
  if (cameras.length < 2) return null;
  const currentIndex = cameras.findIndex(
    (camera) => camera.id === currentCameraId,
  );
  const currentFacing = cameraFacing(cameras[currentIndex]);
  const oppositeFacing = currentFacing === "front" ? "rear" : "front";
  const oppositeCamera = cameras.find(
    (camera) => cameraFacing(camera) === oppositeFacing,
  );

  if (currentFacing !== "unknown" && oppositeCamera) return oppositeCamera.id;
  return (
    cameras[(currentIndex + 1 + cameras.length) % cameras.length]?.id ?? null
  );
}
