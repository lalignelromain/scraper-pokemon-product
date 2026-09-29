
# 📦 Surveillance des Stocks de Jouets en Temps Réel (Édition Playwright 🚀)

Un système de monitoring automatique, furtif et ultra-résilient développé en **Node.js**, exécuté via **GitHub Actions** et orchestré par **cron-job.org**.

Initialement conçu pour traquer l'insaisissable **Coffret Dresseur d'Élite (ETB) Pokémon 30ème Anniversaire**, ce scraper surveille la disponibilité de produits à très forte demande sur 12 enseignes françaises. Il contourne les sécurités anti-bots complexes et envoie des alertes mobiles instantanées via **ntfy.sh**.

---

## 🎯 Fonctionnalités clés

* **Navigation Furtive (Headless)** : Utilisation de **Playwright** pour émuler un véritable navigateur Chromium, permettant d'exécuter le JavaScript des pages et de traverser silencieusement les protections anti-bots (Cloudflare, Datadome).
* **Surveillance Multi-Sites Hautes Performances** : Inspection de 12 marchands différents en moins de 45 secondes. La file d'attente est priorisée : les sites les plus légers sont traités en premier pour garantir une alerte dans les secondes qui suivent le déclenchement.
* **Filtres Anti-Scalpers (Marketplace)** : Analyse conditionnelle du DOM refusant systématiquement les vendeurs tiers. Seuls les produits vendus au prix public par l'enseigne officielle déclenchent une alerte.
* **Éradication des Faux Positifs** : Combinaison de Playwright et Cheerio pour nettoyer le DOM (suppression des jetons CSRF invisibles) et cibler chirurgicalement le texte des boutons d'achat ou des grilles produits.
* **Notifications Push Direct-Click** : Réception d'alertes instantanées sur smartphone, avec ouverture de la fiche produit au moindre clic.
* **Bilan de Santé (Heartbeat)** : Envoi d'un rapport automatisé silencieux (priorité basse) à 8h00 et 18h00 confirmant le bon fonctionnement du serveur et résumant l'état des stocks.
* **Exécution 100 % Cloud & Gratuite** : Aucune infrastructure physique, aucun abonnement proxy. Utilisation optimisée des quotas gratuits de GitHub Actions, cron-job.org et ntfy.

---

## 🏪 Sites surveillés (Par ordre d'exécution)

Le script priorise les plateformes spécialisées (plus véloces) avant d'attaquer la grande distribution :

