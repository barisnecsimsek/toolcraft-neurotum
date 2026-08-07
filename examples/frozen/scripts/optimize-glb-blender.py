"""Collapse-decimate a static GLB while preserving its embedded material data.

Run with Blender:
  blender --background --python scripts/optimize-glb-blender.py -- input.glb output.glb 29000
"""

from pathlib import Path
import json
import math
import sys

import bpy


def triangle_count(mesh_object: bpy.types.Object) -> int:
    mesh_object.data.calc_loop_triangles()
    return len(mesh_object.data.loop_triangles)


arguments = sys.argv[sys.argv.index("--") + 1 :]
if len(arguments) != 3:
    raise SystemExit("Expected: input.glb output.glb target-triangles")

input_path = Path(arguments[0]).expanduser().resolve()
output_path = Path(arguments[1]).expanduser().resolve()
target_triangles = int(arguments[2])
if target_triangles < 1_000:
    raise SystemExit("Target must be at least 1,000 triangles.")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(input_path))
mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not mesh_objects:
    raise SystemExit("The GLB contains no mesh objects.")

source_triangles = sum(triangle_count(obj) for obj in mesh_objects)
bpy.ops.object.select_all(action="DESELECT")
for obj in mesh_objects:
    obj.select_set(True)
active = max(mesh_objects, key=triangle_count)
bpy.context.view_layer.objects.active = active
bpy.ops.object.join()
model = bpy.context.view_layer.objects.active
model.name = "Night King Optimized"

# Sketchfab may split one scan into 16-bit-index chunks. Joining objects alone
# leaves coincident border vertices disconnected, which makes a collapse pass
# tear visible holes between independently simplified chunks. Weld only
# effectively identical positions before any topology reduction.
vertices_before_weld = len(model.data.vertices)
weld = model.modifiers.new(name="Weld source chunks", type="WELD")
weld_threshold = max(1e-7, model.dimensions.length * 1e-7)
weld.merge_threshold = weld_threshold
weld.mode = "ALL"
bpy.context.view_layer.objects.active = model
bpy.ops.object.modifier_apply(modifier=weld.name)
vertices_after_weld = len(model.data.vertices)
print(
    "SOURCE_WELD="
    + json.dumps(
        {
            "threshold": weld_threshold,
            "vertices_before": vertices_before_weld,
            "vertices_after": vertices_after_weld,
            "merged": vertices_before_weld - vertices_after_weld,
        }
    )
)

pass_index = 0
current_triangles = triangle_count(model)
while current_triangles > target_triangles and pass_index < 3:
    pass_index += 1
    ratio = min(1.0, (target_triangles / current_triangles) * 0.985)
    modifier = model.modifiers.new(
        name=f"Preview LOD {pass_index}",
        type="DECIMATE",
    )
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = model
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    current_triangles = triangle_count(model)

# Some scan exports are split at the 16-bit index boundary and collapse cannot
# cross the resulting disconnected borders. Limited dissolve removes nearly
# coplanar interior edges while explicitly preserving UV and material seams.
if current_triangles > target_triangles:
    for angle_degrees in (
        0.1,
        0.2,
        0.3,
        0.4,
        0.5,
        0.65,
        0.8,
        1.0,
        1.25,
        1.5,
        2.0,
        2.5,
        3.0,
        4.0,
        5.0,
    ):
        modifier = model.modifiers.new(
            name=f"Planar cleanup {angle_degrees:g} degrees",
            type="DECIMATE",
        )
        modifier.decimate_type = "DISSOLVE"
        modifier.angle_limit = math.radians(angle_degrees)
        modifier.delimit = {"MATERIAL", "UV"}
        modifier.use_dissolve_boundaries = False
        bpy.context.view_layer.objects.active = model
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        current_triangles = triangle_count(model)
        print(
            "PLANAR_CLEANUP="
            + json.dumps(
                {"angle_degrees": angle_degrees, "triangles": current_triangles}
            )
        )
        if current_triangles <= target_triangles:
            break

# Joining source chunks can duplicate a shared material slot. Compact the slots
# after decimation without changing each surviving polygon's material reference.
old_materials = list(model.data.materials)
polygon_materials = [
    old_materials[min(polygon.material_index, len(old_materials) - 1)]
    if old_materials
    else None
    for polygon in model.data.polygons
]
unique_materials = []
for material in polygon_materials:
    if material is not None and material not in unique_materials:
        unique_materials.append(material)
model.data.materials.clear()
for material in unique_materials:
    model.data.materials.append(material)
material_indices = {material: index for index, material in enumerate(unique_materials)}
for polygon, material in zip(model.data.polygons, polygon_materials):
    polygon.material_index = material_indices.get(material, 0)
    polygon.use_smooth = True

model.data.update()

for obj in list(bpy.context.scene.objects):
    if obj is not model:
        bpy.data.objects.remove(obj, do_unlink=True)

output_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_apply=True,
    export_format="GLB",
    export_image_format="AUTO",
    export_materials="EXPORT",
    export_normals=True,
    export_texcoords=True,
)

print(
    "OPTIMIZED_GLB_EXPORT="
    + json.dumps(
        {
            "input": str(input_path),
            "output": str(output_path),
            "source_meshes": len(mesh_objects),
            "source_triangles": source_triangles,
            "output_triangles": current_triangles,
            "materials": len(unique_materials),
            "size_bytes": output_path.stat().st_size,
        },
        sort_keys=True,
    )
)
