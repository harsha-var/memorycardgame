
window.addEventListener("DOMContentLoaded", () => {
    // --- Login logic ---
    const overlay = document.getElementById("login-overlay");
    const form = document.getElementById("login-form");
    const nameInput = document.getElementById("player-name");
    const ageInput = document.getElementById("player-age");
    const ageValue = document.getElementById("age-value");
    const errorDiv = document.getElementById("login-error");
    const muteBtn = document.getElementById('mute-btn');
    const exitBtn = document.getElementById('exit-game');
    const audioBgm = document.getElementById("audio-bgm");

    // Mute logic
    let isMuted = false;
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        document.querySelectorAll('audio').forEach(audio => {
            audio.muted = isMuted;
        });
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    // Exit game logic
    exitBtn.addEventListener('click', () => {
        localStorage.removeItem('memoryGameState');
        location.reload();
    });

    // Update displayed age when slider moves
    ageInput.addEventListener("input", () => {
        ageValue.textContent = ageInput.value;
    });

    // Prevent non-alphabetic input in name field
    nameInput.addEventListener("input", function () {
        if (!/^[A-Za-z\s]*$/.test(this.value)) {
            this.value = this.value.replace(/[^A-Za-z\s]/g, "");
            errorDiv.textContent = "Name must only contain letters (no numbers or special characters).";
            errorDiv.style.display = "block";
        } else {
            errorDiv.style.display = "none";
        }
    });

    // Login form submit handler (only one!)
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const name = nameInput.value.trim();
        const age = parseInt(ageInput.value, 10);

        // Name must only contain letters (no numbers or special characters)
        const nameIsValid = /^[A-Za-z\s]+$/.test(name);

        if (!nameIsValid) {
            errorDiv.textContent = "Name must only contain letters (no numbers or special characters).";
            errorDiv.style.display = "block";
            return;
        }

        if (age < 12) {
            errorDiv.textContent = "Your age should be above 12 to play this game.";
            errorDiv.style.display = "block";
            return;
        }

        overlay.style.display = "none";
        errorDiv.style.display = "none";
        window.playerName = name;
        window.playerAge = age;
        document.getElementById("display-player-name").textContent = name;
        document.getElementById("player-card").style.display = "block";

        // Start background music after login, handle promise
        audioBgm.volume = 0.3;
        audioBgm.play().catch(() => {
            // Optionally, show a message or ignore
            // User can click mute/unmute to trigger play again
        });
    });

    // --- Memory Game Logic ---
    const emojis = ["😀", "😀", "🎉", "🎉", "🚀", "🚀", "💡", "💡", "🐱", "🐱", "🌟", "🌟", "🏆", "🏆", "❤️", "❤️"];
    const gameBoard = document.getElementById("game-board");
    let firstCard = null, secondCard = null;
    let lockBoard = false;
    let moves = 0;

    function saveGameState() {
        const cards = Array.from(document.querySelectorAll('.card')).map(card => ({
            emoji: card.dataset.emoji,
            flipped: card.classList.contains('flipped')
        }));
        localStorage.setItem('memoryGameState', JSON.stringify({
            cards,
            moves
        }));
    }

    function loadGameState() {
        const state = JSON.parse(localStorage.getItem('memoryGameState'));
        if (!state || !state.cards) return false;
        gameBoard.innerHTML = '';
        state.cards.forEach(cardState => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.emoji = cardState.emoji;
            card.innerText = cardState.flipped ? cardState.emoji : '?';
            if (cardState.flipped) card.classList.add('flipped');
            card.addEventListener('click', () => flipCard(card));
            gameBoard.appendChild(card);
        });
        moves = state.moves || 0;
        return true;
    }

    function createCards() {
        let shuffled = [...emojis].sort(() => Math.random() - 0.5);
        gameBoard.innerHTML = '';
        shuffled.forEach((emoji) => {
            const card = document.createElement("div");
            card.classList.add("card");
            card.innerText = "?";
            card.dataset.emoji = emoji;
            card.addEventListener("click", () => flipCard(card));
            gameBoard.appendChild(card);
        });
        moves = 0;
        saveGameState();
    }

    function flipCard(card) {
        if (lockBoard || card === firstCard || card.classList.contains("flipped")) return;
        card.classList.add("flipped");
        card.innerText = card.dataset.emoji;
        playSound('audio-flip');

        if (!firstCard) {
            firstCard = card;
        } else {
            secondCard = card;
            moves++;
            checkMatch();
        }
        saveGameState();
    }

    function checkMatch() {
        lockBoard = true;
        if (firstCard.dataset.emoji === secondCard.dataset.emoji) {
            firstCard = null;
            secondCard = null;
            lockBoard = false;
            saveGameState();
        }
        if (document.querySelectorAll('.card.flipped').length === emojis.length) {
            // Game finished! Use moves as the score
            updateScoreboard(moves);
            // Optionally, clear game state so a new game starts on next visit
            // localStorage.removeItem('memoryGameState');
        }
        else if (secondCard) {
            setTimeout(() => {
                firstCard.classList.remove("flipped");
                secondCard.classList.remove("flipped");
                firstCard.innerText = "?";
                secondCard.innerText = "?";
                firstCard = null;
                secondCard = null;
                lockBoard = false;
                saveGameState();
            }, 1000);
        }
    }

    // On page load, restore game or start new
    if (!loadGameState()) {
        createCards();
    }
    updateScoreboard();
    
    // --- Scoreboard Logic ---
    function updateScoreboard(newScore) {
        let scores = JSON.parse(localStorage.getItem('highScores')) || [];
        // Add new score with player name if provided
        if (typeof newScore === 'number') {
            scores.push({
                name: window.playerName || "Player",
                moves: newScore
            });
        }
        // Sort by moves (lowest first)
        scores = scores.sort((a, b) => a.moves - b.moves).slice(0, 5);
        localStorage.setItem('highScores', JSON.stringify(scores));
    
        const scoreList = document.getElementById('score-list');
        if (!scoreList) return;
        scoreList.innerHTML = '';
        scores.forEach((score, idx) => {
            const li = document.createElement('li');
            li.textContent = `${score.name} - ${score.moves} moves`;
            if (idx === 0) li.classList.add('highest');
            scoreList.appendChild(li);
        });
    }

    // --- Sound Helper ---
    function playSound(id) {
        const audio = document.getElementById(id);
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    }
});
