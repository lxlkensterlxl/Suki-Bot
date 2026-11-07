function handleSukiResponse(userMessage) {
    let replyText = "";
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes("change voice") || lowerMsg.includes("voice")) {
        replyText = "Yay! How do I sound now, Netrunner? Better?";
    } else if (lowerMsg.includes("mini-story") || lowerMsg.includes("story")) {
        replyText = "Rain slicked Sector 9's neon streets as we bypassed the security node. Orb ready, I whispered as the grid unlocked!";
    } else {
        replyText = "Link confirmed! Ready for your next command, Netrunner!";
    }

    // Trigger the voice output
    speakAsSuki(replyText);

    return replyText;
}
