// =====================================================================
// LÓGICA DE PHASER Y UI/UX - SIMULADOR EXTINTOR CO₂ (T.A.A.B.) - PIXEL ART
// =====================================================================

// Dibuja un círculo "pixelado" (grilla de bloques) en vez de un círculo suave,
// para lograr una estética retro/pixel art en todas las texturas del juego.
function drawPixelCircle(g, cx, cy, radius, color, alpha, pixelSize) {
    pixelSize = pixelSize || 4;
    g.fillStyle(color, alpha === undefined ? 1 : alpha);
    for (let y = -radius; y <= radius; y += pixelSize) {
        for (let x = -radius; x <= radius; x += pixelSize) {
            if (x * x + y * y <= radius * radius) {
                g.fillRect(
                    Math.round((cx + x) / pixelSize) * pixelSize,
                    Math.round((cy + y) / pixelSize) * pixelSize,
                    pixelSize, pixelSize
                );
            }
        }
    }
}

class SimulatorSceneCO2 extends Phaser.Scene {
    constructor() {
        super('SimulatorSceneCO2');
        // ================= DIFICULTAD: NIVEL 2 (INTERMEDIO) =================
        // Más salud, regeneración más rápida, daño por segundo más bajo y
        // alcance efectivo mucho más corto que el PQS (fiel al comportamiento
        // real del CO₂, que se dispersa rápido en el aire): en conjunto, exige
        // apuntar con más precisión y sostener el chorro más tiempo y más de
        // cerca que en el Escenario 1.
        this.fuegoSaludMaxima = 340; // Antes 250 en el PQS: cuesta más apagarlo
        this.fuegoSalud = this.fuegoSaludMaxima;
        this.fuegoRegenPorSegundo = 70; // Antes 45: perder la puntería se paga más caro
        this.sprayRayLength = 480; // Antes 1200: el chorro de CO₂ no llega tan lejos
        this.estadoPaso = 1; // 1: Tirar, 1.5: Tomar manguera, 2: Apuntar, 3: Apretar, 4: Barrer
        this.isShooting = false;
        this.lastMouseX = 0;
        this.sweepVelocity = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isExtinguishing = false;
        this.isGameOver = false;
        this.pinRemoved = false;
        this.hoseGrabbed = false;
        this.justGrabbedHose = false;
    }
    
