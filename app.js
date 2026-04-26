const screens = {
    login: document.getElementById('login-screen'),
    menu: document.getElementById('menu-screen'),
    hud: document.getElementById('gameplay-hud')
};

const audioPlayer = document.getElementById('audio-player');
const bgVideo = document.getElementById('bg-video');
const bgImage = document.getElementById('bg-image');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'LOGIN'; // LOGIN, MENU, GAMEPLAY
let username = 'Player';
let selectedSong = 0; // 0 = oceans game st, 1 = oceans game st v2
let currentDifficulty = 'med';

const difficulties = {
    'easy': { approachRate: 2.5, circleSize: 70 },
    'med':  { approachRate: 1.5, circleSize: 50 },
    'hard': { approachRate: 0.8, circleSize: 35 }
};

let rawBeatmap = [];
let activeNotes = [];
let beatmapIndex = 0;

let score = 0;
let combo = 0;

let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let mouseJustClicked = false;

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const welcomeText = document.getElementById('welcome-text');
const songItems = document.querySelectorAll('.song-item');
const diffBtns = document.querySelectorAll('.diff-btn');
const listenBtn = document.getElementById('listen-btn');
const playBtn = document.getElementById('play-btn');
const quitBtn = document.getElementById('quit-btn');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');

// Beatmap Generator
function generateBeatmap(songIndex) {
    const map = [];
    let time = 1.0;
    const interval = songIndex === 0 ? 0.8 : 0.4;
    
    for (let i = 0; i < 200; i++) {
        let n = {
            type: (i % 4 === 0) ? 'SLIDER' : 'CIRCLE',
            spawnTime: time,
            x: 200 + (i % 5) * 120,
            y: 150 + (i % 3) * 120
        };
        
        if (n.type === 'SLIDER') {
            let targetX = n.x + 200;
            let targetY = n.y + 100;
            if (targetX > 900) targetX -= 400;
            if (targetY > 600) targetY -= 300;
            
            n.endX = targetX;
            n.endY = targetY;
            n.sliderDuration = 0.8;
        }
        
        map.push(n);
        time += interval;
    }
    return map;
}

// Media Control
function loadSong(index) {
    audioPlayer.src = index === 0 ? 'oceans game st.mp3' : 'oceans game st v2.mp3';
    audioPlayer.load();
    if (index === 0) {
        bgVideo.currentTime = 0;
    } else {
        bgVideo.classList.remove('playing');
        setTimeout(() => bgVideo.pause(), 1500); // Wait for fade out before pausing
    }
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    if (usernameInput.value.trim() !== '') {
        username = usernameInput.value.trim();
    }
    welcomeText.innerText = `Welcome, ${username}!`;
    screens.login.classList.add('hidden');
    screens.menu.classList.remove('hidden');
    gameState = 'MENU';
    loadSong(selectedSong);
});

songItems.forEach(item => {
    item.addEventListener('click', (e) => {
        songItems.forEach(s => s.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedSong = parseInt(e.target.getAttribute('data-song'));
        
        audioPlayer.pause();
        listenBtn.innerText = 'LISTEN';
        loadSong(selectedSong);
    });
});

diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        diffBtns.forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentDifficulty = e.target.getAttribute('data-diff');
    });
});

listenBtn.addEventListener('click', () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
        if (selectedSong === 0) {
            bgVideo.currentTime = 0; // Ensure it starts from the beginning
            bgVideo.play();
            bgVideo.classList.add('playing');
        }
        listenBtn.innerText = 'STOP';
    } else {
        audioPlayer.pause();
        if (selectedSong === 0) {
            bgVideo.classList.remove('playing');
            setTimeout(() => { if(audioPlayer.paused) bgVideo.pause(); }, 1500);
        }
        listenBtn.innerText = 'LISTEN';
    }
});

playBtn.addEventListener('click', () => {
    screens.menu.classList.add('hidden');
    screens.hud.classList.remove('hidden');
    
    // Init Game
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    if (selectedSong === 0) {
        bgVideo.currentTime = 0;
        bgVideo.play();
        bgVideo.classList.add('playing');
    }
    
    rawBeatmap = generateBeatmap(selectedSong);
    activeNotes = [];
    beatmapIndex = 0;
    score = 0;
    combo = 0;
    
    gameState = 'GAMEPLAY';
});

quitBtn.addEventListener('click', () => {
    audioPlayer.pause();
    bgVideo.classList.remove('playing');
    setTimeout(() => { if(gameState === 'MENU' && audioPlayer.paused) bgVideo.pause(); }, 1500);
    screens.hud.classList.add('hidden');
    screens.menu.classList.remove('hidden');
    listenBtn.innerText = 'LISTEN';
    gameState = 'MENU';
});

// Canvas Mouse Events
// Need to scale mouse coordinates because canvas is resized by CSS
function updateMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (evt.clientX - rect.left) * scaleX;
    mouseY = (evt.clientY - rect.top) * scaleY;
}

