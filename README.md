# 📦 Surveillance des Stocks de Jouets en Temps Réel

Un système de monitoring automatique et résilient développé en **Node.js**, exécuté via **GitHub Actions** et orchestré par **cron-job.org**. Il surveille la disponibilité de produits à forte demande (ex. coffrets Pokémon) sur plusieurs enseignes de jouets françaises et envoie des alertes mobiles instantanées avec liens d'achat directs.

---

## 🎯 Fonctionnalités clés

* **Surveillance multi-sites** : Inspection simultanée de plusieurs marchands avec des règles d'analyse HTML sur-mesure.
* **Notifications Push Direct-Click** : Réception d'alertes instantanées sur smartphone via **ntfy.sh** avec ouverture directe de la fiche produit au clic.
* **Distinction visuelle des alertes** : Séparation claire entre les alertes de stock (priorité haute) et les notifications de maintenance/panne technique (priorité basse).
* **Robustesse & Anti-Bot** : Rotation dynamique des signatures *User-Agent* et pauses aléatoires entre les requêtes pour limiter les risques de blocage d'IP.
* **Exécution 100 % Cloud** : Aucune infrastructure physique à maintenir (utilisation combinée des quotas gratuits de GitHub Actions, cron-job.org et ntfy).

---

## 🏪 Sites surveillés

* **Smyths Toys**
* **King Jouet**
* **JouéClub**

---

## 🏗️ Architecture & Stack Technique

┌─────────────────┐       ┌──────────────────────┐       ┌────────────────┐       ┌─────────────────┐
│  cron-job.org   │ ────> │  GitHub Actions API  │ ────> │   scraper.js   │ ────> │   ntfy.sh API   │
│ (Trigger / 5m)  │       │ (Runner Linux Cloud) │       │ (Node.js Fetch)│       │  (Push Mobile)  │
└─────────────────┘       └──────────────────────┘       └────────────────┘       └─────────────────┘

| Composant | Rôle |
| :--- | :--- |
| **Node.js (ES6+)** | Scripts d'extraction HTML (`fetch`), analyse conditionnelle et construction des payloads JSON. |
| **GitHub Actions** | Environnement d'exécution *serverless* hébergeant et exécutant le script à la demande. |
| **cron-job.org** | Webhook externe assurant un cadence exacte toutes les 5 minutes (plus précis que le cron GitHub natif). |
| **ntfy.sh** | Service de pub/sub HTTP permettant la livraison de notifications push sur Android / iOS / Web. |

---

## ⚡ Envoi des Notifications

Les alertes sont envoyées via l'API REST de `ntfy.sh` en format JSON structuré :

### 1. Notification de Stock Dispo (Priorité 4 - Haute)
* **Design** : Titre en majuscules avec émojis `📦` / `🎉` / `🛍️`.
* **Action** : Un appui sur la notification ouvre directement le lien du produit dans le navigateur mobile.

### 2. Notification d'Erreur Technique (Priorité 2 - Basse)
* **Design** : Badge de maintenance `🛠️` / `🔧` pour éviter toute confusion visuelle avec un retour en stock.
* **Comportement** : Pas de lien d'achat associé, prévient uniquement en cas de changement de structure HTML ou de blocage serveur (erreur HTTP 403, 500, etc.).

---

## 🛡️ Stratégie Anti-Scraping

Pour garantir la pérennité du service sans subir de ban d'IP :

1. **User-Agent Rotation** : Injection aléatoire d'en-têtes HTTP simulant des navigateurs récents (Chrome, Safari, Firefox, Edge sous Windows et macOS).
2. **Human-like Delays** : Ingestion d'une temporisation aléatoire variant entre 2 000 ms et 5 000 ms (`Math.random()`) entre chaque requête marchand.
3. **HTTP Headers** : Simulation complète d'en-têtes de navigation standard (`Accept`, `Accept-Language`).

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