    preload() {
        // Generación procedimental de texturas en estilo PIXEL ART (bloques,
        // sin degradados suaves, paleta de colores limitada tipo retro/8-bit)
        let g = this.add.graphics();
        
        // Fuego - Núcleo (bandas de color planas en vez de degradado)
        drawPixelCircle(g, 16, 16, 16, 0xff9900, 1, 4);
        drawPixelCircle(g, 16, 16, 10, 0xffbb44, 1, 4);
        drawPixelCircle(g, 16, 16, 5, 0xffeedd, 1, 4);
        g.generateTexture('fireCore', 32, 32);
        g.clear();
        
        // Fuego - Resplandor
        drawPixelCircle(g, 28, 28, 28, 0xff3300, 0.85, 4);
        g.generateTexture('fireGlow', 56, 56);
        g.clear();
        
        // Humo Negro / Gris
        drawPixelCircle(g, 32, 32, 32, 0x1e293b, 0.6, 8);
        g.generateTexture('smoke', 64, 64);
        g.clear();

        // Vapor Blanco de Sofocación (aquí también representa la "nube fría"
        // de CO₂ una vez que el fuego se apaga)
        drawPixelCircle(g, 24, 24, 24, 0xf0f9ff, 0.8, 6);
        g.generateTexture('steam', 48, 48);
        g.clear();
        
        // "Nieve"/gas de CO₂ descargado: tono blanco-celeste helado, a
        // diferencia del blanco cálido del polvo (PQS)
        drawPixelCircle(g, 18, 18, 18, 0xbae6fd, 0.8, 4);
        drawPixelCircle(g, 18, 18, 12, 0xffffff, 0.95, 4);
        g.generateTexture('co2gas', 36, 36);
        g.clear();

        // Chispas/destellos de impacto, en tono helado (cian) en vez del
        // amarillo cálido del PQS
        g.fillStyle(0x7dd3fc, 1);
        g.fillRect(0, 0, 8, 8);
        g.generateTexture('spark', 8, 8);
        g.clear();
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.startTime = this.time.now;
        this.isExtinguishing = false;
        this.isGameOver = false;
        this.fuegoSalud = this.fuegoSaludMaxima;

        // Fondo y Entorno
        let bg = this.add.graphics();
        bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
        bg.fillRect(0, 0, width, height);

        // Suelo estilizado
        let floorHeight = 130;
        bg.fillStyle(0x334155, 1);
        bg.fillRect(0, height - floorHeight, width, floorHeight);
        bg.fillStyle(0x475569, 1);
        bg.fillRect(0, height - floorHeight, width, 6);

        // Fuego - Zona de detección de puntería
        this.fuegoX = width * 0.32;
        this.fuegoY = height - 130;
        
        // En vez de depender del overlap físico de cada partícula (poco confiable
        // y dependiente de la velocidad/tamaño de cada partícula), usamos un
        // rectángulo simple: mientras el chorro apunte dentro de esta zona,
        // el fuego recibe daño de forma continua y confiable.
        //
        // Más angosto que en el Escenario 1 (PQS): junto con el menor alcance
        // del chorro, obliga a apuntar con más precisión.
        this.fuegoHitRect = new Phaser.Geom.Rectangle(
            this.fuegoX - 150, (this.fuegoY - 20) - 65, 300, 130
        );
        
        // Emisores de Partículas para el Fuego
        this.smokeEmitter = this.add.particles(this.fuegoX, this.fuegoY - 60, 'smoke', {
            speed: { min: 30, max: 120 },
            angle: { min: 250, max: 290 },
            scale: { start: 1, end: 4.5 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 2800,
            gravityY: -120
        });
        this.smokeEmitter.setDepth(2);

        this.glowEmitter = this.add.particles(this.fuegoX, this.fuegoY, 'fireGlow', {
            speed: { min: 60, max: 180 },
            angle: { min: 240, max: 300 },
            scale: { start: 1.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 900,
            gravityY: -160
        });
        this.glowEmitter.setDepth(4);

        this.coreEmitter = this.add.particles(this.fuegoX, this.fuegoY + 15, 'fireCore', {
            speed: { min: 20, max: 90 },
            angle: { min: 250, max: 290 },
            scale: { start: 1.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 550,
            gravityY: -70
        });
        this.coreEmitter.setDepth(5);

        // Emisor de Vapor Blanco (Sofocación gradual)
        this.steamEmitter = this.add.particles(this.fuegoX, this.fuegoY - 20, 'steam', {
            speed: { min: 40, max: 160 },
            angle: { min: 220, max: 320 },
            scale: { start: 0.8, end: 3.5 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1500,
            gravityY: -100,
            emitting: false
        });
        this.steamEmitter.setDepth(6);

        // Emisor de Chispas de Impacto al caer espuma
        this.sparkEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 80, max: 250 },
            angle: { min: 180, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            gravityY: 200,
            emitting: false
        });
        this.sparkEmitter.setDepth(7);

        // Extintor en Pantalla (Lado derecho) - ESTILO PIXEL ART
        // Cuerpo negro/carbón (a diferencia del rojo del PQS) y etiqueta con
        // solo 2 clases de fuego (B y C) — el CO₂ no se recomienda para
        // Clase A, por lo que ese bloque de color se omite a propósito.
        this.extintorX = width * 0.82;
        this.extintorY = height - 140;
        let ex = this.extintorX;
        let ey = this.extintorY;
        let g = this.add.graphics();
        
        // Sombra de extintor (bloque plano, no elipse suave)
        g.fillStyle(0x000000, 0.45);
        g.fillRect(ex - 60, ey + 6, 120, 18);
        
        // Cuerpo del Extintor (Cilindro negro/carbón, esquinas rectas)
        g.fillStyle(0x1e293b);
        g.fillRect(ex - 48, ey - 230, 96, 230);
        // Contorno grueso tipo sprite
        g.lineStyle(4, 0x0f172a, 1);
        g.strokeRect(ex - 48, ey - 230, 96, 230);
        
        // Detalle brillante en el cilindro (franja plana, sin degradado)
        g.fillStyle(0xffffff, 0.18);
        g.fillRect(ex - 36, ey - 220, 12, 210);

        // Etiqueta del Extintor
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(ex - 42, ey - 170, 84, 80);
        g.lineStyle(3, 0x1e293b, 1);
        g.strokeRect(ex - 42, ey - 170, 84, 80);
        g.fillStyle(0x1e293b);
        g.fillRect(ex - 36, ey - 160, 72, 10);
        // Solo 2 íconos de clase (B: líquidos / C: eléctricos), centrados
        g.fillStyle(0x2563eb);
        g.fillRect(ex - 26, ey - 142, 20, 20);
        g.fillStyle(0x10b981);
        g.fillRect(ex + 6, ey - 142, 20, 20);

        // Cuello y Válvula
        g.fillStyle(0x334155);
        g.fillRect(ex - 16, ey - 260, 32, 30);
        g.fillStyle(0x1e293b);
        g.fillRect(ex - 30, ey - 275, 60, 15);

        // Manija Superior (Accionador)
        this.manijaSuperior = this.add.rectangle(ex - 42, ey - 292, 44, 12, 0x1e293b).setOrigin(0, 0);

        // Seguro Amarillo (Pin) - cuadrado en vez de círculo para el estilo pixel art
        this.pinX = ex - 12;
        this.pinY = ey - 268;
        this.pin = this.add.rectangle(this.pinX, this.pinY, 26, 26, 0xf59e0b)
            .setStrokeStyle(3, 0xb45309)
            .setInteractive({ useHandCursor: true });
        
        // Efecto pulso en el seguro
        this.tweens.add({
            targets: this.pin,
            scale: 1.15,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.pin.on('pointerdown', () => {
            if (this.estadoPaso === 1) this.pullPin();
        });

        // Manguera - Tamaño reducido ~70% respecto a la versión anterior
        this.hoseBaseX = ex - 20;
        this.hoseBaseY = ey - 255;
        this.hoseGraphics = this.add.graphics();

        this.hoseThickness = 16;      // Antes 18 (grosor del tubo)
        this.hoseDropSegment = 200;   // Antes 210 (tramo fijo antes de flexionar)
        // Difusor/boquilla mucho más grande que la del PQS (característico
        // del CO₂): el punto donde nacen las partículas se aleja más del
        // pliegue de la manguera para "salir" desde la punta del cono.
        this.hoseNozzleOffset = 40;  // Antes 10 en el PQS
        this.hoseRestOffset = 190;    // Antes 160 (posición de reposo inicial)

        // Punto donde la manguera empieza a flexionar y su alcance máximo:
        // ya NO se puede mover libremente por toda la pantalla, solo dentro
        // de un radio limitado alrededor de este punto (simula el largo real
        // de la manguera del extintor). Un poco más generoso que en el PQS
        // para compensar el alcance de rociado (sprayRayLength) más corto.
        this.hoseAnchor = { x: this.hoseBaseX, y: this.hoseBaseY + this.hoseDropSegment };
        this.hoseMaxReach = Math.max(340, this.hoseAnchor.x - this.fuegoX + 220) * 0.5;

        this.drawHose(this.hoseBaseX, this.hoseBaseY + this.hoseRestOffset);

        // Zona interactiva para "tomar" la manguera (nueva acción, entre
        // Tirar del seguro y poder Apuntar). Mientras no se tome, la manguera
        // permanece quieta en su posición de reposo y el puntero diana sigue
        // desactivado.
        this.hoseGrabZone = this.add.zone(this.boquillaPuntaX, this.boquillaPuntaY, 90, 90)
            .setInteractive({ useHandCursor: true });
        this.hoseGrabZone.on('pointerdown', () => {
            if (this.pinRemoved && !this.hoseGrabbed) this.grabHose();
        });

        // Indicador visual (oculto hasta quitar el seguro) que marca dónde
        // hacer clic para tomar la manguera
        this.hoseGrabIndicator = this.add.rectangle(
            this.boquillaPuntaX, this.boquillaPuntaY, 22, 22, 0x38bdf8
        ).setStrokeStyle(3, 0x0f172a).setVisible(false).setDepth(8);

        // Grupo de partículas físicas del gas de CO₂ (ahora es puramente visual;
        // el daño al fuego ya NO depende de que estas partículas choquen con
        // una zona física, sino de si el jugador apunta dentro de fuegoHitRect,
        // ver damageFire() y update()).
        this.gasGroup = this.physics.add.group();

        // Handlers de entrada
        this.input.on('pointerdown', this.startShooting, this);
        this.input.on('pointerup', this.stopShooting, this);
        this.input.on('pointermove', this.updatePointer, this);
        this.crosshair = document.getElementById('crosshair');
        this.speechBubble = document.getElementById('extinguisher-speech-bubble');
        this.topBanner = document.getElementById('top-instruction-banner');

        // Posicionar el globo de diálogo justo arriba del extintor (una sola
        // vez, ya que el extintor no se mueve durante la partida)
        if (this.speechBubble) {
            this.speechBubble.style.left = this.extintorX + 'px';
            this.speechBubble.style.top = (this.extintorY - 380) + 'px';
        }

        this.updateUI();
    }

    pullPin() {
        if (this.pin) {
            this.pin.destroy();
            this.pin = null;
        }
        this.pinRemoved = true;
        // NUEVO: ya no se pasa directo a "Apuntar". Primero hay que tomar
        // la manguera (estadoPaso 1.5): el puntero diana sigue desactivado
        // y la manguera no se mueve todavía.
        this.estadoPaso = 1.5;
        if (this.hoseGrabIndicator) {
            this.hoseGrabIndicator.setVisible(true);
            this.tweens.add({
                targets: this.hoseGrabIndicator,
                scale: 1.3,
                duration: 600,
                yoyo: true,
                repeat: -1
            });
        }
        this.updateUI();
    }

    grabHose() {
        this.hoseGrabbed = true;
        this.estadoPaso = 2;
        this.justGrabbedHose = true; // evita que este mismo clic dispare startShooting
        // Salvaguarda: se autolimpia enseguida sin importar el orden en que
        // Phaser dispare los eventos de este mismo clic
        this.time.delayedCall(60, () => { this.justGrabbedHose = false; });

        if (this.hoseGrabIndicator) {
            this.hoseGrabIndicator.destroy();
            this.hoseGrabIndicator = null;
        }
        if (this.hoseGrabZone) {
            this.hoseGrabZone.disableInteractive();
        }

        this.updateUI();
        if (this.crosshair) this.crosshair.style.display = 'block';
        this.input.setDefaultCursor('none');
    }

    updatePointer(pointer) {
        if (this.estadoPaso >= 2 && this.crosshair) {
            this.crosshair.style.left = pointer.event.clientX + 'px';
            this.crosshair.style.top = pointer.event.clientY + 'px';
            
            if (this.isShooting) {
                let deltaX = Math.abs(pointer.x - this.lastMouseX);
                this.sweepVelocity = (this.sweepVelocity * 0.7) + (deltaX * 0.3);
                
                if (this.sweepVelocity > 2 && this.estadoPaso === 3) {
                    this.estadoPaso = 4;
                    this.updateUI();
                }
            }
        }
        this.lastMouseX = pointer.x;
    }

    drawHose(targetX, targetY) {
        this.hoseGraphics.clear();
        this.hoseGraphics.lineStyle(this.hoseThickness, 0x0f172a);
        let curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(this.hoseBaseX, this.hoseBaseY),
            new Phaser.Math.Vector2(this.hoseBaseX, this.hoseBaseY + this.hoseDropSegment),
            new Phaser.Math.Vector2(targetX, targetY)
        );
        curve.draw(this.hoseGraphics);
        
        let angle = Phaser.Math.Angle.Between(this.hoseBaseX, this.hoseBaseY + this.hoseDropSegment, targetX, targetY);
        this.boquillaPuntaX = targetX + Math.cos(angle) * this.hoseNozzleOffset;
        this.boquillaPuntaY = targetY + Math.sin(angle) * this.hoseNozzleOffset;
        this.boquillaAngulo = angle; // Ángulo directo de salida de partículas

        // Difusor/boquilla de gran tamaño, en forma de cono escalonado
        // (pixel art), bastante más ancho y largo que la boquilla compacta
        // del PQS — es justo lo que distingue visualmente al CO₂: un mango
        // aislante corto seguido de un cono que se ensancha hacia la punta.
        this.hoseGraphics.save();
        this.hoseGraphics.translateCanvas(targetX, targetY);
        this.hoseGraphics.rotateCanvas(angle);

        // Mango aislante (por aquí se sujeta; NO por el cono metálico)
        this.hoseGraphics.fillStyle(0x334155, 1);
        this.hoseGraphics.fillRect(-4, -7, 14, 14);
        this.hoseGraphics.fillStyle(0x1e293b, 1);
        this.hoseGraphics.fillRect(-4, -7, 14, 14 - 10);

        // Cono/difusor escalonado, ensanchándose hacia la punta
        this.hoseGraphics.fillStyle(0x0f172a, 1);
        this.hoseGraphics.fillRect(10, -9, 8, 18);
        this.hoseGraphics.fillRect(18, -13, 8, 26);
        this.hoseGraphics.fillRect(26, -18, 10, 36);

        // Boca del difusor (abertura, un poco más clara)
        this.hoseGraphics.fillStyle(0x334155, 1);
        this.hoseGraphics.fillRect(35, -15, 4, 30);
        this.hoseGraphics.restore();
    }

    startShooting(pointer) {
        // El mismo clic que toma la manguera no debe además contar como disparo
        if (this.justGrabbedHose) {
            this.justGrabbedHose = false;
            return;
        }
        if (this.estadoPaso < 2 || this.fuegoSalud <= 0 || this.isExtinguishing || this.isGameOver) return;
        this.isShooting = true;
        
        if (this.manijaSuperior) {
            this.tweens.add({ targets: this.manijaSuperior, angle: 12, duration: 90 });
        }
        
        if (this.estadoPaso === 2) {
            this.estadoPaso = 3;
            this.updateUI();
        }
    }

    stopShooting() {
        this.isShooting = false;
        this.sweepVelocity = 0;
        if (this.manijaSuperior) {
            this.tweens.add({ targets: this.manijaSuperior, angle: 0, duration: 90 });
        }
    }

    update(time, delta) {
        if (this.isGameOver || this.isExtinguishing) return;

        // Actualizar cronómetro de respuesta
        this.elapsedTime = (this.time.now - this.startTime) / 1000;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.innerText = this.elapsedTime.toFixed(1) + 's';
        }

        if (this.estadoPaso >= 2) {
            let pointer = this.input.activePointer;

            // La manguera ya no sigue el mouse libremente: se clampa dentro
            // de this.hoseMaxReach desde this.hoseAnchor, simulando un largo
            // fijo de manguera. Además nunca puede cruzar sobre el extintor.
            let targetX = Math.min(pointer.x, this.extintorX - 45);
            let targetY = pointer.y;
            let dx = targetX - this.hoseAnchor.x;
            let dy = targetY - this.hoseAnchor.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.hoseMaxReach) {
                let ratio = this.hoseMaxReach / dist;
                targetX = this.hoseAnchor.x + dx * ratio;
                targetY = this.hoseAnchor.y + dy * ratio;
            }

            this.drawHose(targetX, targetY);
            
            if (this.isShooting) {
                // Generar partículas visuales de gas/nieve carbónica desde el
                // difusor hacia la dirección del apuntado. Velocidad más baja
                // que en el PQS, acorde al alcance más corto del CO₂.
                for (let i = 0; i < 3; i++) {
                    let speed = Phaser.Math.FloatBetween(500, 800);
                    let spreadAngle = this.boquillaAngulo + Phaser.Math.FloatBetween(-0.16, 0.16);
                    let vx = Math.cos(spreadAngle) * speed;
                    let vy = Math.sin(spreadAngle) * speed;
                    
                    let p = this.gasGroup.create(this.boquillaPuntaX, this.boquillaPuntaY, 'co2gas')
                        .setVisible(true)
                        .setScale(Phaser.Math.FloatBetween(0.5, 0.9))
                        .setAlpha(Phaser.Math.FloatBetween(0.85, 1))
                        .setDepth(3); // Detrás del resplandor/núcleo del fuego (depth 4-5)
                    
                    p.body.setSize(40, 40);
                    p.body.setVelocity(vx, vy);
                    p.body.setGravityY(160);
                    
                    // Animación visual de expansión y desvanecimiento durante el vuelo
                    this.tweens.add({
                        targets: p,
                        scale: 2.6,
                        alpha: 0,
                        duration: 560,
                        onComplete: () => { if (p && p.active) p.destroy(); }
                    });
                }

                // El daño ya NO depende de que la PUNTA de la manguera esté dentro
                // de la zona del fuego (eso solo cubría las partículas más cercanas
                // a la boquilla). En vez de eso, trazamos un rayo desde la boquilla
                // en la dirección exacta del disparo (this.boquillaAngulo) y
                // comprobamos si ese rayo CRUZA la zona del fuego en algún punto.
                // Así, todas las partículas del chorro cuentan -desde las que salen
                // pegadas a la boquilla hasta las más difuminadas/lejanas-, sin
                // importar qué tan estirada esté la manguera respecto al fuego.
                if (this.estadoPaso >= 3) {
                    let rayEndX = this.boquillaPuntaX + Math.cos(this.boquillaAngulo) * this.sprayRayLength;
                    let rayEndY = this.boquillaPuntaY + Math.sin(this.boquillaAngulo) * this.sprayRayLength;
                    let sprayLine = new Phaser.Geom.Line(this.boquillaPuntaX, this.boquillaPuntaY, rayEndX, rayEndY);

                    let intersecciones = Phaser.Geom.Intersects.GetLineToRectangle(sprayLine, this.fuegoHitRect);
                    let dentro = this.fuegoHitRect.contains(this.boquillaPuntaX, this.boquillaPuntaY);
                    let tocaFuego = intersecciones.length > 0 || dentro;

                    if (tocaFuego) {
                        // Punto de impacto (para chispas/vapor): antes se tomaba
                        // intersecciones[0] directamente, pero GetLineToRectangle no
                        // garantiza que ese sea el punto más CERCANO a la boquilla
                        // (puede devolver el borde lejano del rectángulo primero),
                        // así que las chispas a veces aparecían pegadas a la boquilla
                        // en vez de sobre el fuego. Ahora se elige explícitamente la
                        // intersección más cercana a la boquilla; si la boquilla ya
                        // está dentro del rectángulo (alcance corto), se usa el
                        // centro del fuego en vez de la posición de la boquilla, para
                        // que el efecto siempre se vea sobre el fuego.
                        let impacto;
                        if (intersecciones.length > 0) {
                            impacto = intersecciones[0];
                            let distanciaMinima = Phaser.Math.Distance.Between(this.boquillaPuntaX, this.boquillaPuntaY, impacto.x, impacto.y);
                            for (let i = 1; i < intersecciones.length; i++) {
                                let d = Phaser.Math.Distance.Between(this.boquillaPuntaX, this.boquillaPuntaY, intersecciones[i].x, intersecciones[i].y);
                                if (d < distanciaMinima) {
                                    distanciaMinima = d;
                                    impacto = intersecciones[i];
                                }
                            }
                        } else {
                            impacto = { x: this.fuegoX, y: this.fuegoY };
                        }
                        this.damageFire(delta, impacto.x, impacto.y);
                    } else if (this.fuegoSalud < this.fuegoSaludMaxima) {
                        // El chorro no está apuntando al fuego: se recupera gradualmente
                        this.regenFire(delta);
                    }
                }
            } else if (this.fuegoSalud < this.fuegoSaludMaxima && !this.isExtinguishing) {
                // No se está disparando en absoluto: el fuego vuelve a crecer
                // gradualmente hasta su tamaño original.
                this.regenFire(delta);
            }
        }
    }

    // APAGA EL FUEGO DE FORMA CONTINUA MIENTRAS EL CHORRO APUNTE DENTRO DE LA ZONA
    damageFire(delta, impactX, impactY) {
        if (this.fuegoSalud <= 0 || this.isExtinguishing) return;

        // Daño por segundo: más bajo que el PQS (antes 100) y con
        // fuegoSaludMaxima=340, hace falta rociar sostenido y con buena
        // puntería mucho más tiempo (~4.8s de impacto directo continuo) para
        // apagarlo por completo.
        const dañoPorSegundo = 70;
        this.fuegoSalud -= dañoPorSegundo * (delta / 1000);
        if (this.fuegoSalud < 0) this.fuegoSalud = 0;

        // Efectos visuales de impacto (chispas y vapor): siempre reaccionan,
        // ya que con la manguera limitada el chorro casi siempre está sobre
        // el fuego mientras se dispara dentro de fuegoHitRect.
        this.sparkEmitter.emitParticleAt(impactX, impactY, 3);
        this.steamEmitter.emitParticleAt(impactX, impactY - 10, 1);

        this.updateFireVisuals();

        // CUANDO LA SALUD LLEGA A 0: ARRANCA LA SECUENCIA DE APAGADO
        if (this.fuegoSalud <= 0 && !this.isExtinguishing) {
            this.startExtinguishSequence();
        }
    }

    // EL FUEGO SE RECUPERA GRADUALMENTE (VUELVE A SU TAMAÑO ORIGINAL) SI SE
    // DEJA DE APLICAR EL EXTINTOR ANTES DE HABERLO APAGADO POR COMPLETO
    regenFire(delta) {
        if (this.fuegoSalud >= this.fuegoSaludMaxima || this.isExtinguishing || this.isGameOver) return;

        this.fuegoSalud += this.fuegoRegenPorSegundo * (delta / 1000);
        if (this.fuegoSalud > this.fuegoSaludMaxima) this.fuegoSalud = this.fuegoSaludMaxima;

        this.updateFireVisuals();
    }

    // Sincroniza la barra de salud/porcentaje en el DOM y el TAMAÑO visual del
    // fuego (núcleo, resplandor y humo) con this.fuegoSalud. La usan tanto
    // damageFire() (fuego encogiéndose) como regenFire() (fuego creciendo de
    // vuelta a su tamaño original), para que ambos casos se vean consistentes.
    updateFireVisuals() {
        let percentage = Math.max(0, (this.fuegoSalud / this.fuegoSaludMaxima) * 100);
        const barEl = document.getElementById('fire-hp-bar');
        const textEl = document.getElementById('fire-hp-text');

        // El texto solo llega a "0%" cuando fuegoSalud es realmente 0, para que
        // nunca se vea "apagado" antes de que internamente lo esté.
        let displayPercentage = this.fuegoSalud <= 0 ? 0 : Math.max(1, Math.ceil(percentage));

        if (barEl) barEl.style.width = percentage.toFixed(1) + '%';
        if (textEl) textEl.innerText = displayPercentage + '%';

        // TAMAÑO DEL FUEGO ATADO EN TIEMPO REAL A ESTA MISMA BARRA: si baja,
        // el fuego se encoge en la misma proporción; si sube (se regenera al
        // dejar de rociar), vuelve a su tamaño original.
        //
        // Aquí SÍ usamos setScale()/setAlpha() -del EMISOR completo, no de
        // cada partícula- a propósito: al ser la escala/alfa de todo el
        // nodo (como si fuera un contenedor), el cambio se aplica de
        // inmediato a TODAS las partículas que ya están en pantalla, no solo
        // a las que se emitan después. Eso es lo que logra que el fuego se
        // vea encogiendo/creciendo pegado a la barra, fotograma a fotograma,
        // en vez de con desfase. setParticleScale()/setParticleAlpha()
        // (por partícula) se dejan con su configuración fija original, para
        // que cada partícula conserve su "parpadeo" natural sin importar el
        // tamaño general del fuego.
        let escala = Math.max(0.03, this.fuegoSalud / this.fuegoSaludMaxima);
        this.coreEmitter.setScale(escala);
        this.coreEmitter.setAlpha(escala);
        this.glowEmitter.setScale(escala);
        this.glowEmitter.setAlpha(escala);
        this.smokeEmitter.setScale(escala);
        this.smokeEmitter.setAlpha(escala);
    }

    // SECUENCIA DE APAGADO GRADUAL (TRANSICIÓN SUAVE ANTES DE LA VICTORIA)
    startExtinguishSequence() {
        this.isExtinguishing = true;
        this.stopShooting();

        // 1. Detener emisión de llamas y núcleo
        if (this.coreEmitter) this.coreEmitter.stop();
        if (this.glowEmitter) this.glowEmitter.stop();
        
        // 2. Activar nube densa de vapor de sofocación final
        if (this.steamEmitter) {
            this.steamEmitter.start();
        }

        // 3. Desvanecer suavemente el humo restante y, cuando esa animación
        // se cancela/termina (onComplete), recién ahí soltar la pantalla de
        // victoria. Ya no depende de un temporizador fijo aparte: la victoria
        // está directamente atada al fin de la animación del fuego.
        this.tweens.add({
            targets: [this.smokeEmitter],
            alpha: 0,
            duration: 1400,
            onComplete: () => {
                if (this.steamEmitter) this.steamEmitter.stop();
                this.winGame();
            }
        });
    }

    updateUI() {
        const stepExpl = {
            1: {
                title: "💡 ¿Por qué Tirar del seguro?",
                text: "El seguro bloquea la palanca de descarga. Al quitarlo, se rompe el precinto y se habilita la salida del CO₂ presurizado en su interior.",
                tooltip: "👆 Haz clic en el SEGURO AMARILLO",
                target: "bubble"
            },
            1.5: {
                title: "💡 ¿Por qué tomar la manguera?",
                text: "Sujeta el difusor por su mango aislante, nunca por el cono metálico: el CO₂ sale a temperatura extremadamente baja y puede causar quemaduras por frío.",
                tooltip: "🖐️ Haz clic en el DIFUSOR para tomarlo",
                target: "bubble"
            },
            2: {
                title: "💡 ¿Por qué Apuntar a la base del fuego?",
                text: "El CO₂ actúa desplazando el oxígeno alrededor del combustible. Apuntar a la base concentra el gas justo donde ocurre la combustión.",
                tooltip: "🎯 Apunta el cursor a la BASE del fuego",
                target: "banner"
            },
            3: {
                title: "💡 ¿Por qué Apretar la palanca?",
                text: "Mantiene abierta la válvula para liberar el CO₂ almacenado como gas presurizado, sin dejar residuo sobre el equipo o material cercano.",
                tooltip: "🖐️ MANTÉN PRESIONADO EL CLIC para liberar el gas",
                target: "banner"
            },
            4: {
                title: "💡 ¿Por qué Barrer de lado a lado?",
                text: "El CO₂ se dispersa rápido en el aire, así que hay que barrer cerca del fuego para mantener una concentración de gas suficiente y sofocar la combustión.",
                tooltip: "↔️ BARRER de lado a lado, cerca del fuego, manteniendo presionado el clic",
                target: "banner"
            }
        };

        // El panel de pasos (T A A B) solo conoce 4 pasos enteros: 1.5 hace
        // que el paso 1 se muestre "completado" y el 2 todavía "pendiente",
        // reflejando visualmente que falta tomar la manguera.
        for (let i = 1; i <= 4; i++) {
            let li = document.getElementById('step-' + i);
            if (li) {
                if (i === this.estadoPaso) {
                    li.className = "step-active d-flex align-items-center gap-3";
                } else if (i < this.estadoPaso) {
                    li.className = "step-completed d-flex align-items-center gap-3";
                    let numEl = li.querySelector('.step-num');
                    if (numEl) numEl.innerHTML = '<i class="bi bi-check-lg"></i>';
                } else {
                    li.className = "step-pending d-flex align-items-center gap-3";
                }
            }
        }

        const info = stepExpl[this.estadoPaso] || stepExpl[4];
        const whyTitle = document.getElementById('why-title');
        const whyText = document.getElementById('why-text');

        if (whyTitle) whyTitle.innerText = info.title;
        if (whyText) whyText.innerText = info.text;

        // Instrucción accionable: globo sobre el extintor (pasos 1 y 1.5,
        // interacción directa con el equipo) o banner superior (pasos 2, 3
        // y 4, mientras se apunta/dispara/barre)
        if (this.speechBubble) {
            this.speechBubble.style.display = info.target === 'bubble' ? 'block' : 'none';
            if (info.target === 'bubble') this.speechBubble.innerText = info.tooltip;
        }
        if (this.topBanner) {
            this.topBanner.style.display = info.target === 'banner' ? 'block' : 'none';
            if (info.target === 'banner') this.topBanner.innerText = info.tooltip;
        }
    }

    winGame() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        if (this.crosshair) this.crosshair.style.display = 'none';
        if (this.speechBubble) this.speechBubble.style.display = 'none';
        if (this.topBanner) this.topBanner.style.display = 'none';
        this.input.setDefaultCursor('default');

        // Tiempo de apagado de este intento y mejor tiempo histórico: se
        // guardan ya en localStorage (bajo omniTrainMetrics) apenas se apaga
        // el fuego, para que tanto esta pantalla como la de resultados del
        // cuestionario (que lee el mismo registro) puedan mostrarlos. Menor
        // tiempo = mejor desempeño.
        //
        // Se guarda con una clave propia de este escenario (...CO2) en vez de
        // una genérica: el CO₂ tiene su propia dificultad (fuegoSaludMaxima,
        // daño por segundo, etc.), así que su mejor tiempo no debe mezclarse
        // ni compararse con el del Escenario 1 (PQS).
        const tiempoActual = this.elapsedTime;
        let metrics;
        try {
            metrics = JSON.parse(localStorage.getItem('omniTrainMetrics')) || {};
        } catch (e) {
            metrics = {};
        }

        const mejorPrevio = Number(metrics.bestExtinguishTimeCO2);
        const hayMejorPrevio = !isNaN(mejorPrevio) && mejorPrevio > 0;
        const esNuevoRecord = !hayMejorPrevio || tiempoActual < mejorPrevio;
        const mejorTiempo = esNuevoRecord ? tiempoActual : mejorPrevio;

        metrics.lastExtinguishTimeCO2 = tiempoActual;
        metrics.bestExtinguishTimeCO2 = mejorTiempo;
        try {
            localStorage.setItem('omniTrainMetrics', JSON.stringify(metrics));
        } catch (e) { /* sin almacenamiento no persiste */ }

        const victoryTimeEl = document.getElementById('victory-time');
        const victoryBestEl = document.getElementById('victory-best-time');
        const victoryBestStat = document.getElementById('victory-best-stat');
        if (victoryTimeEl) victoryTimeEl.textContent = tiempoActual.toFixed(1) + 's';
        if (victoryBestEl) victoryBestEl.textContent = mejorTiempo.toFixed(1) + 's';
        if (victoryBestStat) victoryBestStat.classList.toggle('is-record', esNuevoRecord);

        // Desplegar menú de victoria de forma limpia tras finalizar la secuencia de apagado
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) {
            victoryScreen.style.display = 'flex';
            setTimeout(() => {
                victoryScreen.style.opacity = '1';
                victoryScreen.style.pointerEvents = 'auto';
            }, 50);
        }
    }
}

