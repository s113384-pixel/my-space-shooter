const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const finalScoreDisplay = document.getElementById('final-score');
const gameOverMenu = document.getElementById('game-over-menu');
const restartButton = document.getElementById('restart-button');

// Game settings
canvas.width = 800;
canvas.height = 600;

let score = 0;
let highScore = 0;
let gameOver = false;
let animationId;
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// --- CLASSES ---

class Player { /* Player class is unchanged */ constructor(x,y,radius,color){this.x=x;this.y=y;this.radius=radius;this.color=color;this.speed=4;this.angle=0}draw(){ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);ctx.beginPath();ctx.moveTo(0,0-this.radius);ctx.lineTo(0-this.radius/1.5,0+this.radius/2);ctx.lineTo(0+this.radius/1.5,0+this.radius/2);ctx.closePath();ctx.fillStyle=this.color;ctx.fill();ctx.strokeStyle='#00ffff';ctx.lineWidth=2;ctx.stroke();ctx.restore()}update(){const dx=mouse.x-this.x;const dy=mouse.y-this.y;const distance=Math.hypot(dx,dy);this.angle=Math.atan2(dy,dx)+Math.PI/2;if(distance>this.speed){this.x+=(dx/distance)*this.speed;this.y+=(dy/distance)*this.speed}this.draw();if(this.x-this.radius<0)this.x=this.radius;if(this.x+this.radius>canvas.width)this.x=canvas.width-this.radius;if(this.y-this.radius<0)this.y=this.radius;if(this.y+this.radius>canvas.height)this.y=canvas.height-this.radius}}
class Projectile { /* Projectile class is unchanged */ constructor(x,y,radius,color,velocity){this.x=x;this.y=y;this.radius=radius;this.color=color;this.velocity=velocity}draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2,!1);ctx.fillStyle=this.color;ctx.fill()}update(){this.draw();this.x+=this.velocity.x;this.y+=this.velocity.y}}

// MODIFIED: Enemy class now includes a scoreValue
class Enemy {
    constructor(x, y, radius, color, velocity, scoreValue) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.scoreValue = scoreValue; // NEW: How many points this enemy is worth
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}


// --- GAME FUNCTIONS ---
let player; let projectiles = []; let enemies = []; let enemySpawnInterval;

function init() { /* init function is mostly unchanged */ score=0;gameOver=!1;projectiles=[];enemies=[];highScore=localStorage.getItem('geminiShooterHighScore')||0;currentScoreEl.innerText=score;highScoreEl.innerText=highScore;gameOverMenu.classList.add('hidden');const playerX=canvas.width/2;const playerY=canvas.height/2;player=new Player(playerX,playerY,20,'#1a1a2e');if(enemySpawnInterval)clearInterval(enemySpawnInterval);enemySpawnInterval=setInterval(spawnEnemies,1000);if(animationId)cancelAnimationFrame(animationId);animate()}

// MODIFIED: This is the biggest change. We now spawn different enemy types.
function spawnEnemies() {
    if (gameOver) return;

    let radius, color, speed, scoreValue;
    const rand = Math.random(); // Random number between 0 and 1

    // 70% chance to spawn a large, slow enemy worth few points
    if (rand < 0.7) { 
        radius = 30;
        color = 'hsl(240, 50%, 60%)'; // Blue-ish
        speed = 1.5;
        scoreValue = 10;
    } 
    // 25% chance to spawn a medium, faster enemy worth more points
    else if (rand < 0.95) { 
        radius = 20;
        color = 'hsl(60, 50%, 60%)'; // Yellow-ish
        speed = 2;
        scoreValue = 25;
    } 
    // 5% chance to spawn a small, very fast enemy worth many points
    else { 
        radius = 10;
        color = 'hsl(0, 80%, 60%)'; // Red-ish
        speed = 2.8;
        scoreValue = 50;
    }

    // Determine spawn location from edges (same as before)
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    // Calculate velocity towards player
    const angle = Math.atan2(player.y - y, player.x - x);
    const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    
    // Create the new enemy with its specific properties
    enemies.push(new Enemy(x, y, radius, color, velocity, scoreValue));
}

// MODIFIED: updateScore now accepts a 'points' argument
function updateScore(points) {
    score += points;
    currentScoreEl.innerText = score;
}

function animate() {
    if (gameOver) return;
    animationId = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(15, 15, 31, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    player.update();
    
    projectiles.forEach((projectile, pIndex) => { /* Unchanged */ projectile.update();if(projectile.x+projectile.radius<0||projectile.x-projectile.radius>canvas.width||projectile.y+projectile.radius<0||projectile.y-projectile.radius>canvas.height){setTimeout(()=>{projectiles.splice(pIndex,1)},0)}});
    
    enemies.forEach((enemy, eIndex) => {
        enemy.update();
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer - enemy.radius - player.radius < 1) {
            endGame();
        }
        projectiles.forEach((projectile, pIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (dist - enemy.radius - projectile.radius < 1) {
                // MODIFIED: Pass the enemy's specific score value to the update function
                updateScore(enemy.scoreValue); 
                
                setTimeout(() => {
                    // Make sure the correct enemy and projectile are removed
                    if (enemies[eIndex]) enemies.splice(eIndex, 1);
                    if (projectiles[pIndex]) projectiles.splice(pIndex, 1);
                }, 0);
            }
        });
    });
}

function endGame() { /* endGame function is mostly unchanged */ gameOver=!0;cancelAnimationFrame(animationId);clearInterval(enemySpawnInterval);if(score>highScore){highScore=score;localStorage.setItem('geminiShooterHighScore',highScore);highScoreEl.innerText=highScore}finalScoreDisplay.innerText=score;gameOverMenu.classList.remove('hidden')}

// --- EVENT LISTENERS ---
// (Event listeners are unchanged)
window.addEventListener('mousemove', (event) => { const rect = canvas.getBoundingClientRect(); mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top; });
window.addEventListener('click', (event) => { if (gameOver) return; const projectileSpeed = 6; const velocity = { x: Math.sin(player.angle) * projectileSpeed, y: -Math.cos(player.angle) * projectileSpeed }; const noseX = player.x + Math.sin(player.angle) * player.radius; const noseY = player.y - Math.cos(player.angle) * player.radius; projectiles.push(new Projectile(noseX, noseY, 5, 'white', velocity)); });
canvas.addEventListener('mousedown', (event) => { event.preventDefault(); });
restartButton.addEventListener('click', () => { init(); });


// Start game
init();
