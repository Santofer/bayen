"""Légendes des posts Bayen par réseau (Instagram, Facebook, LinkedIn, stories), partagées par la page de revue
(lot.py) et l'export ContentStudio (export.py). 5 hashtags au plus sur Instagram."""
TAGS = {'presentation': '#AppMaroc #ConsommerMieux', 'annonce': '#NouveauLook #ConsommerMieux', 'action': '#AppMaroc #ConsommerMieux', 'jeu': '#VraiOuFaux #ConsommerMieux',
        'communaute': '#Communaute #ConsommerMieux', 'astuce': '#Etiquette #ConsommerMieux', 'mission': '#ConsommerMieux #ProduitsMarocains',
        'cercle': '#ProduitsMarocains #ConsommerMieux', 'sante': '#JourneeMondialeDuDiabete #ConsommerMieux',
        'partenariat': '#Partenariat #MarquesMarocaines', 'app': '#AppMaroc #ConsommerMieux', 'saison': '#Hiver #ConsommerMieux', 'fete': ''}
TAGS_AR = {'presentation': '#تطبيق #استهلاك_واعي', 'astuce': '#نصائح #استهلاك_واعي', 'action': '#تطبيق #استهلاك_واعي', 'jeu': '#صحيح_ولا_غالط #استهلاك_واعي',
           'communaute': '#مساهمة #المجتمع', 'mission': '#استهلاك_واعي #منتوجات_مغربية', 'journee': '#اليوم_العالمي_للغة_العربية #الدارجة',
           'partenariat': '#شراكة #منتوجات_مغربية'}
FETES = {'fete-unite': '#FeteDeLUnite', 'marche-verte': '#MarcheVerte', 'independance': '#FeteDeLIndependance',
         'nouvel-an': '#BonneAnnee2027', 'manifeste': '#11Janvier', 'yennayer': '#Yennayer #Asggas2977'}
def suivi(url, source, slug):
    """Lien mesurable dans Umami : le réseau d'où vient la visite et le post qui l'a amenée."""
    return f"{url}{'&' if '?' in url else '?'}utm_source={source}&utm_medium=social&utm_campaign={slug}"


def legendes(p):
    slug, ar, fete = p['id'][11:], p.get('lang') == 'ar', p['rubrique'] == 'fete'
    base = '#باين #المغرب #Bayen ' if ar else '#Bayen #Maroc '
    tags = (base + (FETES.get(slug, '') if fete else (TAGS_AR if ar else TAGS)[p['rubrique']])).split()
    bio, lien = ('👈 الرابط فالبيو', '👈 ') if ar else ('👉 Lien en bio', '👉 ')
    return {'instagram': p['legende'] + ('' if fete else f'\n\n{bio}') + '\n\n' + ' '.join(tags[:5]),
            'facebook': p['legende'] + ('' if fete else f'\n\n{lien}{suivi(p.get("lien", "https://bayen.ma"), "facebook", slug)}') + '\n\n' + ' '.join(tags[:4]),
            'alt': '. '.join(s.rstrip('. ') for s in (p['kicker'], p['titre'], p.get('texte', '')) if s) + '.',
            'langue': 'ary' if ar else 'fr'}


# LinkedIn : posts en français hors jeux (public professionnel : marques, partenaires, presse)
def linkedin(p):
    if p.get('lang') == 'ar' or p['rubrique'] == 'jeu': return None
    slug, fete = p['id'][11:], p['rubrique'] == 'fete'
    tags = ('#Bayen #Maroc ' + (FETES.get(slug, '') if fete else TAGS[p['rubrique']])).split()
    return p['legende'] + ('' if fete else f'\n\n{suivi(p.get("lien", "https://bayen.ma"), "linkedin", slug)}') + '\n\n' + ' '.join(tags[:4])