// Inicialización de la escena Phaser: ya NO se ejecuta automáticamente al
// cargar el script. Se dispara desde el botón "Jugar" de la pantalla previa
// (ver pygame2.html), llamando a startCo2Simulator().
let game = null;

function startCo2Simulator() {
    if (game) return; // Evita reinicializar si ya se creó

    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'sim-game-container',
        transparent: true,
        pixelArt: true,
        render: {
            pixelArt: true,
            antialias: false,
            roundPixels: true
        },
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 } }
        },
        scene: SimulatorSceneCO2
    };

    game = new Phaser.Game(config);
    window.addEventListener('resize', () => {
        if (game) game.scale.resize(window.innerWidth, window.innerHeight);
    });
}


// =====================================================================
// LÓGICA DEL CUESTIONARIO TEÓRICO Y SINCRONIZACIÓN DE MÉTRICAS (5 Preguntas)
// =====================================================================

const questions = [
    {
        q: "1. ¿Cómo actúa principalmente el CO₂ para apagar un fuego?",
        options: [
            "Enfriando el combustible por debajo de su punto de ignición",
            "Desplazando el oxígeno alrededor del fuego (sofocación)",
            "Formando una espuma que separa el combustible del aire"
        ],
        answer: 1,
        explanation: "Correcto: el CO₂ actúa por sofocación, desplazando el oxígeno que rodea al fuego y cortando la combustión."
    },
    {
        q: "2. ¿Para qué clases de fuego es más recomendable el extintor de CO₂?",
        options: [
            "Clase B (líquidos inflamables) y Clase C (eléctricos)",
            "Clase A (sólidos) y Clase D (metales)",
            "Únicamente fuegos Clase K (aceites de cocina)"
        ],
        answer: 0,
        explanation: "Correcto: el CO₂ es especialmente eficaz en fuegos Clase B y C, sobre todo en equipos energizados, porque no conduce electricidad ni deja residuo."
    },
    {
        q: "3. ¿Por qué el CO₂ generalmente NO es la mejor opción para apagar un fuego Clase A (madera, papel, tela)?",
        options: [
            "Porque reacciona químicamente con la madera y genera gases tóxicos",
            "Porque el CO₂ solo funciona en presencia de electricidad",
            "Porque se disipa demasiado rápido para penetrar en las brasas, permitiendo que el fuego se reavive"
        ],
        answer: 2,
        explanation: "Correcto: al dispersarse tan rápido, el CO₂ no logra sofocar las brasas en profundidad, y el fuego Clase A puede reavivarse."
    },
    {
        q: "4. ¿Por qué se debe sujetar el difusor del extintor de CO₂ por el mango aislante y no por el cono metálico?",
        options: [
            "Porque el cono se calienta demasiado al descargar el gas",
            "Porque el gas sale a temperatura extremadamente baja y puede causar quemaduras por frío",
            "Porque el cono metálico conduce electricidad"
        ],
        answer: 1,
        explanation: "Correcto: el CO₂ se descarga a una temperatura muy baja; tocar el cono metálico directamente puede causar una quemadura por frío."
    },
    {
        q: "5. ¿Por qué la boquilla (difusor) del extintor de CO₂ es mucho más grande que la de un extintor de polvo químico?",
        options: [
            "Para dirigir el gas frío de forma segura, lejos de la mano del operador",
            "Para almacenar más cantidad de agente extintor",
            "Para hacer más ruido y alertar a las personas cercanas"
        ],
        answer: 0,
        explanation: "Correcto: el cono grande dirige y concentra el gas hacia el fuego, manteniendo el mango (por donde se sujeta) alejado de la parte fría."
    },
    {
        q: "6. ¿Por qué no es recomendable usar un extintor de CO₂ en exteriores con mucho viento?",
        options: [
            "Porque el viento puede apagar la palanca de descarga",
            "Porque el frío del CO₂ se combina con el viento y forma hielo en el suelo",
            "Porque el gas se dispersa rápidamente y pierde efectividad antes de concentrarse sobre el fuego"
        ],
        answer: 2,
        explanation: "Correcto: al ser un gas, el CO₂ se dispersa con facilidad en espacios abiertos o con viento, perdiendo la concentración necesaria para sofocar el fuego."
    },
    {
        q: "7. ¿Qué riesgo existe al usar un extintor de CO₂ dentro de un espacio cerrado y muy pequeño sin ventilar después?",
        options: [
            "El CO₂ puede corroer las paredes del lugar",
            "El desplazamiento del oxígeno en el aire puede representar riesgo de asfixia para las personas presentes",
            "El CO₂ puede reaccionar con el aire y generar una explosión"
        ],
        answer: 1,
        explanation: "Correcto: el mismo mecanismo que sofoca el fuego (desplazar el oxígeno) puede reducir el oxígeno disponible para respirar en un espacio cerrado sin ventilar."
    },
    {
        q: "8. En el paso 'Barrer' del método T.A.A.B. con el CO₂, ¿por qué conviene acercarse más al fuego que con un extintor de polvo?",
        options: [
            "Porque el alcance efectivo del chorro de CO₂ es más corto: el gas se dispersa en el aire y pierde concentración a mayor distancia",
            "Porque el CO₂ solo funciona en contacto directo con las llamas",
            "Porque acercarse reduce el tiempo de espera de la palanca"
        ],
        answer: 0,
        explanation: "Correcto: a diferencia del polvo, el chorro de CO₂ pierde concentración rápido en el aire, así que hay que operar más cerca del fuego para que sea efectivo."
    }
];

