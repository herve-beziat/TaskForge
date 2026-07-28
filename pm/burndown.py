#!/usr/bin/env python3
"""Génère pm/burndown.png (idéal vs réel) à partir de pm/burndown.csv.

Usage : python3 pm/burndown.py   (ou `make burndown`)

Mise à jour quotidienne = ajouter une ligne au CSV, relancer le script.
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

# Périmètre initial 98 SP. +3 le 28/07 (TECH22, Traefik, demande de l'encadrant).
TOTAL_SP = 101
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


def lire_reel():
    """Retourne {jour: sp_restants} depuis le CSV."""
    if not CSV_PATH.exists():
        return {}
    with CSV_PATH.open(encoding="utf-8") as f:
        return {
            int(row["jour"]): float(row["sp_restants"])
            for row in csv.DictReader(f)
            if row.get("sp_restants", "").strip()
        }


def main():
    reel = lire_reel()

    jours = [j for j, _, _ in JOURS]
    labels = [lbl for _, _, lbl in JOURS]

    # Ligne idéale : de TOTAL_SP au jour 1 jusqu'à 0 au dernier jour
    dernier = jours[-1]
    ideal = [TOTAL_SP * (dernier - j) / (dernier - 1) for j in jours]

    jours_reels = sorted(j for j in reel if j in jours)
    valeurs_reelles = [reel[j] for j in jours_reels]

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(jours, ideal, "--", color="#94a3b8", linewidth=2, label="Idéal")
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

    # Frontière sprint 1 / sprint 2 (sprint 2 démarre au jour 7, lun 3 août)
    ax.axvline(6.5, color="#e2e8f0", linewidth=1.5, zorder=0)
    ax.text(3.5, TOTAL_SP * 1.02, "Sprint 1", ha="center", color="#64748b", fontsize=9)
    ax.text(8.5, TOTAL_SP * 1.02, "Sprint 2", ha="center", color="#64748b", fontsize=9)

    ax.set_title("TaskForge — Burn-down chart", fontsize=14, pad=20)
    ax.set_xlabel("Jour du sprint")
    ax.set_ylabel("Story points restants")
    ax.set_xticks(jours)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, TOTAL_SP * 1.08)
    ax.grid(axis="y", alpha=0.3)
    ax.legend()
    ax.spines[["top", "right"]].set_visible(False)

    fig.tight_layout()
    fig.savefig(PNG_PATH, dpi=150)
    print(f"✓ {PNG_PATH} généré ({len(jours_reels)} point(s) réel(s))")


if __name__ == "__main__":
    main()
