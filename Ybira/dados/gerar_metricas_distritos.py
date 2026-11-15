"""Build district-level indicators for the São Paulo map."""

import json
import unicodedata

import numpy as np
from openpyxl import load_workbook
from PIL import Image

from gerar_metricas_ong import DATA, SITE, number, read_csv, sector_temperature


def name_key(name):
    text = unicodedata.normalize("NFD", name.casefold())
    return "".join(ch for ch in text if not unicodedata.combining(ch) and ch.isalnum())


def published_vegetation():
    path = DATA / "originais" / "mapa_da_desigualdade_2023_dados.xlsx"
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        rows = iter(workbook["2. Dados_distritos_2023"].values)
        header = next(rows)
        district = header.index("Distritos")
        cover = header.index("Cobertura vegetal (%)")
        return {
            name_key(row[district]): round(row[cover] / 100, 6)
            for row in rows
            if isinstance(row[district], str) and isinstance(row[cover], (int, float))
        }
    finally:
        workbook.close()


def main():
    census = DATA / "Dados SP"
    crosswalk = read_csv(DATA, "vinculo_distritos_IBGE_GeoSampa.csv", "cd_distrito_municipal")
    population = read_csv(census, "IBGE_distritos_sp_demografia.csv", "CD_DIST")
    race = read_csv(census, "IBGE_distritos_sp_cor_ou_raca.csv", "CD_DIST")
    income = read_csv(census, "IBGE_distritos_sp_renda_responsaveis.csv", "CD_DIST")
    streets = read_csv(census, "IBGE_distritos_sp_entorno_moradores.csv", "CD_DIST")
    vegetation = published_vegetation()
    districts = json.loads((DATA / "01_distritos_sp.geojson").read_text(encoding="utf-8-sig"))
    with Image.open(DATA / "05_temperatura_superficie_SP_2025-11-29_C.tif") as image:
        raster = np.array(image)
        origin = image.tag_v2[33922][3:5]
        pixel_size = image.tag_v2[33550][:2]
        nodata = float(image.tag_v2[42113])
    metrics = {}
    for feature in districts["features"]:
        code = str(feature["properties"]["cd_distrito_municipal"])
        match = crosswalk[code]
        id_, name = match["CD_DIST"], match["NM_DIST"]
        cover = vegetation[name_key(name)]
        counts = [number(race[id_].get(f"V{i:05}")) for i in range(1317, 1322)]
        trees = [number(streets[id_].get(f"V{i:05}")) for i in range(5230, 5234)]
        heat = sector_temperature(raster, feature["geometry"], origin, pixel_size, nodata)
        metrics[id_] = [
            *heat, trees[0], sum(trees) if None not in trees else None,
            number(population[id_]["V01006"]), counts, number(income[id_]["V06006"]), name, cover,
        ]
    if len(metrics) != 96:
        raise ValueError(f"Expected 96 districts, matched {len(metrics)}")
    rows = [json.dumps(k) + ":" + json.dumps(v, ensure_ascii=False, separators=(",", ":")) for k, v in sorted(metrics.items())]
    (SITE / "district-data.js").write_text(
        "// District indicators in the same order as organization-data.js, with the district name in place of the community.\n"
        + "window.ybiraDistrictData = {\n" + ",\n".join(rows) + "\n};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