let currentQ = 0;
let correctCount = 0;
let score = 0;

const btnStartQuiz = document.getElementById('btn-start-quiz');
if (btnStartQuiz) {
    btnStartQuiz.addEventListener('click', () => {
        const vicScreen = document.getElementById('victory-screen');
        const uiLayer = document.getElementById('sim-ui-layer');
        const quizOverlay = document.getElementById('quiz-overlay');
        
        if (vicScreen) vicScreen.style.opacity = '0';
        if (uiLayer) uiLayer.style.display = 'none';
        
        if (quizOverlay) {
            quizOverlay.style.display = 'flex';
            setTimeout(() => quizOverlay.style.opacity = '1', 50);
        }
        
        currentQ = 0;
        correctCount = 0;
        score = 0;
        // Al (re)iniciar el cuestionario, el botón "Salir" de la esquina
        // vuelve a mostrarse (showResults() lo oculta al llegar al final)
        const quizExitBtn = document.getElementById('btn-exit-quiz');
        if (quizExitBtn) quizExitBtn.style.display = '';
        loadQuestion();
    });
}

function loadQuestion() {
    if (currentQ >= questions.length) {
        showResults();
        return;
    }
    
    const counterEl = document.getElementById('quiz-counter');
    const qTextEl = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const feedbackBox = document.getElementById('feedback-box');
    const btnNextQuestion = document.getElementById('btn-next-question');
    
    if (feedbackBox) feedbackBox.style.display = 'none';
    // El botón "Siguiente" solo debe aparecer una vez respondida la pregunta
    if (btnNextQuestion) btnNextQuestion.style.display = 'none';
    if (counterEl) counterEl.innerText = `Pregunta ${currentQ + 1} de ${questions.length}`;
    if (qTextEl) qTextEl.innerText = questions[currentQ].q;
    
    if (container) {
        container.innerHTML = '';
        questions[currentQ].options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.innerText = opt;
            btn.onclick = () => selectAnswer(index, btn);
            container.appendChild(btn);
        });
    }
}