1. **Smyths Toys** (Vérification du bouton d'ajout au panier)
2. **JouéClub** (Validation via balise Schema.org)
3. **Micromania** (Validation mots-clés)
4. **Fnac** (Exclusion stricte des vendeurs Marketplace)
5. **Kairyu** (Filtre Shopify anti-réassort/épuisé)
6. **DestockTCG** (Filtre Shopify sur la grille de produits)
7. **Vcollect** (Validation stricte anti-faux positifs)
8. **King Jouet** (Exclusion des menus de navigation parasites)
9. **Cultura** (Filtre vendeur officiel)
10. **E.Leclerc** (Analyse du JSON-LD et du vendeur officiel)
11. **Auchan** (Filtre vendeur officiel)
12. **Carrefour** (Ciblage strict des titres de la grille pour ignorer les "produits de substitution")

---

## 🏗️ Architecture & Stack Technique

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  cron-job.org   │ ────>  │  GitHub Actions API  │ ────>  │ Playwright (JS) │ ────>  │   ntfy.sh API   │
│ (Trigger / 5m)  │        │ (Runner Ubuntu Cloud)│        │(Headless Chrome)│        │  (Push Mobile)  │
└─────────────────┘        └──────────────────────┘        └─────────────────┘        └─────────────────┘


```

| Composant | Rôle |
| --- | --- |
| **Node.js (ES2023)** | Logique métier, manipulation du DOM via `cheerio`, appels natifs `fetch()`. |
| **Playwright** | Navigateur Headless permettant d'imiter un comportement humain et de valider les défis JS. |
| **GitHub Actions** | Environnement d'exécution *serverless* hébergeant et lançant le script à la demande. |
| **cron-job.org** | Webhook externe assurant une cadence exacte de 5 minutes (plus fiable que le cron GitHub natif). |
| **ntfy.sh** | Service de pub/sub HTTP permettant la livraison de notifications push urgentes et silencieuses. |

---

## 🧠 Les Défis Techniques & Solutions (Post-Mortem)

Durant le développement, plusieurs obstacles majeurs liés à l'e-commerce moderne ont été traités :

### 1. Le Mur 403 (Datadome / Cloudflare)

* **Problème :** Les requêtes HTTP simples (`axios` ou `fetch` classiques) se faisaient bloquer instantanément (Erreur 403) par des enseignes comme E.Leclerc ou King Jouet, qui exigent la résolution d'un défi JavaScript. Les proxys payants (ScraperAPI) s'épuisaient en quelques heures.
* **Solution :** Migration vers **Playwright**. En lançant une véritable instance de Chromium configurée avec un *User-Agent* aléatoire, une taille de *Viewport* cohérente et des pauses humaines (`waitForTimeout`), le script est perçu comme un utilisateur légitime par les pare-feux, le tout gratuitement.

### 2. Le Bruit de Fond et les Faux Positifs de DOM

* **Problème :** Historiquement, le script hachait (MD5) le HTML brut pour détecter des changements de page. Cependant, les plateformes injectent des jetons de sécurité (CSRF) invisibles et aléatoires à chaque rechargement de page, provoquant de fausses alertes toutes les 5 minutes.
* **Solution :** Le script utilise désormais `cheerio` pour extraire **uniquement le texte visible** (`.text()`), et cible spécifiquement la classe HTML des boutons d'ajout au panier. L'empreinte MD5 reste strictement identique tant que le bouton indique "Rupture".

### 3. Les Pièges des Moteurs de Recherche (Shopify & Carrefour)

* **Problème :** Sur les boutiques spécialisées, rechercher "30 ans" renvoie souvent une page vide mais dont le titre dynamique indique "Résultats pour : 30 ans", trompant le scraper. Carrefour, de son côté, affiche des "produits de substitution" si le produit exact n'est pas trouvé.
* **Solution :** Isolation stricte. Sur les sites Shopify, le script ne lit que l'intérieur de la grille de résultats (`.product-grid`). De plus, des mots-clés d'exclusion (`temporairement indisponible`, `en réassort`, `sold out`) bloquent la validation, même si la page est trouvée.

---

## ⚡ Système de Notifications

Les alertes sont envoyées via l'API REST de `ntfy.sh` avec gestion des priorités :

### 🚨 Alerte de Stock (Priorité Haute)

* **Design** : Bannière prioritaire avec titre `Pokémon 30ème - En Stock !` et tags `🚨` / `📦`.
* **Action** : Un appui sur la notification ouvre directement le lien du produit dans le navigateur mobile.

### 💓 Bilan Heartbeat (Priorité Basse)

* **Design** : Notification silencieuse avec tag `🤖` envoyée uniquement à 8h et 18h.
* **Comportement** : Remonte un tableau de bord textuel indiquant l'état en temps réel des 12 sites, garantissant que le script ne s'est pas endormi sans déranger l'utilisateur.

---

## 🚀 Installation & Déploiement Local

### Prérequis

* Node.js (version 20 recommandée)
* Un compte GitHub
* L'application mobile **ntfy** sur iOS ou Android

### Cloner et tester localement

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-compte/votre-depot.git
cd votre-depot

# 2. Installer les dépendances (Cheerio & Playwright)
npm install cheerio playwright

# 3. Installer les binaires du navigateur Chromium
npx playwright install --with-deps chromium

# 4. Configurer les variables d'environnement
# Créer un fichier .env à la racine et ajouter :
# NTFY_TOPIC=votre_canal_secret_12345

# 5. Lancer une vérification manuelle
node scraper.js


```

---

## 🚧 Roadmap & Améliorations futures

* **Refactoring du code :** Une restructuration du code est prévue prochainement pour optimiser la logique, modulariser les fonctions de scraping et faciliter l'ajout de nouveaux sites marchands.
