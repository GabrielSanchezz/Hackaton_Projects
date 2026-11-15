"""Build the public sector metrics from the locally archived source files."""

import csv
import json
from math import ceil, floor
from pathlib import Path

import numpy as np
from PIL import Image

DATA = Path(__file__).resolve().parent
SITE = DATA.parent / "site"


def read_csv(folder, name, key):
    with (folder / name).open(encoding="utf-8-sig", newline="") as source:
        return {row[key]: row for row in csv.DictReader(source, delimiter=";")}


def number(value):
    try:
        return float(value.replace(",", "."))
    except (AttributeError, ValueError):
        return None


def in_ring(x, y, ring):
    inside = np.zeros((len(y), len(x)), dtype=bool)
    x, y = x[None, :], y[:, None]
    for (ax, ay), (bx, by) in zip(ring, ring[1:]):
        if ay != by:
            inside ^= ((ay > y) != (by > y)) & (x < ax + (bx - ax) * (y - ay) / (by - ay))
    return inside


def windows(geometry, shape, origin, size):
    polygons = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        polygons = [polygons]
    left, top = origin
    dx, dy = size
    for polygon in polygons:
        xs, ys = zip(*polygon[0])
        col0 = max(0, floor((min(xs) - left) / dx))
        col1 = min(shape[1], ceil((max(xs) - left) / dx))
        row0 = max(0, floor((top - max(ys)) / dy))
        row1 = min(shape[0], ceil((top - min(ys)) / dy))
        if col1 <= col0 or row1 <= row0:
            continue
        x = left + (np.arange(col0, col1) + .5) * dx
        y = top - (np.arange(row0, row1) + .5) * dy
        mask = in_ring(x, y, polygon[0])
        for hole in polygon[1:]:
            mask &= ~in_ring(x, y, hole)
        yield np.s_[row0:row1, col0:col1], mask


def sector_temperature(raster, geometry, origin, size, nodata):
    """Sample valid pixel centers inside the sector, excluding polygon holes."""
    samples = [raster[window][mask] for window, mask in windows(geometry, raster.shape, origin, size)]
    values = np.concatenate(samples) if samples else np.array([])
    valid = values[np.isfinite(values) & (values != nodata)]
    if not len(valid):
        return [None, None, 0, len(values)]
    return [round(float(valid.mean()), 2), round(float(valid.max()), 2), len(valid), len(values)]


def vegetation_grid():
    """Rasterize all mapped vegetation classes to a ~6 m grid around Brasilândia."""
    origin, size = (-46.72, -23.41), (.00006, .00006)
    coverage = np.zeros((1300, 1050), dtype=bool)
    features = json.loads((DATA / "03_vegetacao_brasilandia.geojson").read_text(encoding="utf-8-sig"))
    for feature in features["features"]:
        for window, mask in windows(feature["geometry"], coverage.shape, origin, size):
            coverage[window] |= mask
    return coverage, origin, size


def sector_vegetation(grid, geometry, origin, size):
    covered = total = 0
    for window, mask in windows(geometry, grid.shape, origin, size):
        covered += int(np.count_nonzero(grid[window] & mask))
        total += int(np.count_nonzero(mask))
    return round(covered / total, 4) if total else None


def main():
    census = DATA / "Dados SP"
    basics = read_csv(census, "IBGE_setores_brasilandia_basico.csv", "CD_SETOR")
    race = read_csv(census, "IBGE_setores_brasilandia_cor_ou_raca.csv", "CD_SETOR")
    income = read_csv(census, "IBGE_setores_brasilandia_renda_responsaveis.csv", "CD_SETOR")
    surroundings = read_csv(census, "IBGE_setores_brasilandia_entorno_moradores.csv", "CD_setor")
    sectors = json.loads((DATA / "04_setores_brasilandia.geojson").read_text(encoding="utf-8-sig"))
    vegetation, veg_origin, veg_size = vegetation_grid()
    with Image.open(DATA / "05_temperatura_superficie_SP_2025-11-29_C.tif") as image:
        raster = np.array(image)
        origin = image.tag_v2[33922][3:5]
        size = image.tag_v2[33550][:2]
        nodata = float(image.tag_v2[42113])
    metrics = {}
    for feature in sectors["features"]:
        id_ = feature["properties"]["cd_original_setor_censitario"]
        basic = basics.get(id_, {})
        categories = [number(race.get(id_, {}).get(f"V{i:05}")) for i in range(1317, 1322)]
        trees = [number(surroundings.get(id_, {}).get(f"V{i:05}")) for i in range(5230, 5234)]
        heat = sector_temperature(raster, feature["geometry"], origin, size, nodata)
        metrics[id_] = [
            *heat, trees[0], sum(trees) if None not in trees else None,
            number(basic.get("v0001")), categories,
            number(income.get(id_, {}).get("V06006")),
            basic.get("NM_FCU") or None,
            sector_vegetation(vegetation, feature["geometry"], veg_origin, veg_size),
        ]
    columns = "mean, max, valid, sampled, residents without trees, residents assessed, census population, race [White, Black, Asian, Brown, Indigenous], median income, named IBGE urban community, vegetation cover share"
    rows = [json.dumps(k) + ":" + json.dumps(v, ensure_ascii=False, separators=(",", ":")) for k, v in metrics.items()]
    (SITE / "organization-data.js").write_text(
        f"// {columns}\nwindow.ybiraOrganizationData = {{\n" + ",\n".join(rows) + "\n};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