function selectAnswer(selectedIndex, btnElement) {
    const buttons = document.querySelectorAll('.quiz-option');
    buttons.forEach(b => b.style.pointerEvents = 'none');

    const q = questions[currentQ];
    const correctIndex = q.answer;
    const feedbackBox = document.getElementById('feedback-box');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    const btnNextQuestion = document.getElementById('btn-next-question');

    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        // Con 8 preguntas, el porcentaje final se calcula al terminar (ver
        // showResults) a partir de los aciertos, en vez de sumar puntos fijos
        // por pregunta (100/8 no es un entero).
        correctCount++;
        if (feedbackBox) {
            feedbackBox.className = 'feedback-explanation correct-bg';
            if (feedbackTitle) feedbackTitle.innerText = "¡Respuesta Correcta!";
            if (feedbackText) feedbackText.innerText = q.explanation;
            feedbackBox.style.display = 'block';
        }
    } else {
        btnElement.classList.add('incorrect');
        if (buttons[correctIndex]) buttons[correctIndex].classList.add('correct');
        if (feedbackBox) {
            feedbackBox.className = 'feedback-explanation incorrect-bg';
            if (feedbackTitle) feedbackTitle.innerText = "Respuesta Incorrecta";
            if (feedbackText) feedbackText.innerText = q.explanation;
            feedbackBox.style.display = 'block';
        }
    }

    // Ya se respondió: mostramos el botón para avanzar manualmente en vez de
    // avanzar solo tras un tiempo fijo. En la última pregunta el botón invita
    // a ver los resultados en vez de decir "Siguiente".
    if (btnNextQuestion) {
        const esUltimaPregunta = currentQ === questions.length - 1;
        btnNextQuestion.innerHTML = esUltimaPregunta
            ? 'Ver Resultado <i class="bi bi-bar-chart-fill ms-2"></i>'
            : 'Siguiente <i class="bi bi-arrow-right ms-2"></i>';
        btnNextQuestion.style.display = 'inline-flex';
    }
}

