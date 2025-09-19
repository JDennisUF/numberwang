class NumberwangGame {
    constructor() {
        this.gameState = {
            round: 1,
            currentPlayer: 1,
            scores: { 1: 0, 2: 0 },
            timer: 8,
            numbers: [],
            gameActive: false,
            gameOver: false,
            isWangernumb: false,
            wangernumbTimes: { 1: null, 2: null },
            wangernumbStartTime: null,
            guaranteedNumberwangValue: null
        };
        
        this.timerInterval = null;
        this.initializeElements();
        this.bindEvents();
        this.createSounds();
    }

    initializeElements() {
        this.elements = {
            round: document.getElementById('round'),
            currentPlayer: document.getElementById('current-player'),
            timer: document.getElementById('timer'),
            score1: document.getElementById('score1'),
            score2: document.getElementById('score2'),
            announcer: document.getElementById('announcer'),
            numbersGrid: document.getElementById('numbers-grid'),
            startGame: document.getElementById('start-game'),
            player2Ready: document.getElementById('player2-ready'),
            nextRound: document.getElementById('next-round'),
            newGame: document.getElementById('new-game'),
            gameOver: document.getElementById('game-over'),
            winnerText: document.getElementById('winner-text'),
            finalScore: document.getElementById('final-score'),
            numberwangOverlay: document.getElementById('numberwang-overlay'),
            wangernumbOverlay: document.getElementById('wangernumb-overlay')
        };
    }

    bindEvents() {
        this.elements.startGame.addEventListener('click', () => this.startGame());
        this.elements.player2Ready.addEventListener('click', () => this.startPlayer2Turn());
        this.elements.nextRound.addEventListener('click', () => this.nextRound());
        this.elements.newGame.addEventListener('click', () => this.resetGame());

        // Dismiss Wangernumb overlay when clicking backdrop or pressing Escape
        const wOverlay = document.getElementById('wangernumb-overlay');
        if (wOverlay) {
            wOverlay.addEventListener('click', (e) => {
                // Only close if clicking the backdrop, not the image
                if (e.target === wOverlay) {
                    this.hideWangernumbOverlay();
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && wOverlay.classList.contains('show')) {
                    this.hideWangernumbOverlay();
                }
            });
        }
    }

    createSounds() {
        // Create audio context for generating sounds
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    ensureAudioReady() {
        if (!this.audioContext) return false;
        if (this.audioContext.state === 'suspended') {
            // Attempt to resume on user interaction
            this.audioContext.resume().catch(() => {});
        }
        return true;
    }

    playNumberwangSound() {
        if (!this.ensureAudioReady()) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Master limiter-like gain to avoid clipping but keep it loud
        const master = ctx.createGain();
        master.gain.value = 0.6; // turn up overall
        master.connect(ctx.destination);

        // Bright triad hit (C6, E6, G6) using detuned saws and a square accent
        const triad = [1046.5, 1318.5, 1568.0];
        triad.forEach((f, i) => {
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.5, now + 0.02 + i * 0.01);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.35 + i * 0.01);
            g.connect(master);

            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(f, now);
            osc1.detune.setValueAtTime(-8, now);
            osc1.connect(g);

            const osc2 = ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(f, now);
            osc2.detune.setValueAtTime(+8, now);
            osc2.connect(g);

            const osc3 = ctx.createOscillator();
            osc3.type = 'square';
            osc3.frequency.setValueAtTime(f * 2, now); // octave accent
            osc3.connect(g);

            osc1.start(now);
            osc2.start(now);
            osc3.start(now + 0.01);
            osc1.stop(now + 0.4);
            osc2.stop(now + 0.4);
            osc3.stop(now + 0.25);
        });

        // Short noise burst for extra "pop"
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // simple decay
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.015);
        noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(master);
        noise.start(now);
        noise.stop(now + 0.2);
    }

    playFailSound() {
        if (!this.ensureAudioReady()) return;
        
        // Create a "wrong" buzzer sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
        osc.type = 'sawtooth';
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    playThudSound() {
        if (!this.ensureAudioReady()) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        const osc = ctx.createOscillator();
        const lowpass = ctx.createBiquadFilter();

        // dull thud: low frequency sine with fast decay, lowpass to remove brightness
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);

        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(400, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playWinSound() {
        if (!this.ensureAudioReady()) return;
        
        // Create a triumphant fanfare
        const notes = [
            { freq: 523.25, start: 0.0 },    // C5
            { freq: 659.25, start: 0.2 },    // E5  
            { freq: 783.99, start: 0.4 },    // G5
            { freq: 1046.50, start: 0.6 }    // C6
        ];
        
        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(note.freq, this.audioContext.currentTime + note.start);
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime + note.start);
            gain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + note.start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.start + 0.5);
            
            osc.start(this.audioContext.currentTime + note.start);
            osc.stop(this.audioContext.currentTime + note.start + 0.5);
        });
    }

    generateNumbers() {
        const numbers = new Set(); // Use Set to prevent duplicates
        const specialNumbers = ['π', '√2', 'e', '∞', 'φ', '√3'];
        const usedSpecials = new Set();
        
        // Generate ~12 unique numbers
        while (numbers.size < 12) {
            if (Math.random() < 0.3 && usedSpecials.size < 3) {
                // Add special irrational numbers (ensure no duplicates)
                const availableSpecials = specialNumbers.filter(s => !usedSpecials.has(s));
                if (availableSpecials.length > 0) {
                    const special = availableSpecials[Math.floor(Math.random() * availableSpecials.length)];
                    numbers.add(special);
                    usedSpecials.add(special);
                }
            } else {
                // Generate regular numbers
                let newNumber;
                if (Math.random() < 0.6) {
                    // Integer
                    newNumber = Math.floor(Math.random() * 999) + 1;
                } else {
                    // Decimal
                    newNumber = (Math.random() * 999).toFixed(1);
                }
                numbers.add(newNumber);
            }
        }
        
        // Convert Set back to Array and shuffle
        return this.shuffleArray(Array.from(numbers));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    displayNumbers() {
        this.elements.numbersGrid.innerHTML = '';
        
        // Create a 12x8 grid (96 total cells)
        const cols = 12;
        const rows = 8;
        const totalCells = cols * rows;
        const numbersToPlace = this.gameState.numbers.length;
        
        // Simple random placement - one number per random position, no collisions
        const selectedPositions = [];
        const usedPositions = new Set();
        
        // For each number, pick a random position until we find an unused one
        for (let i = 0; i < numbersToPlace; i++) {
            let position;
            do {
                const randomRow = Math.floor(Math.random() * rows);
                const randomCol = Math.floor(Math.random() * cols);
                position = randomRow * cols + randomCol;
            } while (usedPositions.has(position));
            
            selectedPositions.push(position);
            usedPositions.add(position);
        }
        
        // Create a map of position to number
        const positionToNumber = new Map();
        for (let i = 0; i < numbersToPlace; i++) {
            positionToNumber.set(selectedPositions[i], this.gameState.numbers[i]);
        }
        
        // Create all grid cells
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            if (positionToNumber.has(i)) {
                // This cell gets a number
                const number = positionToNumber.get(i);
                
                const button = document.createElement('button');
                const colorClass = `color-${Math.floor(Math.random() * 8) + 1}`;
                button.className = `number-btn ${colorClass}`;
                button.textContent = number;
                button.addEventListener('click', () => this.numberClicked(number, button));
                cell.appendChild(button);
            } else {
                // This cell is empty
                cell.classList.add('empty');
            }
            
            this.elements.numbersGrid.appendChild(cell);
        }
    }

    isNumberwang(number) {
        // Always guarantee at least one Numberwang per screen
        if (this.gameState.guaranteedNumberwangValue !== null && number === this.gameState.guaranteedNumberwangValue) {
            return true;
        }
        // Convert number to string for analysis
        const numStr = number.toString();
        
        // Special irrational numbers have lower chance
        const specialNumbers = ['π', '√2', 'e', '∞', 'φ', '√3'];
        if (specialNumbers.includes(numStr)) {
            return Math.random() < 0.1; // 10% chance
        }
        
        // Numbers ending in 7 are guaranteed Numberwang
        if (numStr.endsWith('7')) {
            return true;
        }
        
        // Check if it's a prime number for slightly higher chance
        const num = parseFloat(number);
        if (Number.isInteger(num) && this.isPrime(num)) {
            return Math.random() < 0.3; // 30% chance for primes
        }
        
        // Base random chance
        return Math.random() < 0.2; // 20% base chance
    }

    isPrime(n) {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    }

    numberClicked(number, button) {
        if (!this.gameState.gameActive) return;
        
        button.classList.add('clicked');
        button.textContent = ''; // Clear the number text but keep the background color
        
        if (this.isNumberwang(number)) {
            this.numberwangHit();
        } else {
            // Wrong number, continue playing
            this.elements.announcer.textContent = `${number}... not Numberwang!`;
            this.playThudSound();
        }
    }

    numberwangHit() {
        // Play sound effect
        this.playNumberwangSound();
        this.showNumberwangOverlay();
        
        if (this.gameState.isWangernumb) {
            // Record the time for Wangernumb
            const timeElapsed = Date.now() - this.gameState.wangernumbStartTime;
            this.gameState.wangernumbTimes[this.gameState.currentPlayer] = timeElapsed;
            
            this.elements.announcer.textContent = `That's Numberwang! Player ${this.gameState.currentPlayer}: ${(timeElapsed / 1000).toFixed(2)}s`;
            this.elements.announcer.classList.add('numberwang');
            
            setTimeout(() => {
                this.elements.announcer.classList.remove('numberwang');
                this.hideNumberwangOverlay();
                
                if (this.gameState.currentPlayer === 1) {
                    // Start Player 2's turn
                    setTimeout(() => {
                        this.startWangernumbPlayer2();
                    }, 1000);
                } else {
                    // Both players done, determine winner
                    setTimeout(() => {
                        this.determineWangernumbWinner();
                    }, 1000);
                }
            }, 1500);
            
            this.gameState.gameActive = false;
            const buttons = document.querySelectorAll('.number-btn');
            buttons.forEach(btn => btn.disabled = true);
        } else {
            // Normal game
            this.gameState.scores[this.gameState.currentPlayer]++;
            this.updateScore();
            
            // Animate announcer
            this.elements.announcer.textContent = "That's Numberwang!";
            this.elements.announcer.classList.add('numberwang');
            this.showNumberwangOverlay();
            
            setTimeout(() => {
                this.elements.announcer.classList.remove('numberwang');
                this.hideNumberwangOverlay();
            }, 1500);
            
            this.endTurn();
        }
    }

    showNumberwangOverlay() {
        if (!this.elements.numberwangOverlay) return;
        this.elements.numberwangOverlay.classList.add('show');
    }

    hideNumberwangOverlay() {
        if (!this.elements.numberwangOverlay) return;
        this.elements.numberwangOverlay.classList.remove('show');
    }

    startTimer() {
        this.gameState.timer = 8;
        this.elements.timer.textContent = this.gameState.timer;
        
        this.timerInterval = setInterval(() => {
            this.gameState.timer--;
            this.elements.timer.textContent = this.gameState.timer;
            
            if (this.gameState.timer <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    timeUp() {
        this.stopTimer();
        this.playFailSound();
        this.elements.announcer.textContent = "Time's up! No points awarded.";
        this.endTurn();
    }

    endTurn() {
        this.gameState.gameActive = false;
        this.stopTimer();
        
        // Disable all number buttons
        const buttons = document.querySelectorAll('.number-btn');
        buttons.forEach(btn => btn.disabled = true);
        
        if (this.gameState.currentPlayer === 1) {
            this.gameState.currentPlayer = 2;
            setTimeout(() => {
                this.showPlayer2ReadyButton();
            }, 2000);
        } else {
            // End of round
            setTimeout(() => {
                this.endRound();
            }, 2000);
        }
    }

    showPlayer2ReadyButton() {
        this.elements.announcer.textContent = "Player 1's turn complete. Player 2, click when ready!";
        this.elements.player2Ready.style.display = 'inline-block';
    }

    startPlayer2Turn() {
        this.elements.player2Ready.style.display = 'none';
        
        // Generate completely new numbers for Player 2
        this.gameState.numbers = this.generateNumbers();
        this.guaranteeNumberwang();
        this.displayNumbers();
        
        this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.elements.currentPlayer.textContent = this.gameState.currentPlayer;
        this.elements.announcer.textContent = `Player ${this.gameState.currentPlayer}, choose your numbers!`;
        
        // Re-enable buttons
        const buttons = document.querySelectorAll('.number-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('clicked');
        });
        
        this.gameState.gameActive = true;
        this.startTimer();
    }

    endRound() {
        this.gameState.round++;
        this.elements.round.textContent = this.gameState.round;
        
        if (this.gameState.round > 3) {
            this.endGame();
        } else {
            this.elements.announcer.textContent = `Round ${this.gameState.round} begins!`;
            this.showNextRoundButton();
        }
    }

    showNextRoundButton() {
        this.elements.nextRound.style.display = 'inline-block';
        this.elements.startGame.style.display = 'none';
    }

    nextRound() {
        this.elements.nextRound.style.display = 'none';
        this.gameState.currentPlayer = 1;
        this.gameState.numbers = this.generateNumbers();
        this.guaranteeNumberwang();
        this.displayNumbers();
        this.startPlayerTurn();
    }

    endGame() {
        const score1 = this.gameState.scores[1];
        const score2 = this.gameState.scores[2];
        
        if (score1 === score2) {
            // Sudden death - Wangernumb!
            this.startWangernumb();
        } else {
            this.declareWinner();
        }
    }

    startWangernumb() {
        this.gameState.isWangernumb = true;
        this.gameState.wangernumbTimes = { 1: null, 2: null };
        this.elements.announcer.textContent = "It's a tie! Time for... WANGERNUMB! Player 1 goes first!";
        this.elements.round.textContent = "Wangernumb";
        this.gameState.currentPlayer = 1;
        this.gameState.numbers = this.generateNumbers();
        this.guaranteeNumberwang();
        this.displayNumbers();
        
        setTimeout(() => {
            this.startWangernumbPlayer1();
        }, 3000);
    }

    startWangernumbPlayer1() {
        this.elements.announcer.textContent = "Player 1: Find Numberwang as fast as you can!";
        this.elements.currentPlayer.textContent = "1";
        this.gameState.gameActive = true;
        this.gameState.wangernumbStartTime = Date.now();
        
        const buttons = document.querySelectorAll('.number-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('clicked');
        });
    }

    startWangernumbPlayer2() {
        this.elements.announcer.textContent = "Player 2: Beat Player 1's time!";
        this.elements.currentPlayer.textContent = "2";
        this.gameState.currentPlayer = 2;
        this.gameState.gameActive = true;
        this.gameState.wangernumbStartTime = Date.now();
        
        // Generate new numbers for player 2
        this.gameState.numbers = this.generateNumbers();
        this.guaranteeNumberwang();
        this.displayNumbers();
        
        const buttons = document.querySelectorAll('.number-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('clicked');
        });
    }

    determineWangernumbWinner() {
        const time1 = this.gameState.wangernumbTimes[1];
        const time2 = this.gameState.wangernumbTimes[2];
        
        let winner;
        let winnerTime;
        let loserTime;
        
        if (time1 < time2) {
            winner = 1;
            winnerTime = time1;
            loserTime = time2;
        } else {
            winner = 2;
            winnerTime = time2;
            loserTime = time1;
        }
        
    this.playWinSound();
        this.elements.winnerText.textContent = `Player ${winner} Wins Wangernumb!`;
        this.elements.finalScore.textContent = `Player ${winner}: ${(winnerTime / 1000).toFixed(2)}s vs Player ${winner === 1 ? 2 : 1}: ${(loserTime / 1000).toFixed(2)}s`;
        this.elements.gameOver.style.display = 'block';
        this.elements.newGame.style.display = 'inline-block';
        this.elements.announcer.textContent = `Player ${winner} found Numberwang fastest! That's Wangernumb!`;
        this.showWangernumbOverlay();
    }

    declareWinner() {
        const score1 = this.gameState.scores[1];
        const score2 = this.gameState.scores[2];
        const winner = score1 > score2 ? 1 : 2;
        
        this.playWinSound();
        this.elements.winnerText.textContent = `Player ${winner} Wins!`;
        this.elements.finalScore.textContent = `Final Score: Player 1: ${score1}, Player 2: ${score2}`;
        this.elements.gameOver.style.display = 'block';
        this.elements.newGame.style.display = 'inline-block';
        this.elements.announcer.textContent = `Congratulations Player ${winner}! That's Numberwang!`;
        // Do not show Wangernumb overlay for normal wins
    }

    updateScore() {
        this.elements.score1.textContent = this.gameState.scores[1];
        this.elements.score2.textContent = this.gameState.scores[2];
    }

    resetGame() {
        this.gameState = {
            round: 1,
            currentPlayer: 1,
            scores: { 1: 0, 2: 0 },
            timer: 8,
            numbers: [],
            gameActive: false,
            gameOver: false,
            isWangernumb: false,
            wangernumbTimes: { 1: null, 2: null },
            wangernumbStartTime: null,
            guaranteedNumberwangValue: null
        };
        
        this.stopTimer();
        this.updateScore();
        this.elements.round.textContent = 1;
        this.elements.currentPlayer.textContent = 1;
        this.elements.timer.textContent = 8;
        this.elements.announcer.textContent = "Welcome to Numberwang! Player 1, choose your numbers!";
        this.elements.numbersGrid.innerHTML = '';
        this.elements.gameOver.style.display = 'none';
        this.elements.startGame.style.display = 'inline-block';
        this.elements.player2Ready.style.display = 'none';
        this.elements.nextRound.style.display = 'none';
        this.elements.newGame.style.display = 'none';
        this.hideNumberwangOverlay();
        this.hideWangernumbOverlay();
    }

    startGame() {
        this.elements.startGame.style.display = 'none';
        this.gameState.numbers = this.generateNumbers();
        this.guaranteeNumberwang();
        this.displayNumbers();
        this.startPlayerTurn();
    }

    guaranteeNumberwang() {
        // Choose one of the displayed numbers to always be Numberwang
        const arr = this.gameState.numbers;
        if (Array.isArray(arr) && arr.length > 0) {
            const idx = Math.floor(Math.random() * arr.length);
            this.gameState.guaranteedNumberwangValue = arr[idx];
        } else {
            this.gameState.guaranteedNumberwangValue = null;
        }
    }

    showWangernumbOverlay() {
        if (!this.elements.wangernumbOverlay) return;
        this.elements.wangernumbOverlay.classList.add('show');
    }

    hideWangernumbOverlay() {
        if (!this.elements.wangernumbOverlay) return;
        this.elements.wangernumbOverlay.classList.remove('show');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NumberwangGame();
});