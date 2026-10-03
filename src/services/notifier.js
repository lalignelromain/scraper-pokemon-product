const sendStockAlert = async (merchantName, url, productName, topic, status) => {
    if (!topic) return;

    const isDispo = (status === "IN_STOCK");
    
    // Formatage dynamique selon l'état
    const title = isDispo ? `🟢 EN STOCK : ${merchantName}` : `🔴 RUPTURE : ${merchantName}`;
    const message = isDispo ? `${productName} est disponible !` : `${productName} n'est plus en stock.`;
    const priority = isDispo ? "4" : "3";
    const tags = isDispo ? "white_check_mark,partying_face" : "x,sob";

    try {
        await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: message,
            headers: {
                'Title': title,
                'Priority': priority,
                'Tags': tags,
                'Click': url
            }
        });
    } catch (error) {
        console.error(`Failed to send NTFY alert: ${error.message}`);
    }
};

module.exports = { sendStockAlert };