window.addEventListener('mousemove', updateMousePos);
window.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        updateMousePos(e);
        isMouseDown = true;
        mouseJustClicked = true;
    }
});
window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// Game Loop
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function drawCircle(x, y, radius, color, strokeColor, strokeWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (color) {
        ctx.fillStyle = color;
        ctx.fill();
    }
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    if (gameState !== 'GAMEPLAY') {
        // Clear canvas if not playing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mouseJustClicked = false;
        return;
    }
    
    const diff = difficulties[currentDifficulty];
    const timePlayed = audioPlayer.currentTime;
    
    // Check end of song
    if (audioPlayer.ended) {
        quitBtn.click();
        return;
    }

    // Spawn notes
    while (beatmapIndex < rawBeatmap.length) {
        let note = rawBeatmap[beatmapIndex];
        let spawnT = note.spawnTime - diff.approachRate;
        if (timePlayed >= spawnT) {
            activeNotes.push({
                ...note,
                isApproach: true,
                isSliderActive: false,
                markedForDelete: false
            });
            beatmapIndex++;
        } else {
            break;
        }
    }

    // Update Notes
    for (let i = 0; i < activeNotes.length; i++) {
        let note = activeNotes[i];
        if (note.markedForDelete) continue;

        if (note.isApproach) {
            if (timePlayed >= note.spawnTime + 0.2) {
                // Missed
                note.markedForDelete = true;
                combo = 0;
            } else if (mouseJustClicked) {
                if (distance(mouseX, mouseY, note.x, note.y) <= diff.circleSize) {
                    // Hit!
                    if (note.type === 'CIRCLE') {
                        score += 300;
                        combo++;
                        note.markedForDelete = true;
                        mouseJustClicked = false; // consume click
                    } else if (note.type === 'SLIDER') {
                        // wait until it's exactly time to start sliding so we don't jump ahead
                        if (timePlayed >= note.spawnTime - 0.1) {
                            note.isApproach = false;
                            note.isSliderActive = true;
                            mouseJustClicked = false;
                        }
                    }
                }
            }
        } else if (note.isSliderActive) {
            let progress = (timePlayed - note.spawnTime) / note.sliderDuration;
            
            // Cap progress at 0 so it doesn't calculate negative paths if hit slightly early
            if (progress < 0) progress = 0;

            if (progress >= 1.0) {
                // Finished
                score += 500;
                combo++;
                note.markedForDelete = true;
            } else if (!isMouseDown) {
                // Let go early
                combo = 0;
                note.markedForDelete = true;
            } else {
                let ballX = lerp(note.x, note.endX, progress);
                let ballY = lerp(note.y, note.endY, progress);
                
                // Very forgiving hit radius for sliding
                if (distance(mouseX, mouseY, ballX, ballY) > diff.circleSize * 3.5) {
                    combo = 0;
                    note.markedForDelete = true;
                } else {
                    score += 5; // Points for holding
                }
            }
        }
    }
    
    mouseJustClicked = false; // reset for next frame

    // Cleanup
    activeNotes = activeNotes.filter(n => !n.markedForDelete);

    // Update HUD
    scoreDisplay.innerText = score.toString().padStart(8, '0');
    comboDisplay.innerText = 'x' + combo;

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw slider paths first
    activeNotes.forEach(note => {
        if (note.type === 'SLIDER' && (note.isApproach || note.isSliderActive)) {
            // Draw thick line
            ctx.beginPath();
            ctx.moveTo(note.x, note.y);
            ctx.lineTo(note.endX, note.endY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = diff.circleSize * 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Draw inner path
            ctx.beginPath();
            ctx.moveTo(note.x, note.y);
            ctx.lineTo(note.endX, note.endY);
            ctx.strokeStyle = 'rgba(135, 206, 235, 0.5)';
            ctx.lineWidth = diff.circleSize * 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    });

    // Draw notes
    activeNotes.forEach(note => {
        if (note.isApproach) {
            // Inner circle
            drawCircle(note.x, note.y, diff.circleSize, '#00bfff', '#fff', 3);
            
            // Approach circle
            let timeAlive = timePlayed - (note.spawnTime - diff.approachRate);
            let approachRad = diff.circleSize + (150 - diff.circleSize) * (1.0 - (timeAlive / diff.approachRate));
            if (approachRad < diff.circleSize) approachRad = diff.circleSize;
            
            drawCircle(note.x, note.y, approachRad, null, 'white', 3);
            
        } else if (note.isSliderActive) {
            let progress = Math.max(0, (timePlayed - note.spawnTime) / note.sliderDuration);
            let ballX = lerp(note.x, note.endX, progress);
            let ballY = lerp(note.y, note.endY, progress);
            
            // Slider ball
            drawCircle(ballX, ballY, diff.circleSize, 'orange', 'red', 4);
        }
    });
}

// Start Loop
requestAnimationFrame(gameLoop);
