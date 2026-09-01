import assert from "node:assert/strict";
import test from "node:test";

import {
  hasCameraLabels,
  nextCameraId,
  preferredCamera,
} from "../lib/scan/camera-selection";

const cameras = [
  { id: "front", label: "Front Camera" },
  { id: "rear", label: "Rear Camera" },
  { id: "world", label: "World-facing camera" },
];

test("scanner camera selection prefers common rear-facing labels", () => {
  assert.equal(preferredCamera(cameras)?.id, "rear");
  assert.equal(
    preferredCamera([
      { id: "back", label: "BACK camera" },
      { id: "front", label: "Front" },
    ])?.id,
    "back",
  );
});

test("scanner camera selection falls back safely without a rear label", () => {
  assert.equal(
    preferredCamera([
      { id: "one", label: "USB Camera" },
      { id: "two", label: "Integrated Camera" },
    ])?.id,
    "one",
  );
  assert.equal(hasCameraLabels([{ id: "one", label: "" }]), false);
});

test("scanner camera switching cycles deterministically and handles one camera", () => {
  assert.equal(nextCameraId(cameras, "front"), "rear");
  assert.equal(nextCameraId(cameras, "rear"), "front");
  assert.equal(nextCameraId(cameras, "world"), "front");
  assert.equal(nextCameraId([{ id: "only", label: "Camera" }], "only"), null);
});

test("scanner camera switching skips same-facing iPhone lenses", () => {
  const iphoneCameras = [
    { id: "rear-wide", label: "Back Wide Camera" },
    { id: "rear-ultra", label: "Back Ultra Wide Camera" },
    { id: "front", label: "Front Camera" },
  ];

  assert.equal(nextCameraId(iphoneCameras, "rear-wide"), "front");
  assert.equal(nextCameraId(iphoneCameras, "front"), "rear-wide");
});

test("scanner camera switching recognizes Arabic front and rear labels", () => {
  const arabicCameras = [
    { id: "rear", label: "الكاميرا الخلفية" },
    { id: "front", label: "الكاميرا الأمامية" },
  ];

  assert.equal(nextCameraId(arabicCameras, "rear"), "front");
  assert.equal(nextCameraId(arabicCameras, "front"), "rear");
});
