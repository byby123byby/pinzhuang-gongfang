"""Read the agent's rendered view plan and prepare ordered Lux3D image-to-3D inputs."""
import json
from pathlib import Path


def read_view_plan(path):
    path = Path(path)
    parts = json.loads(path.read_text())["parts"]
    if not isinstance(parts, dict) or not parts:
        raise ValueError(f"{path}: expected a nonempty parts object")
    images = {}
    for code, part in parts.items():
        pages, features, views = part["sourcePages"], part["features"], part["views"]
        if not pages or any(type(page) is not int or page < 1 for page in pages):
            raise ValueError(f"{code}: missing one-based PDF evidence pages")
        if not features or not all(isinstance(f, str) and f.strip() for f in features):
            raise ValueError(f"{code}: missing observed features")
        if not 1 <= len(views) <= 32:
            raise ValueError(f"{code}: choose 1–32 views for the Lux3D input")
        paths, labels, covered = [], set(), set()
        for view in views:
            image = (path.parent / view["image"]).resolve()
            if not image.is_file():
                raise FileNotFoundError(image)
            if image in paths or not view["id"] or view["id"] in labels:
                raise ValueError(f"{code}: expected distinct view IDs and image paths")
            if not view["shows"] or not set(view["shows"]) <= set(features):
                raise ValueError(f"{code}/{view['id']}: identify the source features shown")
            paths.append(image)
            labels.add(view["id"])
            covered.update(view["shows"])
        if set(features) - covered:
            raise ValueError(f"{code}: views omit features {sorted(set(features)-covered)}")
        images[code] = paths
    return images


def image_payload(images, resolve_url, **generation_options):
    """resolve_url uploads or retrieves one matching receipt. Preserve the planned order."""
    from lux3d_client import build_image_to_3d_payload

    urls = [resolve_url(image) for image in images]
    source = {"img": urls[0]} if len(urls) == 1 else {"imgs": urls}
    return build_image_to_3d_payload(**source, **generation_options)
