function handleSukiResponse(userMessage) {
    // Sanitize input
    const cleanMsg = (userMessage || "").trim();
    if (!cleanMsg) return "";

    const lowerMsg = cleanMsg.toLowerCase();
    let replyText = "";

    // Expanded intent matching for SukiBot
    if (lowerMsg.includes("change voice") || lowerMsg.includes("voice")) {
        replyText = "Yay! How do I sound now, Netrunner? Better?";
    } else if (lowerMsg.includes("mini-story") || lowerMsg.includes("story")) {
        replyText = "Rain slicked Sector 9's neon streets as we bypassed the security node. Orb ready, I whispered as the grid unlocked!";
    } else if (lowerMsg.includes("status") || lowerMsg.includes("diagnostic")) {
        replyText = "All systems optimal. Neural link stable at 12ms latency, Netrunner!";
    } else if (lowerMsg.includes("help") || lowerMsg.includes("command")) {
        replyText = "Available commands: 'voice' to test audio, 'story' for a cyber-tale, or check system status!";
    } else {
        replyText = `Link confirmed for "${cleanMsg}"! Ready for your next command, Netrunner!`;
    }

    // Automatically append messages to your chat feed if it exists in the DOM
    const chatFeed = document.getElementById('chat-feed');
    if (chatFeed) {
        // Append user message
        chatFeed.innerHTML += `
            <div class="flex items-start gap-2 text-xs">
                <span class="font-mono text-cyan-400 font-bold">&gt;</span>
                <div class="text-slate-200 font-rajdhani leading-relaxed">${escapeHtml(cleanMsg)}</div>
            </div>`;
        
        // Append Suki's response
        chatFeed.innerHTML += `
            <div class="flex items-start gap-2 text-xs">
                <span class="font-mono text-pink-500 font-bold">&gt;</span>
                <div class="text-slate-300 font-rajdhani leading-relaxed">
                    <span class="text-pink-400 font-mono text-[10px] block">SUKI_AI</span>
                    ${escapeHtml(replyText)}
                </div>
            </div>`;
        
        chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    // Trigger the voice output / HUD trigger if defined
    if (typeof triggerSukiResponse === 'function') {
        triggerSukiResponse(replyText);
    } else if (typeof speakAsSuki === 'function') {
        speakAsSuki(replyText);
    }

    return replyText;
}

// Helper utility to prevent HTML injection vulnerabilities in chat logs
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
