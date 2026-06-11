import {
  FaceLandmarker,
  PoseLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let faceLandmarker: FaceLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;
let loadingPromise: Promise<void> | null = null;

export async function ensureTrackers(): Promise<{
  face: FaceLandmarker;
  pose: PoseLandmarker;
}> {
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const resolver = await FilesetResolver.forVisionTasks(WASM_BASE);
      faceLandmarker = await FaceLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      poseLandmarker = await PoseLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })();
  }
  await loadingPromise;
  return { face: faceLandmarker!, pose: poseLandmarker! };
}

export type FaceResult = FaceLandmarkerResult;
export type PoseResult = PoseLandmarkerResult;
