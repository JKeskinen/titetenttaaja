# TiTeTenttaaja

Komentorivipohjainen Python-tenttijärjestelmä, joka lukee kysymykset JSON-tiedostosta ja antaa monivalintakysymyksiä.

## Käyttö
1. Suorita 'python3 titetenttaaja.py'(Windows) tai 'python titetenttaaja.py'(Gnu/Linux)
2. valitse tentti ja vastaa kysymyksiin.

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
