# Lucarne — déploiement production

Guide de mise en prod : Supabase distant, Stripe (place à 20 $ CAD), hébergeur.
**Aucun secret n'est commité** — tout va dans les variables d'environnement.

## 0. Variables d'environnement

Copie `.env.local.example` → `.env.local` (local) et renseigne les mêmes
variables côté hébergeur (prod) :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → `service_role` (secret) |
| `NEXT_PUBLIC_APP_URL` | URL publique (ex. `https://lucarne.app`) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys (`pk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint (`whsec_...`) |
| `CRON_SECRET` | `openssl rand -hex 32` |

## 1. Supabase distant (projet `iqttcudmauyqmyewjlzf`)

> ⚠️ Reconstruit la base depuis zéro avec nos migrations. À lancer dans **ton**
> terminal (le mot de passe reste chez toi).

```bash
supabase login                                    # auth (navigateur)
supabase link --project-ref iqttcudmauyqmyewjlzf  # demande le mot de passe DB
supabase db push                                  # applique TOUTES les migrations
# Si le projet contient déjà des objets en conflit (remise à zéro totale) :
#   supabase db reset --linked        # ⚠️ EFFACE tout le contenu distant
pnpm db:types                                     # régénère les types (local)
```

Le mot de passe DB se (re)définit dans Supabase → Project Settings → Database.

## 2. Compte admin (à faire toi-même — jamais par l'agent)

1. Supabase → Authentication → Add user (email + mot de passe).
2. SQL Editor : `update public.profiles set role = 'super_admin' where id = '<user-id>';`
3. Connecte-toi → **Admin → Inviter des joueurs** : crée la **ligue maison**
   (tout nouveau joueur la rejoint) et génère le code d'invitation illimité.
4. **Admin → Réglages** : règle les dates du tournoi + les instructions de paiement.

## 3. Stripe — place à 20 $ CAD

Le code crée une **Checkout Session** programmatique (montant =
`app_settings.buy_in_amount_cents`, déjà 2000 = 20 $ CAD). Pas besoin du
Payment Link statique.

1. Mets `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test d'abord).
2. Stripe → Developers → **Webhooks** → Add endpoint :
   - URL : `https://<ton-domaine>/api/stripe/webhook`
   - Événements : `checkout.session.completed` (+ `charge.refunded` si besoin).
   - Copie le `whsec_...` → `STRIPE_WEBHOOK_SECRET`.
3. Test local du webhook : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Le flux : `Acheter ma place` → Checkout Stripe → paiement → webhook →
`real_payments` → `has_paid_buy_in()` débloque les pronos.

## 4. Hébergeur (ex. Vercel)

1. Importer le repo GitHub `maitaider/Lucarne`.
2. Coller toutes les variables du §0 (Production + Preview).
3. Build : `pnpm build` · Start : `pnpm start`.
4. Déployer, puis créer le webhook Stripe avec l'URL réelle (§3).

## 5. Sécurité — rotation de clé

La clé `service_role` **locale** a été commitée par erreur dans un commit
ancien (`scripts/seed-demo.sh`). Elle est *localhost-only* (risque faible),
mais régénère-la : `supabase` local → recrée l'instance, ou ignore (local).
La clé **distante** `service_role` n'a jamais été commitée.