// Botón "Siguiente" / "Ver Resultado": avanza a la siguiente pregunta y
// desaparece de inmediato hasta que se responda la próxima
const btnNextQuestion = document.getElementById('btn-next-question');
if (btnNextQuestion) {
    btnNextQuestion.addEventListener('click', () => {
        btnNextQuestion.style.display = 'none';
        currentQ++;
        loadQuestion();
    });
}

function showResults() {
    const qTextEl = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const counterEl = document.getElementById('quiz-counter');
    const feedbackBox = document.getElementById('feedback-box');
    const btnNextQuestion = document.getElementById('btn-next-question');
    const resultsDiv = document.getElementById('quiz-results');
    const finalScoreEl = document.getElementById('final-score');
    const quizExitBtn = document.getElementById('btn-exit-quiz');

    // Se oculta Y se limpia el contenido de la última pregunta respondida,
    // para que no quede ningún rastro de ella (texto, opciones marcadas
    // como correcta/incorrecta, explicación) detrás de la pantalla de resultados
    if (qTextEl) qTextEl.style.display = 'none';
    if (container) { container.style.display = 'none'; container.innerHTML = ''; }
    if (counterEl) counterEl.style.display = 'none';
    if (feedbackBox) { feedbackBox.style.display = 'none'; feedbackBox.className = 'feedback-explanation'; }
    if (btnNextQuestion) btnNextQuestion.style.display = 'none';
    // La pantalla de calificación ya trae sus propios botones ("Repetir" y
    // "Volver a Simulador 2D"), así que el "Salir" de la esquina se oculta
    if (quizExitBtn) quizExitBtn.style.display = 'none';
    
    if (resultsDiv) resultsDiv.style.display = 'block';

    // Puntaje final como porcentaje de aciertos sobre las 8 preguntas (en vez
    // de sumar puntos fijos por pregunta, ya que 100/8 no da un entero).
    score = Math.round((correctCount / questions.length) * 100);
    if (finalScoreEl) finalScoreEl.innerText = `${score}%`;

    // Tiempo de apagado y mejor tiempo: ya se guardaron en localStorage al
    // extinguir el fuego (ver winGame() en la clase SimulatorSceneCO2), así
    // que aquí simplemente se leen y se muestran junto con el resultado.
    // Se usan las claves propias de este escenario (...CO2), separadas de
    // las del Escenario 1 (PQS), porque la dificultad -y por lo tanto los
    // tiempos- no son comparables entre ambos.
    let metricsActuales;
    try {
        metricsActuales = JSON.parse(localStorage.getItem('omniTrainMetrics')) || {};
    } catch (e) {
        metricsActuales = {};
    }
    const tiempoUltimo = Number(metricsActuales.lastExtinguishTimeCO2);
    const tiempoMejor = Number(metricsActuales.bestExtinguishTimeCO2);
    const resultsTimeEl = document.getElementById('results-time');
    const resultsBestEl = document.getElementById('results-best-time');
    const resultsBestStat = document.getElementById('results-best-stat');

    if (resultsTimeEl) resultsTimeEl.textContent = !isNaN(tiempoUltimo) ? tiempoUltimo.toFixed(1) + 's' : '--';
    if (resultsBestEl) resultsBestEl.textContent = !isNaN(tiempoMejor) ? tiempoMejor.toFixed(1) + 's' : '--';
    if (resultsBestStat) {
        resultsBestStat.classList.toggle('is-record', !isNaN(tiempoUltimo) && !isNaN(tiempoMejor) && tiempoUltimo <= tiempoMejor);
    }

    // Mensaje de desbloqueo según el puntaje: el Escenario 3 (Extintor de
    // Agua) solo se desbloquea con 100% en este cuestionario (ver SCENARIOS
    // en index2d.html: requiere quiz2Score), así que el mensaje aquí refleja
    // ese mismo umbral.
    const logrado = score >= 100;
    const eyebrow = document.getElementById('results-eyebrow');
    const iconFrame = document.getElementById('results-icon-frame');
    const unlockMsg = document.getElementById('unlock-message');

    if (finalScoreEl) finalScoreEl.style.color = logrado ? '#34d399' : '#fbbf24';

    if (eyebrow) {
        eyebrow.textContent = logrado ? 'Nivel superado' : 'Sigue practicando';
        eyebrow.className = 'pixel-eyebrow ' + (logrado ? 'is-success' : 'is-retry');
    }

    if (iconFrame) {
        iconFrame.classList.toggle('pulse-glow', logrado);
    }

    if (unlockMsg) {
        unlockMsg.className = 'unlock-message ' + (logrado ? 'is-success' : 'is-retry');
        unlockMsg.innerHTML = logrado
            ? '<i class="bi bi-unlock-fill" aria-hidden="true"></i> ¡Felicidades! Superaste el Extintor CO₂. Ya puedes pasar al Escenario 3: Extintor de Agua.'
            : '<i class="bi bi-arrow-repeat" aria-hidden="true"></i> ¡Inténtalo de nuevo para desbloquear el siguiente nivel!';
    }
}

