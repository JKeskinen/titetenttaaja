#!/usr/bin/env python3
"""
Päivittää manifest.jsonin tentit-hakemiston JSON-tiedostojen perusteella
ja kopioi kaiken myös WEB/tentit/ -kansioon.

- Luo automaattisesti WEB/tentit/ jos sitä ei ole.
- Hakee kaikki *.json-tiedostot (mutta ohittaa manifest.jsonin).
- Lukee otsikon JSON-tiedoston TITLE-kentästä (tai fallback tiedostonimestä).
- Lukee järjestysnumeron ORDER-kentästä (jos on).
- Poistaa vanhan manifest.jsonin ennen uuden luontia (täysi päivitys).
- Lisää kategorian tiedostonimen perusteella.
- Luo luettavat otsikot (säilyttää ääkköset).
"""

from __future__ import annotations
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

TITLE_KEYS: tuple[str, ...] = ("TITLE", "title", "name", "otsikko", "nimi", "subject")
MANIFEST_FILENAME = "manifest.json"

CATEGORY_ORDER = ["Fysiikka", "Ohjelmointi", "Verkko-ohjelmointi", "Tietotekniikka", "Ohjelmistosuunnittelu", "Sähkötekniikka", "Muut"]
CATEGORY_PRIORITY = {name: index for index, name in enumerate(CATEGORY_ORDER)}

SMALL_WORDS = {"ja", "sekä", "tai", "vai"}


@dataclass
class Entry:
    id: str
    title: str
    file: str
    extras: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {"id": self.id, "title": self.title, "file": self.file}
        if self.extras:
            data.update(self.extras)
        return data


def slugify(value: str) -> str:
    """Luo tiedostonimestä URL/ID-yhteensopivan tunnisteen."""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-{2,}", "-", value).strip("-") or "tentti"


def prettify_title(filename: str) -> str:
    """Luo siisti otsikko tiedostonimestä säilyttäen ääkköset."""
    stem = Path(filename).stem
    stem = stem.replace("_", " ").replace("-", " ").strip()
    words = stem.split()
    if not words:
        return stem.capitalize()
    pretty = [words[0].capitalize()]
    for word in words[1:]:
        if word.lower() in SMALL_WORDS:
            pretty.append(word.lower())
        else:
            pretty.append(word.capitalize())
    return " ".join(pretty)


def extract_title(data: Any, fallback: str) -> str:
    """Etsii otsikon JSON-tiedoston sisällöstä TITLE-avainsanan avulla."""
    if isinstance(data, dict):
        for key in TITLE_KEYS:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return fallback


def infer_category_from_filename(filename: str) -> str:
    """Päättelee kategorian tiedostonimen perusteella."""
    name = filename.lower()
    if "verkko" in name and "ohjelmointi" in name:
        return "Verkko-ohjelmointi"
    if "ohjelmointi" in name or "koodi" in name:
        return "Ohjelmointi"
    if "fysiikka" in name:
        return "Fysiikka"
    if "tietoliikenne" in name or "tietotekniikka" in name:
        return "Tietotekniikka"
    if "ohjelmistosuunnittelu" in name or "software" in name:
        return "Ohjelmistosuunnittelu"
    if "elektroni" in name or "sähkötekniikka" in name or "sähkö" in name:
        return "Sähkötekniikka"
    return "Muut"


def gather_entries(tent_files: Iterable[Path]) -> List[Entry]:
    """Luo manifest-merkinnät tenttitiedostoista tyhjästä."""
    results: List[Entry] = []

    for file_path in tent_files:
        rel_name = file_path.name
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:
            data = {}

        # 🧠 Ensisijainen otsikko tiedoston TITLE-kentästä
        title = extract_title(data, prettify_title(rel_name))
        category = infer_category_from_filename(rel_name)

        # 🔢 Haetaan järjestysnumero, jos sellainen on JSONissa
        order = 999
        if isinstance(data, dict):
            raw_order = data.get("ORDER") or data.get("order") or data.get("Order")
            if isinstance(raw_order, (int, float)):
                order = int(raw_order)

        entry = Entry(
            id=slugify(file_path.stem),
            title=title,
            file=rel_name,
            extras={"category": category, "order": order},
        )
        results.append(entry)

    def sort_key(item: Entry) -> tuple[int, str, int, str]:
        """Järjestys: ensin kategoria, sitten ORDER, sitten otsikko."""
        category = item.extras.get("category", "Muut")
        priority = CATEGORY_PRIORITY.get(category, len(CATEGORY_PRIORITY))
        order = item.extras.get("order", 999)
        title = item.title.lower()
        return (priority, category.lower(), order, title)

    results.sort(key=sort_key)
    return results


def copy_to_web(source_dir: Path, target_dir: Path) -> None:
    """Kopioi tenttitiedostot ja images-kansion WEB/tentit -kansioon."""
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Kopioi JSON-tiedostot
    json_count = 0
    for file in source_dir.glob("*.json"):
        shutil.copy2(file, target_dir / file.name)
        json_count += 1
    print(f"✅ Kopioitu {json_count} JSON-tiedostoa → {target_dir}")
    
    # Kopioi images-kansio rekursiivisesti
    source_images = source_dir / "images"
    target_images = target_dir / "images"
    
    if source_images.exists() and source_images.is_dir():
        # Poista vanha images-kansio WEB:stä ja kopioi uusi
        if target_images.exists():
            shutil.rmtree(target_images)
        shutil.copytree(source_images, target_images)
        
        # Laske kuvatiedostot
        image_count = sum(1 for _ in target_images.rglob("*.png")) + \
                      sum(1 for _ in target_images.rglob("*.jpg")) + \
                      sum(1 for _ in target_images.rglob("*.jpeg"))
        print(f"📁 Kopioitu images-kansio ({image_count} kuvaa) → {target_images}")
    else:
        print("⚠️ images-kansiota ei löytynyt, ohitetaan")


def main() -> None:
    tentit_dir = Path(__file__).resolve().parent
    project_root = tentit_dir.parent
    manifest_path = tentit_dir / MANIFEST_FILENAME

    tent_files = [
        path for path in tentit_dir.glob("*.json")
        if path.name.lower() != MANIFEST_FILENAME.lower()
    ]

    # 🧹 Poistetaan vanha manifest.json kokonaan ennen luontia
    if manifest_path.exists():
        manifest_path.unlink()
        print("🧹 Vanha manifest.json poistettu.")

    updated_entries = gather_entries(tent_files)

    manifest_path.write_text(
        json.dumps([entry.to_dict() for entry in updated_entries], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"📝 Luotu uusi {manifest_path} ({len(updated_entries)} tenttiä).")

    web_tentit = project_root / "WEB" / "tentit"
    copy_to_web(tentit_dir, web_tentit)


if __name__ == "__main__":
    main()
