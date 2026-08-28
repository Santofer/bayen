#!/usr/bin/env python3
"""
C21 — Référentiel des plats marocains (collection `moroccan_dishes`).

Sans référentiel, l'estimation d'un tajine ou d'une harira reposait uniquement
sur ce que le modèle sait des plats « en général » : les portions marocaines
et les modes de préparation locaux (huile d'olive généreuse, pain en
accompagnement, thé très sucré) passaient à la trappe.

Les valeurs sont des ORDRES DE GRANDEUR par portion typique, exprimés en
fourchettes larges : un tajine familial varie énormément selon l'huile et la
coupe de viande. On ne cherche pas la précision, on cherche à éviter les
estimations absurdes.

Sources : tables CIQUAL / USDA pour les composants de base, recomposés par
portion servie.

Idempotent : upsert par name_fr. Dry-run par défaut (APPLY=0).
Usage : docker exec -e DTOKEN=... -e APPLY=1 -i bayen-tesseract python3 - < scripts/seed-moroccan-dishes.py
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
APPLY = os.environ.get("APPLY", "0") == "1"

# name_fr, name_ar, aliases, portion_g, kcal_min, kcal_max, prot, gluc, lip, verdict
DISHES = [
    # ── Tajines ────────────────────────────────────────────────────────
    ("Tajine de poulet aux olives", "طاجين الدجاج بالزيتون",
     ["tajine poulet", "tagine de poulet", "tajine zitoun", "poulet aux olives"],
     350, 380, 560, 32, 14, 26, "equilibre"),
    ("Tajine de kefta aux œufs", "طاجين الكفتة بالبيض",
     ["tajine kefta", "kefta mkaouara", "tajine viande hachée oeuf"],
     320, 450, 650, 30, 12, 42, "a_limiter"),
    ("Tajine d'agneau aux pruneaux", "طاجين اللحم بالبرقوق",
     ["tajine agneau pruneaux", "lham bel barkouk", "tajine mrouzia sucré"],
     350, 520, 780, 30, 45, 38, "occasionnel"),
    ("Tajine de légumes", "طاجين الخضر",
     ["tajine legumes", "tajine vegetarien", "tajine khodra"],
     350, 220, 340, 8, 32, 10, "sain"),
    ("Tajine de poisson chermoula", "طاجين الحوت بالشرمولة",
     ["tajine poisson", "hout mchermel", "tajine sardine"],
     330, 300, 450, 34, 16, 18, "sain"),
    ("Tajine de bœuf aux légumes", "طاجين اللحم بالخضر",
     ["tajine boeuf", "tajine viande", "tajine lham"],
     350, 400, 600, 33, 22, 30, "equilibre"),

    # ── Couscous ───────────────────────────────────────────────────────
    ("Couscous aux sept légumes", "كسكس بسبع خضاري",
     ["couscous legumes", "seksu", "couscous vendredi", "couscous 7 legumes"],
     450, 480, 700, 22, 78, 16, "equilibre"),
    ("Couscous tfaya", "كسكس التفاية",
     ["couscous aux oignons caramelises", "tfaya", "couscous sucré salé"],
     450, 600, 850, 24, 92, 22, "a_limiter"),
    ("Couscous au poulet", "كسكس بالدجاج",
     ["couscous poulet", "seksu djaj"],
     450, 520, 750, 30, 76, 18, "equilibre"),

    # ── Soupes et légumineuses ─────────────────────────────────────────
    ("Harira", "حريرة",
     ["harira marocaine", "soupe harira", "hrira"],
     300, 150, 260, 9, 26, 5, "sain"),
    ("Bissara", "بيصارة",
     ["bissara feves", "soupe de feves", "besarra"],
     300, 220, 330, 13, 34, 8, "sain"),
    ("Loubia", "اللوبيا",
     ["haricots blancs", "loubya", "ragout haricots"],
     300, 260, 400, 15, 42, 8, "sain"),
    ("Adas (lentilles)", "العدس",
     ["lentilles", "adass", "soupe lentilles"],
     300, 240, 360, 16, 40, 6, "sain"),
    ("Chorba", "شربة",
     ["chorba marocaine", "soupe vermicelle"],
     300, 130, 220, 8, 24, 4, "sain"),

    # ── Plats de fête et pièces ────────────────────────────────────────
    ("Rfissa", "الرفيسة",
     ["rfissa poulet", "trid poulet", "rfissa fenugrec"],
     400, 600, 850, 32, 70, 30, "a_limiter"),
    ("Pastilla au poulet", "بسطيلة بالدجاج",
     ["pastilla", "bstilla", "bastilla poulet"],
     200, 450, 680, 22, 42, 32, "occasionnel"),
    ("Pastilla aux fruits de mer", "بسطيلة بالحوت",
     ["pastilla poisson", "bstilla fruits de mer"],
     200, 380, 560, 24, 38, 22, "a_limiter"),
    ("Tanjia", "الطنجية",
     ["tanjia marrakchia", "tangia"],
     300, 500, 750, 38, 6, 55, "occasionnel"),
    ("Mrouzia", "المروزية",
     ["mrouzia agneau", "marouzia"],
     300, 550, 800, 28, 48, 42, "occasionnel"),
    ("Seffa medfouna", "سفة مدفونة",
     ["seffa", "cheveux d'ange sucrés", "seffa poulet"],
     350, 520, 750, 20, 80, 20, "a_limiter"),
    ("Trid", "الرايب",
     ["tride", "trid poulet"],
     350, 480, 700, 26, 62, 22, "a_limiter"),

    # ── Grillades et viandes ───────────────────────────────────────────
    ("Brochettes de viande", "قطبان",
     ["brochettes", "qotban", "kebab marocain", "brochette boeuf"],
     200, 380, 560, 36, 4, 36, "equilibre"),
    ("Kefta grillée", "كفتة مشوية",
     ["kefta", "boulettes grillees", "kefta brochette"],
     200, 400, 580, 32, 3, 42, "equilibre"),
    ("Poulet rôti", "دجاج مشوي",
     ["poulet roti", "djaj mchoui", "demi poulet"],
     250, 380, 540, 42, 2, 30, "equilibre"),
    ("Sardines grillées", "سردين مشوي",
     ["sardines", "sardine grillee", "sardina"],
     200, 280, 400, 38, 1, 18, "sain"),
    ("Sardines farcies", "سردين معمر",
     ["sardines farcies chermoula", "sardina maamra"],
     220, 380, 540, 34, 14, 26, "equilibre"),
    ("Méchoui", "مشوي",
     ["mechoui", "agneau roti", "mechwi"],
     250, 550, 780, 40, 1, 60, "occasionnel"),

    # ── Salades et entrées ─────────────────────────────────────────────
    ("Zaalouk", "الزعلوك",
     ["zaalouk aubergine", "caviar aubergine marocain", "zaalouk"],
     150, 120, 200, 3, 12, 12, "sain"),
    ("Taktouka", "تكتوكة",
     ["taktouka poivrons", "salade poivrons tomates"],
     150, 100, 170, 3, 11, 9, "sain"),
    ("Salade marocaine", "السلطة المغربية",
     ["salade tomate concombre", "chlada", "salade marocaine"],
     150, 50, 100, 2, 8, 3, "sain"),
    ("Maakouda", "معقودة",
     ["maakouda pomme de terre", "beignet pomme de terre", "makouda"],
     120, 280, 420, 5, 34, 20, "a_limiter"),
    ("Briouates à la viande", "بريوات باللحم",
     ["briouate viande", "briwat kefta"],
     120, 340, 500, 14, 28, 24, "a_limiter"),
    ("Briouates au fromage", "بريوات بالجبن",
     ["briouate fromage", "briwat jben"],
     120, 320, 470, 12, 30, 22, "a_limiter"),

    # ── Pains et petit-déjeuner ────────────────────────────────────────
    ("Msemen", "مسمن",
     ["msemmen", "crepe feuilletee marocaine", "meloui"],
     100, 300, 430, 6, 44, 15, "a_limiter"),
    ("Baghrir", "بغرير",
     ["crepe mille trous", "baghrir miel"],
     100, 200, 300, 6, 40, 4, "equilibre"),
    ("Harcha", "حرشة",
     ["harsha", "galette semoule"],
     100, 320, 450, 6, 46, 16, "a_limiter"),
    ("Batbout", "بطبوط",
     ["batbot", "pain marocain vapeur", "mkhamer"],
     100, 240, 320, 8, 50, 3, "equilibre"),
    ("Khobz (pain marocain)", "خبز",
     ["khobz", "pain marocain", "kesra"],
     100, 250, 320, 9, 52, 3, "equilibre"),

    # ── Sucré ──────────────────────────────────────────────────────────
    ("Chebakia", "الشباكية",
     ["chebbakia", "griwech", "chebakia miel"],
     60, 280, 400, 4, 42, 18, "occasionnel"),
    ("Sellou", "سلو",
     ["sfouf", "slilou", "sellou amandes"],
     60, 300, 420, 8, 34, 22, "occasionnel"),
    ("Cornes de gazelle", "كعب الغزال",
     ["kaab el ghzal", "corne de gazelle"],
     60, 240, 340, 5, 38, 12, "occasionnel"),
    ("Ghriba", "الغريبة",
     ["ghriba amandes", "ghoriba", "ghriba noix de coco"],
     50, 220, 320, 4, 30, 14, "occasionnel"),

    # ── Boissons ───────────────────────────────────────────────────────
    ("Thé à la menthe sucré", "أتاي بالنعناع",
     ["the a la menthe", "atay", "the marocain"],
     200, 60, 120, 0, 16, 0, "a_limiter"),
    ("Jus d'avocat", "عصير الأفوكادو",
     ["jus avocat", "avocado juice", "jus d'avocat aux amandes"],
     300, 280, 450, 7, 42, 18, "a_limiter"),
    ("Café au lait", "قهوة بالحليب",
     ["nous nous", "cafe au lait", "café crème"],
     200, 90, 160, 6, 12, 5, "equilibre"),
    ("Raib", "الرايب",
     ["raibi", "lait fermente", "lben sucré"],
     200, 120, 190, 6, 22, 3, "equilibre"),
]

FIELDS = ("name_fr", "name_ar", "aliases", "portion_typique_g",
          "kcal_min", "kcal_max", "proteines_g", "glucides_g", "lipides_g",
          "verdict_typique")


def req(url, method="GET", data=None, token=None, timeout=60):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    existing = req(DIRECTUS + "/items/moroccan_dishes?fields=id,name_fr&limit=-1",
                   token=token)["data"]
    by_name = {(d.get("name_fr") or "").strip().lower(): d["id"] for d in existing}
    print("[info] " + str(len(existing)) + " plats deja en base, "
          + str(len(DISHES)) + " a synchroniser (apply=" + str(APPLY) + ")", flush=True)

    created = updated = fail = 0
    for row in DISHES:
        payload = dict(zip(FIELDS, row))
        payload["status"] = "published"
        key = payload["name_fr"].strip().lower()
        try:
            if key in by_name:
                if APPLY:
                    req(DIRECTUS + "/items/moroccan_dishes/" + str(by_name[key]),
                        "PATCH", payload, token=token, timeout=30)
                updated += 1
            else:
                if APPLY:
                    req(DIRECTUS + "/items/moroccan_dishes", "POST",
                        payload, token=token, timeout=30)
                created += 1
        except Exception as e:  # noqa: BLE001
            fail += 1
            print("  [err] " + payload["name_fr"] + " : " + str(e)[:90], flush=True)

    print("[done] crees=" + str(created) + " mis_a_jour=" + str(updated)
          + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
