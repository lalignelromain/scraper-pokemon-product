# 📦 Surveillance des Stocks de Jouets en Temps Réel

Un système de monitoring automatique et résilient développé en **Node.js**, exécuté via **GitHub Actions** et orchestré par **cron-job.org**. Il surveille la disponibilité de produits à forte demande (ex. coffrets Pokémon) sur plusieurs enseignes de jouets françaises et envoie des alertes mobiles instantanées avec liens d'achat directs.

---

## 🎯 Fonctionnalités clés

* **Surveillance multi-sites** : Inspection simultanée de plusieurs marchands avec des règles d'analyse HTML et JSON sur-mesure.
* **Notifications Push Direct-Click** : Réception d'alertes instantanées sur smartphone via **ntfy.sh** avec ouverture directe de la fiche produit au clic.
* **Distinction visuelle des alertes** : Séparation claire entre les alertes de stock (priorité haute) et les notifications de maintenance/panne technique (priorité basse).
* **Robustesse & Anti-Bot** : Rotation dynamique des signatures *User-Agent*, utilisation d'un proxy (**ScraperAPI**) avec gestion de *retry* automatique en cas de blocage, en-têtes HTTP de navigation complets et pauses aléatoires entre les requêtes.
* **Exécution 100 % Cloud** : Aucune infrastructure physique à maintenir (utilisation combinée des quotas gratuits de GitHub Actions, cron-job.org et ntfy).

---

## 🏪 Sites surveillés

* **Smyths Toys**
* **King Jouet**
* **JouéClub**
* **Leclerc**

---

## 🏗️ Architecture & Stack Technique


┌─────────────────┐        ┌──────────────────────┐        ┌────────────────┐        ┌─────────────────┐
│   cron-job.org  │ ────>  │  GitHub Actions API  │ ────>  │   scraper.js   │ ────>  │   ntfy.sh API   │
│ (Trigger / 5m)  │        │ (Runner Linux Cloud) │        │ (Node.js Fetch)│        │  (Push Mobile)  │
└─────────────────┘        └──────────────────────┘        └────────────────┘        └─────────────────┘

| Composant | Rôle |
| :--- | :--- |
| **Node.js (ES6+)** | Scripts d'extraction HTML (`fetch`), analyse conditionnelle et construction des payloads JSON. |
| **GitHub Actions** | Environnement d'exécution *serverless* hébergeant et exécutant le script à la demande. |
| **cron-job.org** | Webhook externe assurant une cadence exacte toutes les 5 minutes (plus précis que le cron GitHub natif). |
| **ntfy.sh** | Service de pub/sub HTTP permettant la livraison de notifications push sur Android / iOS / Web. |

---

## ⚡ Envoi des Notifications

Les alertes sont envoyées via l'API REST de `ntfy.sh` au format JSON structuré :

### 1. Notification de Stock Dispo (Priorité 4 - Haute)
* **Design** : Titre en majuscules avec émojis `📦` / `🎉` / `🛍️`.
* **Action** : Un appui sur la notification ouvre directement le lien du produit dans le navigateur mobile.

### 2. Notification d'Erreur Technique (Priorité 2 - Basse)
* **Design** : Badge de maintenance `🛠️` / `🔧` pour éviter toute confusion visuelle avec un retour en stock.
* **Comportement** : Pas de lien d'achat associé, prévient uniquement en cas de changement de structure HTML ou de blocage serveur (erreur HTTP 403, 500, etc.).

---

## 🛡️ Stratégie Anti-Scraping & Empreinte HTTP

Pour garantir la pérennité du service sans subir de ban d'IP :

1. **Proxy & Retry Automatique** : Routage via ScraperAPI avec un système de relance intelligent (2 tentatives maximum avec pause de 4 secondes et nouvelle IP en cas de code HTTP 403).
2. **User-Agent Rotation** : Injection aléatoire d'en-têtes HTTP simulant des navigateurs récents (Chrome, Safari, Firefox, Edge sous Windows et macOS).
3. **Browser Headers Full-Set** : Emulation complète d'empreinte client via les en-têtes `Sec-CH-UA`, `Sec-Fetch-*` (`mode`, `site`, `dest`) et `Referer` pour contourner les filtrages type Cloudflare/Datadome (résolution des erreurs HTTP 403).
4. **Human-like Delays** : Ingestion d'une temporisation aléatoire variant entre 2 000 ms et 5 000 ms (`Math.random()`) entre chaque requête marchand.
5. **Encoding Standardization** : Normalisation UTF-8 et assainissement des identifiants marchands (ex. `JOUECLUB`) pour éliminer la corruption de caractères dans les flux de notification push.

---

## 🚀 Installation & Déploiement Local

### Prérequis
* Node.js (version 18 ou supérieure)
* Un compte GitHub
* L'application mobile **ntfy** sur iOS ou Android

### Cloner et tester localement
```bash
# 1. Cloner le dépôt
git clone [https://github.com/votre-compte/votre-depot.git](https://github.com/votre-compte/votre-depot.git)
cd votre-depot

# 2. Exécuter le script
node scraper.js
