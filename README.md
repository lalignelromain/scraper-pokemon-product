# 📦 Automation - Surveillance des Stocks de Jouets

Script Node.js exécuté via **GitHub Actions** pour vérifier la disponibilité de produits en temps réel sur plusieurs enseignes françaises.

## 🏪 Sites surveillés
* **Smyths Toys**
* **King Jouet**
* **JouéClub**

## ⚡ Fonctionnement
1. Un workflow GitHub Actions se déclenche toutes les 5 minutes (`cron`).
2. Le script `scraper.js` interroge les URL cibles et analyse le code HTML.
3. Si un produit est détecté en stock, une notification push prioritaire est envoyée via **ntfy.sh**.

## 📱 Notifications
Les alertes sont envoyées sur le canal `ntfy.sh` configuré dans `scraper.js` et reçues directement sur smartphone via l'application **ntfy**.
