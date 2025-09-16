class NumberwangGame {
    constructor() {
        this.gameState = {
            round: 1,
            currentPlayer: 1,
            scores: { 1: 0, 2: 0 },
            timer: 10,
            numbers: [],
            gameActive: false,
            gameOver: false,
            isWangernumb: false,
            wangernumbTimes: { 1: null, 2: null },
            wangernumbStartTime: null
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
            nextRound: document.getElementById('next-round'),
            newGame: document.getElementById('new-game'),
            gameOver: document.getElementById('game-over'),
            winnerText: document.getElementById('winner-text'),
            finalScore: document.getElementById('final-score')
        };
    }

    bindEvents() {
        this.elements.startGame.addEventListener('click', () => this.startGame());
        this.elements.nextRound.addEventListener('click', () => this.nextRound());
        this.elements.newGame.addEventListener('click', () => this.resetGame());
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

    playNumberwangSound() {
        if (!this.audioContext) return;
        
        // Create a cheerful "ding" sound for Numberwang
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const duration = 0.8;
        
        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.1);
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime + index * 0.1);
            gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + index * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.1 + duration);
            
            osc.start(this.audioContext.currentTime + index * 0.1);
            osc.stop(this.audioContext.currentTime + index * 0.1 + duration);
        });
    }

    playFailSound() {
        if (!this.audioContext) return;
        
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

    playWinSound() {
        if (!this.audioContext) return;
        
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
                button.className = 'number-btn';
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
        
        if (this.isNumberwang(number)) {
            this.numberwangHit();
        } else {
            // Wrong number, continue playing
            this.elements.announcer.textContent = `${number}... not Numberwang!`;
        }
    }

    numberwangHit() {
        // Play sound effect
        this.playNumberwangSound();
        
        if (this.gameState.isWangernumb) {
            // Record the time for Wangernumb
            const timeElapsed = Date.now() - this.gameState.wangernumbStartTime;
            this.gameState.wangernumbTimes[this.gameState.currentPlayer] = timeElapsed;
            
            this.elements.announcer.textContent = `That's Numberwang! Player ${this.gameState.currentPlayer}: ${(timeElapsed / 1000).toFixed(2)}s`;
            this.elements.announcer.classList.add('numberwang');
            
            setTimeout(() => {
                this.elements.announcer.classList.remove('numberwang');
                
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
            
            setTimeout(() => {
                this.elements.announcer.classList.remove('numberwang');
            }, 1500);
            
            this.endTurn();
        }
    }

    startTimer() {
        this.gameState.timer = 10;
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
                this.startPlayerTurn();
            }, 2000);
        } else {
            // End of round
            setTimeout(() => {
                this.endRound();
            }, 2000);
        }
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
            timer: 10,
            numbers: [],
            gameActive: false,
            gameOver: false,
            isWangernumb: false,
            wangernumbTimes: { 1: null, 2: null },
            wangernumbStartTime: null
        };
        
        this.stopTimer();
        this.updateScore();
        this.elements.round.textContent = 1;
        this.elements.currentPlayer.textContent = 1;
        this.elements.timer.textContent = 10;
        this.elements.announcer.textContent = "Welcome to Numberwang! Player 1, choose your numbers!";
        this.elements.numbersGrid.innerHTML = '';
        this.elements.gameOver.style.display = 'none';
        this.elements.startGame.style.display = 'inline-block';
        this.elements.nextRound.style.display = 'none';
        this.elements.newGame.style.display = 'none';
    }

    startGame() {
        this.elements.startGame.style.display = 'none';
        this.gameState.numbers = this.generateNumbers();
        this.displayNumbers();
        this.startPlayerTurn();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NumberwangGame();
});