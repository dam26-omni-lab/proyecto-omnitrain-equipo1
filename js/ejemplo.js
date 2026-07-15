// =====================================================================
// LÓGICA DE PHASER - SIMULADOR DE EXTINTOR AVANZADO
// =====================================================================
class SimulatorScene extends Phaser.Scene {
    constructor() { super('SimulatorScene'); this.fuegoSaludMaxima = 1000; this.fuegoSalud = this.fuegoSaludMaxima; this.estadoPaso = 1; this.isShooting = false; this.lastMouseX = 0; this.sweepVelocity = 0; }
    
    preload() {
        // Generación procedimental de assets de fuego (sin necesidad de imágenes locales)
        let g = this.add.graphics();
        g.fillGradientStyle(0xffffff, 0xffeebb, 0xffdd88, 0xffcc00, 1); g.fillCircle(16, 16, 16); g.generateTexture('fireCore', 32, 32); g.clear();
        g.fillStyle(0xff4400, 0.8); g.fillCircle(24, 24, 24); g.generateTexture('fireGlow', 48, 48); g.clear();
        g.fillStyle(0x333333, 0.5); g.fillCircle(32, 32, 32); g.generateTexture('smoke', 64, 64); g.clear();
        g.fillStyle(0xffffff, 0.9); g.fillCircle(10, 10, 10); g.fillStyle(0xdddddd, 0.6); g.fillCircle(10, 10, 15); g.generateTexture('foam', 30, 30); g.clear();
    }

    create() {
        const width = this.cameras.main.width; const height = this.cameras.main.height;
        
        // Entorno
        let bg = this.add.graphics(); bg.fillGradientStyle(0x1a202c, 0x1a202c, 0x0f172a, 0x0f172a, 1); bg.fillRect(0, 0, width, height);
        let floorHeight = 120; bg.fillStyle(0x334155, 1); bg.fillRect(0, height - floorHeight, width, floorHeight);
        
        // Fuego
        this.fuegoX = width * 0.3; this.fuegoY = height - 120;
        this.fuegoBaseHitbox = this.physics.add.staticSprite(this.fuegoX, this.fuegoY, null).setSize(240, 60).setVisible(false);
        
        this.smokeEmitter = this.add.particles(this.fuegoX, this.fuegoY - 50, 'smoke', { speed: { min: 20, max: 100 }, angle: { min: 250, max: 290 }, scale: { start: 1, end: 4 }, alpha: { start: 0.5, end: 0 }, lifespan: 3000, gravityY: -100 });
        this.glowEmitter = this.add.particles(this.fuegoX, this.fuegoY, 'fireGlow', { speed: { min: 50, max: 150 }, angle: { min: 240, max: 300 }, scale: { start: 1.5, end: 0 }, blendMode: 'ADD', lifespan: 1000, gravityY: -150 });
        this.coreEmitter = this.add.particles(this.fuegoX, this.fuegoY + 20, 'fireCore', { speed: { min: 10, max: 80 }, angle: { min: 250, max: 290 }, scale: { start: 1.2, end: 0 }, blendMode: 'ADD', lifespan: 600, gravityY: -50 });

        // Extintor
        this.extintorX = width * 0.8; this.extintorY = height - 150;
        let ex = this.extintorX; let ey = this.extintorY; let g = this.add.graphics();
        g.fillStyle(0x000000, 0.5); g.fillEllipse(ex, ey + 10, 140, 40);
        g.fillStyle(0x990000); g.fillRoundedRect(ex - 45, ey - 220, 90, 220, 10);
        g.fillStyle(0x333333); g.fillRect(ex - 15, ey - 250, 30, 30);
        this.manijaSuperior = this.add.rectangle(ex - 40, ey - 285, 40, 10, 0x222222).setOrigin(0, 0);

        // Seguro
        this.pinX = ex - 10; this.pinY = ey - 262;
        this.pin = this.add.circle(this.pinX, this.pinY, 12, 0xeab308).setStrokeStyle(3, 0xb45309).setInteractive({ useHandCursor: true });
        this.pin.on('pointerdown', () => { if(this.estadoPaso === 1) this.pullPin(); });

        this.hoseBaseX = ex + 20; this.hoseBaseY = ey - 240;
        this.hoseGraphics = this.add.graphics(); this.drawHose(this.hoseBaseX, this.hoseBaseY + 150);

        this.foamGroup = this.physics.add.group();
        this.physics.add.overlap(this.foamGroup, this.fuegoBaseHitbox, this.handleFireHit, null, this);

        this.shootEmitter = this.add.particles(0, 0, 'foam', { speed: { min: 600, max: 900 }, angle: { min: -10, max: 10 }, scale: { start: 0.5, end: 4 }, alpha: { start: 1, end: 0 }, lifespan: 800, gravityY: 150, frequency: -1 });

        this.input.on('pointerdown', this.startShooting, this);
        this.input.on('pointerup', this.stopShooting, this);
        this.input.on('pointermove', this.updatePointer, this);
        this.crosshair = document.getElementById('crosshair');
    }

