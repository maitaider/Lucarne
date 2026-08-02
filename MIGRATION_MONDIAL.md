# MIGRATION → mondial.lucarne.ca (Phase 0)

*Préparé par Cowork (Claude) le 2026-08-02, branche `phase-0-mondial`. Le code de cette branche
change uniquement les valeurs PAR DÉFAUT du domaine (l'app lit `NEXT_PUBLIC_SITE_URL` /
`NEXT_PUBLIC_APP_URL` en production — rien ne change tant que les variables Vercel ne changent pas).*

## Ordre exact de la bascule (jour du lancement du nouveau site — ~20 min)

**Avant tout : sauvegarde.** Supabase → projet de l'app pronos → Database → Backups →
télécharger un export daté.

1. **Merger cette branche** : `git switch main && git merge phase-0-mondial && git push`
   (déclenche un déploiement — inoffensif, les env vars priment).
2. **Vercel — projet `lucarne` (l'app pronos)** :
   - Settings → Domains → **Add** `mondial.lucarne.ca` (Vercel affiche l'enregistrement DNS à créer).
   - Settings → Environment Variables → mettre `NEXT_PUBLIC_SITE_URL` et `NEXT_PUBLIC_APP_URL`
     à `https://mondial.lucarne.ca` (Production + Preview) → **Redeploy**.
3. **DNS (chez ton registraire)** :
   - Ajouter le CNAME `mondial` → `cname.vercel-dns.com` (ou la valeur exacte affichée par Vercel).
   - NE PAS toucher encore à `lucarne.ca` / `www`.
4. **Vérifier** : `https://mondial.lucarne.ca` répond, connexion utilisateur OK.
5. **Stripe (de l'app pronos)** : Dashboard → Developers → Webhooks → modifier l'endpoint
   vers `https://mondial.lucarne.ca/api/...` (même chemin qu'actuel) ; faire un paiement test.
6. **Basculer la racine** :
   - Vercel projet `lucarne` : Settings → Domains → **Remove** `lucarne.ca` et `www.lucarne.ca`.
   - Vercel projet `lucarne-site` (le nouveau site) : Settings → Domains → **Add** `lucarne.ca`
     et `www.lucarne.ca` ; suivre les instructions DNS affichées (A record / CNAME).
   - Mettre `NEXT_PUBLIC_SITE_URL=https://lucarne.ca` sur le projet `lucarne-site` → Redeploy.
7. **Redirections 301** : la liste des anciennes URLs indexées (site:lucarne.ca dans Google)
   est à coller dans le tableau 301 de `next.config.ts` du NOUVEAU site (P8 l'a préparé) —
   anciens chemins → `https://mondial.lucarne.ca/...`.
8. **Vérifications finales** :
   - `https://lucarne.ca` = le site conseil ; `https://mondial.lucarne.ca` = l'app pronos.
   - LinkedIn Post Inspector + Facebook Debugger sur `lucarne.ca` → zéro visuel soccer.
   - Un courriel de l'app pronos (rappel/mention) part encore correctement.

## Rollback
Refaire l'étape 6 à l'envers (les domaines se rattachent en ~1 min ; le DNS du CNAME `mondial`
peut rester en place en permanence).

## Notes
- L'app pronos garde sa base Supabase et son Stripe actuels — aucune donnée déplacée.
- `noreply@lucarne.ca` (Resend) continue de fonctionner : le domaine d'envoi ne change pas.
- Valeur résiduelle : l'app revit pour l'Euro 2028 / CDM 2030 sur `mondial.lucarne.ca`.
