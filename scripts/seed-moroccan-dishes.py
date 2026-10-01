#!/usr/bin/env python3
"""
C21 — Référentiel des plats (collection `moroccan_dishes`) : cuisine marocaine
et plats courants au Maroc (tacos, pizza, pâtes…), pour caler les estimations.

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
    # ── Marocains ajoutés (oct. 2026) ──────────────────────────────────
    ("Couscous au poisson", "كسكس بالحوت",
     ["couscous poisson", "seksu bel hout"], 450, 450, 650, 30, 72, 12, "equilibre"),
    ("Couscous à la viande", "كسكس باللحم",
     ["couscous agneau", "couscous boeuf", "seksu bel lham", "couscous bidaoui"], 450, 600, 850, 32, 75, 26, "equilibre"),
    ("Tajine de poulet au citron confit", "طاجين الدجاج بالحامض",
     ["djaj mhamer", "poulet citron confit", "tajine poulet citron"], 350, 380, 560, 32, 10, 26, "equilibre"),
    ("Tajine de poulet aux pommes de terre", "طاجين الدجاج بالبطاطس",
     ["tajine batata", "tajine poulet frites", "tajine poulet pomme de terre"], 380, 420, 600, 30, 35, 22, "equilibre"),
    ("Kalia", "قلية",
     ["kaliya", "kalia de viande", "abats tomate"], 300, 400, 600, 30, 10, 32, "a_limiter"),
    ("Lham mhammer", "لحم محمر",
     ["viande rotie marocaine", "mhammer"], 300, 550, 750, 45, 6, 45, "a_limiter"),
    ("Brochettes de poulet", "قطبان الدجاج",
     ["qotban djaj", "brochette poulet", "brochettes dinde"], 250, 350, 480, 45, 4, 18, "sain"),
    ("Merguez grillées", "مرقاز",
     ["merguez", "saucisses merguez"], 200, 500, 650, 28, 3, 44, "occasionnel"),
    ("Friture de poisson", "حوت مقلي",
     ["poisson frit", "friture mixte", "hout mqli"], 300, 450, 650, 40, 18, 32, "a_limiter"),
    ("Calamars frits", "كلمار مقلي",
     ["calamars", "rings calamar"], 250, 450, 600, 30, 30, 26, "occasionnel"),
    ("Crevettes pil-pil", "قمرون بيل بيل",
     ["pil pil", "crevettes ail piment"], 250, 300, 450, 30, 6, 24, "equilibre"),
    ("Bkoula", "بقولة",
     ["mauves", "bakoula", "beqoula"], 250, 150, 260, 5, 14, 12, "sain"),
    ("Dchicha", "دشيشة",
     ["soupe d'orge", "hssoua", "belboula", "tchicha"], 300, 150, 240, 6, 32, 5, "sain"),
    ("Escargots en bouillon", "غلالة",
     ["babbouche", "ghlala", "escargots"], 250, 150, 250, 20, 8, 5, "sain"),
    ("Salades cuites marocaines", "شلاضة",
     ["salade de carottes", "salade de betteraves", "salade marocaine cuite"], 200, 100, 180, 2, 16, 8, "sain"),
    ("Batbout farci", "بطبوط معمر",
     ["batbout thon", "batbout kefta", "batbout garni"], 220, 420, 600, 24, 52, 16, "equilibre"),
    ("Rghaif farci", "رغايف معمرين",
     ["msemen farci", "rghaif kefta", "msemen viande hachee"], 180, 480, 650, 18, 50, 26, "occasionnel"),
    ("Sandwich kefta", "صاندويتش الكفتة",
     ["kefta sandwich", "sandwich viande hachee frites"], 300, 600, 850, 30, 65, 30, "a_limiter"),
    ("Sandwich au thon", "صاندويتش الطون",
     ["bocadillo thon", "sandwich thon"], 280, 450, 650, 24, 58, 18, "equilibre"),
    ("Sfenj", "سفنج",
     ["beignet marocain", "sfinj"], 100, 300, 420, 6, 40, 16, "occasionnel"),
    ("Krachel", "كراشل",
     ["brioche anis", "petit pain sucre marocain"], 80, 250, 320, 6, 42, 8, "a_limiter"),
    ("Fekkas", "فقاص",
     ["biscuits amande", "fekkas amande"], 60, 250, 300, 6, 36, 10, "a_limiter"),
    ("Mhancha", "محنشة",
     ["serpent aux amandes", "m'hancha"], 80, 330, 420, 7, 40, 18, "occasionnel"),
    ("Briouates au miel", "بريوات بالعسل",
     ["briouates amande", "briouat sucre"], 80, 300, 400, 6, 38, 18, "occasionnel"),
    ("Amlou", "أملو",
     ["amlou tartine", "pate amandes argan miel"], 50, 280, 330, 8, 12, 26, "a_limiter"),
    ("Jus d'orange pressé", "عصير الليمون",
     ["jus orange", "aseer limoun"], 250, 100, 130, 2, 25, 0, "equilibre"),
    ("Panaché", "باناشي",
     ["jus panache", "jus mixte fruits lait", "panachi"], 300, 200, 320, 6, 40, 4, "a_limiter"),
    ("Lben", "لبن",
     ["lait fermente", "leben"], 250, 100, 150, 8, 12, 4, "sain"),

    # ── Plats courants au Maroc (hors cuisine marocaine) ───────────────
    ("Tacos (french tacos)", "طاكوس",
     ["tacos", "french tacos", "tacos poulet", "tacos viande hachee"], 450, 900, 1300, 45, 100, 50, "occasionnel"),
    ("Pizza", "بيتزا",
     ["pizza margherita", "pizza thon", "pizza viande"], 300, 700, 900, 30, 90, 28, "a_limiter"),
    ("Hamburger", "برغر",
     ["burger", "cheeseburger"], 220, 500, 700, 28, 45, 28, "a_limiter"),
    ("Frites", "فريت",
     ["frites", "pommes frites"], 150, 400, 480, 5, 50, 22, "occasionnel"),
    ("Shawarma", "شاورما",
     ["chawarma", "kebab", "sandwich shawarma"], 350, 600, 850, 35, 65, 28, "a_limiter"),
    ("Panini", "بانيني",
     ["panini poulet", "panini thon"], 250, 550, 750, 28, 60, 26, "a_limiter"),
    ("Poulet frit (fast-food)", "دجاج مقلي",
     ["poulet pane", "chicken fried", "poulet croustillant"], 300, 750, 950, 50, 30, 50, "occasionnel"),
    ("Nuggets de poulet", "ناجيتس",
     ["nuggets", "croquettes de poulet"], 150, 400, 480, 22, 25, 25, "occasionnel"),
    ("Steak frites", "ستيك بالفريت",
     ["steak", "entrecote frites"], 450, 900, 1100, 45, 60, 55, "occasionnel"),
    ("Pâtes à la bolognaise", "معكرونة بولونيز",
     ["spaghetti bolognaise", "pates sauce viande"], 400, 550, 750, 28, 80, 18, "equilibre"),
    ("Pâtes carbonara", "معكرونة كاربونارا",
     ["carbonara", "pates creme"], 400, 700, 950, 28, 80, 38, "a_limiter"),
    ("Lasagnes", "لازانيا",
     ["lasagne"], 350, 500, 700, 30, 40, 30, "a_limiter"),
    ("Riz et poulet", "رز بالدجاج",
     ["assiette riz poulet", "riz blanc poulet"], 400, 500, 700, 38, 70, 14, "equilibre"),
    ("Salade composée au poulet", "سلاطة بالدجاج",
     ["salade poulet", "salade composee"], 350, 300, 500, 28, 18, 22, "sain"),
    ("Salade César", "سلاطة سيزار",
     ["cesar", "caesar salad"], 350, 450, 650, 30, 20, 38, "a_limiter"),
    ("Poisson grillé et légumes", "حوت مشوي بالخضر",
     ["poisson grille", "filet de poisson legumes"], 400, 350, 500, 40, 20, 16, "sain"),
    ("Soupe de légumes", "شوربة الخضر",
     ["veloute", "soupe legumes"], 300, 100, 180, 4, 18, 5, "sain"),
    ("Omelette", "عجة",
     ["omelette fromage", "oeufs brouilles"], 180, 280, 380, 20, 2, 24, "equilibre"),
    ("Sushis", "سوشي",
     ["sushi", "maki", "california roll"], 300, 450, 600, 20, 85, 8, "equilibre"),
    ("Bol de céréales au lait", "حبوب بالحليب",
     ["cereales lait", "corn flakes"], 300, 300, 400, 11, 55, 7, "equilibre"),
    ("Crêpe sucrée", "كريب",
     ["crepe nutella", "crepe chocolat"], 120, 350, 450, 7, 50, 16, "occasionnel"),
    ("Croissant", "كرواسون",
     ["croissant beurre"], 60, 230, 270, 5, 26, 13, "a_limiter"),
    ("Pain au chocolat", "بان أو شوكولا",
     ["chocolatine"], 70, 280, 320, 5, 32, 16, "a_limiter"),
    ("Pâtisserie à la crème", "حلوة بالكريمة",
     ["gateau", "part de gateau", "eclair", "millefeuille"], 120, 380, 480, 5, 48, 20, "occasionnel"),
    ("Glace", "ڭلاص",
     ["creme glacee", "glace deux boules"], 140, 250, 320, 4, 32, 14, "occasionnel"),
    ("Assiette de fruits frais", "طبسيل ديال الفواكه",
     ["fruits", "salade de fruits", "fruits frais"], 250, 120, 180, 2, 30, 1, "sain"),
    ("Yaourt aux fruits", "ياغورت بالفواكه",
     ["yaourt", "yogourt aromatise"], 125, 100, 140, 4, 18, 3, "equilibre"),
    ("Soda", "مشروب غازي",
     ["coca", "boisson gazeuse", "soda canette"], 330, 130, 145, 0, 35, 0, "occasionnel"),
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