function saveAndReturn(targetUrl) {
    let metrics = JSON.parse(localStorage.getItem('omniTrainMetrics')) || {
        scenariosCompleted: 0,
        moduleProgress: 0,
        bestScore: 0,
        quiz2Score: 0,
        lastReactionTime: 12,
        efficiencyScore: 85,
        totalAttempts: 0
    };

    metrics.totalAttempts = (metrics.totalAttempts || 0) + 1;

    if (metrics.scenariosCompleted < 3) {
        metrics.scenariosCompleted += 1;
    }
    
    metrics.moduleProgress = Math.min(100, Math.round((metrics.scenariosCompleted / 3) * 100));
    
    if (score > metrics.bestScore) {
        metrics.bestScore = score;
    }

    // Puntaje específico de este cuestionario (Extintor CO₂), usado para
    // decidir si se desbloquea el siguiente escenario (Extintor de Agua)
    if (score > (metrics.quiz2Score || 0)) {
        metrics.quiz2Score = score;
    }

    // Actualizar tiempo de reacción y eficiencia simulados con base en el juego
    const timerText = document.getElementById('timer-display');
    if (timerText) {
        let timeVal = parseFloat(timerText.innerText.replace('s', '')) || 10;
        metrics.lastReactionTime = Math.min(30, Math.max(5, Math.round(timeVal)));
    }

    metrics.efficiencyScore = Math.min(100, Math.max(70, Math.round(80 + (score * 0.2))));

    // Guardar objeto global en localStorage
    localStorage.setItem('omniTrainMetrics', JSON.stringify(metrics));
    
    window.location.href = targetUrl;
}