    pullPin() {
        this.pin.destroy(); this.estadoPaso = 2; this.updateUI();
        this.crosshair.style.display = 'block'; this.input.setDefaultCursor('none');
    }

    updatePointer(pointer) {
        if(this.estadoPaso >= 2) {
            this.crosshair.style.left = pointer.event.clientX + 'px'; this.crosshair.style.top = pointer.event.clientY + 'px';
            if(this.isShooting) {
                let deltaX = Math.abs(pointer.x - this.lastMouseX);
                this.sweepVelocity = (this.sweepVelocity * 0.8) + (deltaX * 0.2);
                if(this.sweepVelocity > 5 && this.estadoPaso === 3) { this.estadoPaso = 4; this.updateUI(); }
            }
        }
        this.lastMouseX = pointer.x;
    }

    drawHose(targetX, targetY) {
        this.hoseGraphics.clear(); this.hoseGraphics.lineStyle(16, 0x111111);
        let curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(this.hoseBaseX, this.hoseBaseY), new Phaser.Math.Vector2(this.hoseBaseX, this.hoseBaseY + 200), new Phaser.Math.Vector2(targetX, targetY));
        curve.draw(this.hoseGraphics);
        let angle = Phaser.Math.Angle.Between(this.hoseBaseX, this.hoseBaseY + 200, targetX, targetY);
        this.boquillaPuntaX = targetX + Math.cos(angle)*35; this.boquillaPuntaY = targetY + Math.sin(angle)*35; this.boquillaAngulo = angle;
    }

    startShooting(pointer) {
        if (this.estadoPaso === 1) return;
        if (this.fuegoSalud <= 0) return;
        this.isShooting = true; this.shootEmitter.start(); this.tweens.add({ targets: this.manijaSuperior, angle: 10, duration: 100 });
        if(this.estadoPaso === 2) { this.estadoPaso = 3; this.updateUI(); }
    }

    stopShooting() { this.isShooting = false; this.shootEmitter.stop(); this.sweepVelocity = 0; if(this.manijaSuperior) this.tweens.add({ targets: this.manijaSuperior, angle: 0, duration: 100 }); }

    update(time, delta) {
        if (this.estadoPaso >= 2) {
            let pointer = this.input.activePointer;
            this.drawHose(Math.min(pointer.x, this.extintorX - 50), pointer.y);
            if(this.isShooting) {
                this.shootEmitter.setPosition(this.boquillaPuntaX, this.boquillaPuntaY);
                if(time % 3 === 0) {
                    let bullet = this.foamGroup.create(this.boquillaPuntaX, this.boquillaPuntaY, null).setVisible(false).setSize(30, 30);
                    this.physics.velocityFromRotation(this.boquillaAngulo + Phaser.Math.FloatBetween(-0.1, 0.1), 800, bullet.body.velocity);
                    bullet.body.setGravityY(200); this.time.delayedCall(800, () => { if(bullet) bullet.destroy(); });
                }
            }
        }
    }

    handleFireHit(bullet, fireBase) {
        bullet.destroy(); if (this.fuegoSalud <= 0) return;
        this.fuegoSalud -= (this.estadoPaso === 4 && this.sweepVelocity > 3) ? 5 : 0.6;
        let percentage = Math.max(0, (this.fuegoSalud / this.fuegoSaludMaxima) * 100);
        document.getElementById('fire-hp-bar').style.width = percentage + '%'; document.getElementById('fire-hp-text').innerText = Math.floor(percentage) + '%';
        
        let scaleFactor = (this.fuegoSalud / this.fuegoSaludMaxima);
        this.coreEmitter.setScale({ start: 1.2 * scaleFactor, end: 0 }); this.glowEmitter.setScale({ start: 1.5 * scaleFactor, end: 0 });
        this.smokeEmitter.setScale({ start: scaleFactor, end: 4 * scaleFactor });
        if (this.fuegoSalud <= 0) this.winGame();
    }

    updateUI() {
        for(let i=1; i<=4; i++) {
            let li = document.getElementById('step-' + i);
            li.className = (i === this.estadoPaso) ? "step-active flex items-center gap-3" : (i < this.estadoPaso) ? "step-completed flex items-center gap-3" : "step-pending flex items-center gap-3";
            if(i < this.estadoPaso) li.querySelector('.step-num').innerHTML = '✓';
        }
    }

    winGame() {
        this.stopShooting(); this.coreEmitter.stop(); this.glowEmitter.stop();
        this.smokeEmitter.setTexture('smoke').setTint(0xffffff).setAlpha({ start: 0.8, end: 0 });
        this.crosshair.style.display = 'none'; this.input.setDefaultCursor('default');
        document.getElementById('victory-screen').style.opacity = '1';
        document.getElementById('victory-screen').style.pointerEvents = 'auto';
    }
}

