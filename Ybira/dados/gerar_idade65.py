"""Extract Census 2022 counts of residents 65+ for the areas in the Ybirá map."""

import csv
import io
import json
from pathlib import Path
from zipfile import ZipFile

DATA = Path(__file__).resolve().parent
SITE = DATA.parent / "site"
AGE_GROUPS = ("V00654", "V00655", "V00656")


def map_rows(file_name):
    text = (SITE / file_name).read_text(encoding="utf-8")
    return json.loads(text[text.index("{"):text.rindex("}") + 1])


def read_counts(archive, key, areas):
    results = {code: None for code in areas}
    seen = set()
    with ZipFile(DATA / "originais" / archive) as zipped:
        entry, = (name for name in zipped.namelist() if name.lower().endswith(".csv"))
        with zipped.open(entry) as source:
            rows = csv.reader(io.TextIOWrapper(source, encoding="latin-1"), delimiter=";")
            fields = [label.upper() for label in next(rows)]
            area_index = fields.index(key)
            age_indexes = [fields.index(label) for label in AGE_GROUPS]
            for row in rows:
                code = row[area_index]
                if code not in areas:
                    continue
                if code in seen:
                    raise ValueError(f"Duplicate Census code {code}")
                seen.add(code)
                values = [row[index].strip() for index in age_indexes]
                if all(value.isdecimal() for value in values):
                    count = sum(map(int, values))
                    population = areas[code][6]
                    if population is not None and count > population:
                        raise ValueError(f"Count exceeds population for {code}")
                    results[code] = count
    return results


def main():
    districts = read_counts("ibge-distritos-alfabetizacao-2022.zip", "CD_DIST", map_rows("district-data.js"))
    sectors = read_counts("ibge-setores-alfabetizacao-2022.zip", "CD_SETOR", map_rows("organization-data.js"))
    joined = districts | sectors
    encoded = json.dumps(joined, sort_keys=True, separators=(",", ":"))
    (SITE / "age-data.js").write_text(
        "// IBGE Census 2022: 65–69, 70–79 and 80+ (V00654–V00656).\nwindow.ybiraAge65 = " + encoded + ";\n",
        encoding="utf-8",
    )
    print(f"Published counts: {sum(value is not None for value in districts.values())}/{len(districts)} districts, "
          f"{sum(value is not None for value in sectors.values())}/{len(sectors)} sectors")


if __name__ == "__main__":
    main()
