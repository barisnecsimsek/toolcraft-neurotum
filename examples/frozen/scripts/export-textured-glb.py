"""Relink nearby texture files and export the current Blender scene as GLB.

Run with Blender:
  blender --background source.blend --python scripts/export-textured-glb.py -- output.glb textures/
"""

from pathlib import Path
import re
import sys

import bpy


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", Path(value).stem.lower())


arguments = sys.argv[sys.argv.index("--") + 1 :]
if len(arguments) != 2:
    raise SystemExit("Expected: output.glb texture-directory")

output_path = Path(arguments[0]).expanduser().resolve()
texture_directory = Path(arguments[1]).expanduser().resolve()
textures = {
    normalized_name(path.name): path
    for path in texture_directory.iterdir()
    if path.is_file()
}

relinked = []
for image in bpy.data.images:
    match = textures.get(normalized_name(image.name))
    if match is None:
        match = textures.get(normalized_name(image.filepath))
    if match is None:
        continue
    image.filepath = str(match)
    image.reload()
    relinked.append(image.name)

for material in bpy.data.materials:
    if not material.use_nodes or material.node_tree is None:
        continue
    tree = material.node_tree
    for node in list(tree.nodes):
        if node.bl_idname != "ShaderNodeTexImage" or node.image is None:
            continue
        normal_links = [
            link
            for link in list(node.outputs.get("Color", ()).links)
            if link.to_socket.name == "Normal"
        ]
        if not normal_links:
            continue
        node.image.colorspace_settings.name = "Non-Color"
        normal_map = tree.nodes.new("ShaderNodeNormalMap")
        normal_map.name = f"GLB Normal Map ({node.name})"
        normal_map.location = (node.location.x + 190, node.location.y)
        tree.links.new(node.outputs["Color"], normal_map.inputs["Color"])
        for link in normal_links:
            destination = link.to_socket
            tree.links.remove(link)
            tree.links.new(normal_map.outputs["Normal"], destination)

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
    "TEXTURED_GLB_EXPORT="
    + repr(
        {
            "output": str(output_path),
            "relinked": relinked,
            "size": output_path.stat().st_size,
        }
    )
)

