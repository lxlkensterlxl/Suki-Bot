document.addEventListener("DOMContentLoaded", () => {
    // Create element container
    const walker = document.createElement("div");
    walker.id = "suki-walker";
    
    // REPAIR: Updated to a relative repository path. 
    // Adjust "assets/suki.png" to match where your image is actually stored in your repo.
    walker.innerHTML = `<img src="assets/suki.png" alt="Suki Avatar">`;
    document.body.appendChild(walker);

    // Create speech bubble
    const speech = document.createElement("div");
    speech.id = "suki-speech";
    speech.innerHTML = "Nya! Systems online, Senpai!";
    document.body.appendChild(speech);

    let posX = window.innerWidth - 150;
    let posY = window.innerHeight - 150;
    walker.style.left = posX + "px";
    walker.style.top = posY + "px";
    speech.style.left = posX + "px";
    speech.style.bottom = (window.innerHeight - posY + 10) + "px";

    const quotes = [
        "Nya! Systems online, Senpai!",
        "Shall we breach the datastream?",
        "Kitsune-tactical uplink active.",
        "Scanning commits... Looking clean!"
    ];

    let currentScale = 1; // Track facing direction (1 or -1)

    function showSpeech(text) {
        speech.innerText = text;
        speech.style.opacity = "1";
        speech.style.left = walker.style.left;
        speech.style.top = (parseInt(walker.style.top) - 45) + "px";
        setTimeout(() => {
            speech.style.opacity = "0";
        }, 3500);
    }

    // Autonomous Walking / Gliding Loop
    function moveSuki() {
        const nextX = Math.random() * (window.innerWidth - 120);
        const nextY = Math.random() * (window.innerHeight - 120);

        // REPAIR: Safely track horizontal flip direction without losing transform state
        if (nextX < posX) {
            currentScale = -1;
        } else {
            currentScale = 1;
        }

        walker.style.transform = `scaleX(${currentScale})`;
        walker.style.transition = "all 3s cubic-bezier(0.25, 1, 0.5, 1)";
        walker.style.left = nextX + "px";
        walker.style.top = nextY + "px";

        posX = nextX;
        posY = nextY;

        // Random chance to say something while moving
        if (Math.random() > 0.6) {
            setTimeout(() => {
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                showSpeech(randomQuote);
            }, 1000);
        }
    }

    // Trigger movement every 8 seconds
    setInterval(moveSuki, 8000);

    // Click reaction
    walker.addEventListener("click", () => {
        showSpeech("Direct kitsune-tactical uplink engaged!");
        
        // REPAIR: Clean popup scaling that preserves the horizontal flip state
        walker.style.transform = `scaleX(${currentScale}) scale(1.15)`;
        setTimeout(() => {
            walker.style.transform = `scaleX(${currentScale}) scale(1)`;
        }, 200);
    });
});
