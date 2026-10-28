import {
  Box3,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  RepeatWrapping,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type PrepareOptions = {
  /** World size along the fitted axis; the other axes keep the file's ratio. */
  size: number;
  fit?: "height" | "width";
  /** Extra per-axis multiplier applied after fitting, e.g. a slab covering a room. */
  stretch?: [number, number, number];
  /** Repeats the base colour map so tiled textures keep their scale. */
  repeat?: [number, number];
  /** Multiplies the base colour, so a bright asset can take a room tone. */
  tint?: string;
  /** Adds a small self-lit lift for props that must read brightly. */
  emissive?: string;
  emissiveIntensity?: number;
  /** Drops props baked into the file that do not belong in this scene. */
  hide?: RegExp;
  /** Collapses the file's many small meshes into one mesh per material. */
  merge?: boolean;
  /** Off for pieces small enough that shadow work is wasted. */
  shadows?: boolean;
};

/**
 * Clones a loaded glTF scene, scales it to a known world size, and drops it on
 * the floor centred on the origin. Every model therefore needs only a target
 * size and a position, never a hand-tuned scale per asset.
 */
export function prepareModel(source: Object3D, options: PrepareOptions) {
  const {
    size,
    fit = "height",
    stretch,
    repeat,
    tint,
    emissive,
    emissiveIntensity,
    hide,
    merge,
    shadows = true,
  } = options;

  const model = source.clone(true);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.setScalar(1);

  if (hide) {
    const doomed: Object3D[] = [];
    model.traverse((node) => {
      if (hide.test(node.name)) doomed.push(node);
    });
    for (const node of doomed) node.removeFromParent();
  }

  const clones = new Map<Material, Material>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    const sources = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    mesh.material = Array.isArray(mesh.material)
      ? sources.map((material) =>
          tintedCopy(
            material,
            tint,
            repeat,
            clones,
            emissive,
            emissiveIntensity,
          ),
        )
      : tintedCopy(
          sources[0],
          tint,
          repeat,
          clones,
          emissive,
          emissiveIntensity,
        );
  });

  model.updateMatrixWorld(true);
  if (merge) mergeModelByMaterial(model);
  model.updateMatrixWorld(true);

  const box = new Box3().setFromObject(model);
  const dimensions = box.getSize(new Vector3());
  const axis = fit === "width" ? dimensions.x : dimensions.y;
  const scale = axis > 0 ? size / axis : 1;

  model.scale.setScalar(scale);
  if (stretch) model.scale.multiply(new Vector3(...stretch));

  const center = box.getCenter(new Vector3());
  model.position.set(
    -center.x * model.scale.x,
    -box.min.y * model.scale.y,
    -center.z * model.scale.z,
  );

  return model;
}

/**
 * Collapses a model into one mesh per material. Imported files often ship a
 * hundred tiny meshes (a window here has 94), and each one is its own draw
 * call every frame; merging keeps walking through a room smooth.
 */
export function mergeModelByMaterial(model: Object3D) {
  model.updateMatrixWorld(true);

  const meshes: Mesh[] = [];
  model.traverse((node) => {
    const mesh = node as Mesh;
    const skinned = (mesh as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh;
    const instanced = (mesh as Mesh & { isInstancedMesh?: boolean })
      .isInstancedMesh;

    // A multi-material mesh renders through geometry groups; leave it alone.
    // Skinning, instancing and morph targets cannot survive a static merge.
    if (
      mesh.isMesh &&
      !Array.isArray(mesh.material) &&
      !skinned &&
      !instanced &&
      Object.keys(mesh.geometry.morphAttributes).length === 0
    ) {
      meshes.push(mesh);
    }
  });
  if (meshes.length < 2) return;

  const toModel = new Matrix4().copy(model.matrixWorld).invert();
  const byMaterial = new Map<Material, BufferGeometry[]>();

  for (const mesh of meshes) {
    const geometry = mergeableGeometry(mesh.geometry);
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(toModel, mesh.matrixWorld));

    const material = mesh.material as Material;
    const parts = byMaterial.get(material) ?? [];
    parts.push(geometry);
    byMaterial.set(material, parts);
  }

  const merged = new Group();
  let mergedAny = false;

  for (const [material, parts] of byMaterial) {
    const geometry = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!geometry) continue;

    merged.add(new Mesh(geometry, material));
    mergedAny = true;
  }

  if (!mergedAny) return;

  for (const mesh of meshes) mesh.removeFromParent();
  model.add(merged);
}

/** One attribute set for every part, so the parts can be merged. */
function mergeableGeometry(source: BufferGeometry) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();

  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") {
      geometry.deleteAttribute(name);
    }
  }

  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  if (!geometry.getAttribute("uv")) {
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute(new Float32Array(count * 2), 2),
    );
  }

  geometry.clearGroups();
  geometry.morphAttributes = {};
  return geometry;
}

function tintedCopy(
  material: Material,
  tint: string | undefined,
  repeat: [number, number] | undefined,
  clones: Map<Material, Material>,
  emissive: string | undefined,
  emissiveIntensity: number | undefined,
) {
  const cached = clones.get(material);
  if (cached) return cached;

  const copy = material.clone() as MeshStandardMaterial;
  if (tint) copy.color.set(tint);
  if (emissive && copy.emissive) {
    copy.emissive.set(emissive);
    copy.emissiveIntensity = emissiveIntensity ?? 1;
  }

  if (repeat && copy.map) {
    copy.map = copy.map.clone();
    copy.map.wrapS = RepeatWrapping;
    copy.map.wrapT = RepeatWrapping;
    copy.map.repeat.set(...repeat);
    copy.map.needsUpdate = true;
  }

  clones.set(material, copy);
  return copy;
}
