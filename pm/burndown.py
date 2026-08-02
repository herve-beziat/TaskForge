#!/usr/bin/env python3
"""Génère pm/burndown.png (périmètre, idéal, réel) à partir de pm/burndown.csv.

Usage : python3 pm/burndown.py   (ou `make burndown`)

Mise à jour quotidienne = ajouter une ligne au CSV, relancer le script.
La colonne sp_total permet de tracer les corrections de périmètre.
"""

import csv
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

PM_DIR = Path(__file__).parent
CSV_PATH = PM_DIR / "burndown.csv"
PNG_PATH = PM_DIR / "burndown.png"

# Périmètre engagé au moment de la planification, avant tout ajustement.
# C'est le point de départ de la courbe de périmètre.
SP_DEPART = 98

# 10 jours ouvrés : 28-31 juil, week-end 1-2 août travaillé, 3-6 août
JOURS = [
    (1, date(2026, 7, 28), "mar 28"),
    (2, date(2026, 7, 29), "mer 29"),
    (3, date(2026, 7, 30), "jeu 30"),
    (4, date(2026, 7, 31), "ven 31"),
    (5, date(2026, 8, 1), "sam 1"),
    (6, date(2026, 8, 2), "dim 2"),
    (7, date(2026, 8, 3), "lun 3"),
    (8, date(2026, 8, 4), "mar 4"),
    (9, date(2026, 8, 5), "mer 5"),
    (10, date(2026, 8, 6), "jeu 6"),
]


def lire_releves():
    """Retourne {jour: (sp_restants, sp_total)} depuis le CSV.

    sp_total est optionnel : une ligne qui l'omet reprend le dernier connu,
    ce qui évite d'avoir à le répéter tant que le périmètre ne bouge pas.
    """
    if not CSV_PATH.exists():
        return {}

    releves = {}
    total_courant = SP_DEPART

    with CSV_PATH.open(encoding="utf-8") as f:
        for ligne in csv.DictReader(f):
            if not ligne.get("sp_restants", "").strip():
                continue
            if ligne.get("sp_total", "").strip():
                total_courant = float(ligne["sp_total"])
            releves[int(ligne["jour"])] = (float(ligne["sp_restants"]), total_courant)

    return releves


def main():
    releves = lire_releves()

    jours = [j for j, _, _ in JOURS]
    labels = [lbl for _, _, lbl in JOURS]

    jours_reels = sorted(j for j in releves if j in jours)
    valeurs_reelles = [releves[j][0] for j in jours_reels]
    totaux = [releves[j][1] for j in jours_reels]

    # Le périmètre courant sert de référence à la ligne idéale : elle répond à
    # « où faut-il en être pour tout terminer », donc au périmètre d'aujourd'hui,
    # pas à celui qu'on croyait avoir au départ.
    total_courant = totaux[-1] if totaux else SP_DEPART

    # Convention : les relevés réels sont pris EN FIN de journée. La ligne idéale
    # doit donc partir du total à un jour 0 — avant le début du sprint — et non au
    # jour 1, sans quoi elle n'attendrait aucune avancée le premier jour et
    # comparerait un début de journée à une fin de journée.
    dernier = jours[-1]
    jours_ideal = [0] + jours
    ideal = [total_courant * (dernier - j) / dernier for j in jours_ideal]

    fig, ax = plt.subplots(figsize=(10, 6))

    # Courbe de périmètre, en marches : sans elle, un ajout de scope se lirait
    # comme une journée improductive sur la courbe réelle. Les deux corrections
    # (TECH22 le 28/07, le front le 02/08) deviennent lisibles d'un coup d'œil.
    if jours_reels:
        ax.plot(
            [0] + jours_reels,
            [SP_DEPART] + totaux,
            drawstyle="steps-post",
            color="#f59e0b",
            linewidth=2,
            label="Périmètre",
        )

    ax.plot(jours_ideal, ideal, "--", color="#94a3b8", linewidth=2, label="Idéal")

    if jours_reels:
        ax.plot(
            jours_reels,
            valeurs_reelles,
            "-o",
            color="#2563eb",
            linewidth=2,
            markersize=6,
            label="Réel",
        )

    plafond = max(total_courant, SP_DEPART)

    # Frontière sprint 1 / sprint 2 (sprint 2 démarre au jour 7, lun 3 août)
    ax.axvline(6.5, color="#e2e8f0", linewidth=1.5, zorder=0)
    ax.text(3.5, plafond * 1.02, "Sprint 1", ha="center", color="#64748b", fontsize=9)
    ax.text(8.5, plafond * 1.02, "Sprint 2", ha="center", color="#64748b", fontsize=9)

    ax.set_title("TaskForge — Burn-down chart", fontsize=14, pad=20)
    ax.set_xlabel("Jour du sprint")
    ax.set_ylabel("Story points restants")
    ax.set_xticks(jours_ideal)
    ax.set_xticklabels(["départ"] + labels)
    ax.set_xlim(-0.3, dernier + 0.3)
    ax.set_ylim(0, plafond * 1.08)
    ax.grid(axis="y", alpha=0.3)
    ax.legend()
    ax.spines[["top", "right"]].set_visible(False)

    fig.tight_layout()
    fig.savefig(PNG_PATH, dpi=150)
    print(f"✓ {PNG_PATH} généré ({len(jours_reels)} point(s) réel(s))")


if __name__ == "__main__":
    main()