// Inicialización de Phaser
const config = { type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, parent: 'sim-game-container', transparent: true, physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }, scene: SimulatorScene };
const game = new Phaser.Game(config);

window.addEventListener('resize', () => { game.scale.resize(window.innerWidth, window.innerHeight); });


// =====================================================================
// LÓGICA DEL CUESTIONARIO Y MÉTRICAS
// =====================================================================
const questions = [
    { q: "¿Qué significa la 'T' inicial del método T.A.A.B.?", options: ["Tirar del seguro", "Tapar el fuego", "Transferir la manguera"], answer: 0 },
    { q: "¿Hacia qué parte del fuego debes Apuntar (la primera 'A')?", options: ["A la parte más alta de las llamas", "A la base del fuego", "Al centro del humo"], answer: 1 },
    { q: "La segunda 'A' corresponde a Apretad el gatillo. ¿Qué debes hacer?", options: ["Presionar de a toques cortos", "Mantener presionado firmemente", "Apretar solo si el fuego es pequeño"], answer: 1 },
    { q: "¿Qué significa 'Barrer' en el método T.A.A.B.?", options: ["Mover la manguera de lado a lado", "Limpiar los residuos después", "Caminar hacia atrás"], answer: 0 },
    { q: "¿Por qué es importante el movimiento de barrido?", options: ["Para gastar menos polvo", "Para enfriar el ambiente", "Para cubrir toda la superficie del combustible"], answer: 2 }
];

let currentQ = 0;
let score = 0;

document.getElementById('btn-start-quiz').addEventListener('click', () => {
    document.getElementById('victory-screen').style.opacity = '0';
    document.getElementById('sim-ui-layer').style.display = 'none'; // Ocultar UI del juego
    
    const quizOverlay = document.getElementById('quiz-overlay');
    quizOverlay.style.display = 'flex';
    setTimeout(() => quizOverlay.style.opacity = '1', 50);
    
    loadQuestion();
});

function loadQuestion() {
    if(currentQ >= questions.length) { showResults(); return; }
    
    document.getElementById('quiz-counter').innerText = `Pregunta ${currentQ + 1} de ${questions.length}`;
    document.getElementById('question-text').innerText = questions[currentQ].q;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    questions[currentQ].options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.innerText = opt;
        btn.onclick = () => selectAnswer(index, btn);
        container.appendChild(btn);
    });
}

function selectAnswer(selectedIndex, btnElement) {
    const buttons = document.querySelectorAll('.quiz-option');
    buttons.forEach(b => b.style.pointerEvents = 'none');

    const correctIndex = questions[currentQ].answer;
    
    if(selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        score += 20; 
    } else {
        btnElement.classList.add('incorrect');
        buttons[correctIndex].classList.add('correct'); 
    }

    setTimeout(() => {
        currentQ++;
        loadQuestion();
    }, 1500); 
}

function showResults() {
    document.getElementById('question-text').style.display = 'none';
    document.getElementById('options-container').style.display = 'none';
    document.getElementById('quiz-counter').style.display = 'none';
    
    const resultsDiv = document.getElementById('quiz-results');
    resultsDiv.style.display = 'block';
    document.getElementById('final-score').innerText = `${score}/100`;
}

function saveAndReturn() {
    let metrics = JSON.parse(localStorage.getItem('omniTrainMetrics')) || {
        scenariosCompleted: 0,
        moduleProgress: 0,
        bestScore: 0
    };

    if(metrics.scenariosCompleted < 3) {
        metrics.scenariosCompleted += 1;
    }
    
    metrics.moduleProgress = Math.min(100, metrics.scenariosCompleted * 33);
    
    if(score > metrics.bestScore) {
        metrics.bestScore = score;
    }

    localStorage.setItem('omniTrainMetrics', JSON.stringify(metrics));
    window.location.href = 'index2d.html'; // Asegúrate de que esta ruta apunte a tu dashboard
}