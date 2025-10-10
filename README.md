# TiTeTenttaaja

Komentorivipohjainen Python-tenttijärjestelmä, joka lukee kysymykset JSON-tiedostosta ja antaa monivalintakysymyksiä.

## Käyttö
### CLI-versio
1. Suorita `python titetenttaaja.py` (Windows) tai `python3 titetenttaaja.py` (Linux/macOS).
2. Valitse tentti ja vastaa kysymyksiin.

### Selainversio
1. Käynnistä paikallinen palvelin projektin juuresta. Avaa Powershell ja kirjoita komento `python -m http.server`.
2. Avaa selain osoitteeseen `http://localhost:8000/WEB/`.
3. Valitse tentti, tarvittaessa rajaa kysymysten määrä ja aloita testi.

## Kontributoi

Tentit ovat JSON-tiedostoina projektin juuressa kansiossa nimeltä 'tentit'. voit luoda omia tenttitiedostoja ja lisätä ne repositorioon muiden saatavaksi.

JSON-tiedoston rakenne:
```json
{
  "TITLE": "Tentin aihe",
  "questions": [
  {
    "question": "Kysymys",
    "options": [
      "Optio 1",
      "Optio 2",
      "Optio 3",
      "Optio 4"
    ],
    "correct": "Optio 1"
  },
```
