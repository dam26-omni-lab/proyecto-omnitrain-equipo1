// =====================================================================
// LÓGICA DE PHASER Y UI/UX - SIMULADOR EXTINTOR PQS (T.A.A.B.) - PIXEL ART
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

class SimulatorScene extends Phaser.Scene {
    constructor() {
        super('SimulatorScene');
        this.fuegoSaludMaxima = 250; // Total de impactos de partículas necesarios para apagar el fuego
        this.fuegoSalud = this.fuegoSaludMaxima;
        this.fuegoRegenPorSegundo = 45; // Velocidad a la que el fuego "vuelve a crecer" si se deja de rociar
        this.sprayRayLength = 1200; // Alcance efectivo del chorro de partículas (más allá de la boquilla)
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

        // Vapor Blanco de Sofocación
        drawPixelCircle(g, 24, 24, 24, 0xf8fafc, 0.8, 6);
        g.generateTexture('steam', 48, 48);
        g.clear();
        
        // Espuma / Polvo Químico Seco (PQS)
        drawPixelCircle(g, 18, 18, 18, 0xe2e8f0, 0.8, 4);
        drawPixelCircle(g, 18, 18, 12, 0xffffff, 0.95, 4);
        g.generateTexture('foam', 36, 36);
        g.clear();

        // Chispas de Sofocación
        g.fillStyle(0xfacc15, 1);
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
        this.fuegoHitRect = new Phaser.Geom.Rectangle(
            this.fuegoX - 180, (this.fuegoY - 20) - 80, 360, 160
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
        this.extintorX = width * 0.82;
        this.extintorY = height - 140;
        let ex = this.extintorX;
        let ey = this.extintorY;
        let g = this.add.graphics();
        
        // Sombra de extintor (bloque plano, no elipse suave)
        g.fillStyle(0x000000, 0.45);
        g.fillRect(ex - 60, ey + 6, 120, 18);
        
        // Cuerpo del Extintor (Cilindro Rojo, esquinas rectas)
        g.fillStyle(0xd32f2f);
        g.fillRect(ex - 48, ey - 230, 96, 230);
        // Contorno grueso tipo sprite
        g.lineStyle(4, 0x1e293b, 1);
        g.strokeRect(ex - 48, ey - 230, 96, 230);
        
        // Detalle brillante en el cilindro (franja plana, sin degradado)
        g.fillStyle(0xffffff, 0.25);
        g.fillRect(ex - 36, ey - 220, 12, 210);

        // Etiqueta del Extintor
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(ex - 42, ey - 170, 84, 80);
        g.lineStyle(3, 0x1e293b, 1);
        g.strokeRect(ex - 42, ey - 170, 84, 80);
        g.fillStyle(0x1e293b);
        g.fillRect(ex - 36, ey - 160, 72, 10);
        g.fillStyle(0xd32f2f);
        g.fillRect(ex - 36, ey - 142, 20, 20);
        g.fillStyle(0x2563eb);
        g.fillRect(ex - 10, ey - 142, 20, 20);
        g.fillStyle(0x10b981);
        g.fillRect(ex + 16, ey - 142, 20, 20);

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
        this.hoseNozzleOffset = 10;  // Antes 38 (distancia de la punta/boquilla)
        this.hoseRestOffset = 190;    // Antes 160 (posición de reposo inicial)

        // Punto donde la manguera empieza a flexionar y su alcance máximo:
        // ya NO se puede mover libremente por toda la pantalla, solo dentro
        // de un radio limitado alrededor de este punto (simula el largo real
        // de la manguera del extintor).
        this.hoseAnchor = { x: this.hoseBaseX, y: this.hoseBaseY + this.hoseDropSegment };
        this.hoseMaxReach = Math.max(340, this.hoseAnchor.x - this.fuegoX + 220) * 0.4;

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

        // Grupo de partículas físicas de espuma (ahora es puramente visual;
        // el daño al fuego ya NO depende de que estas partículas choquen con
        // una zona física, sino de si el jugador apunta dentro de fuegoHitRect,
        // ver damageFire() y update()).
        this.foamGroup = this.physics.add.group();

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

        // Pequeña boquilla pixel art en la punta de la manguera
        this.hoseGraphics.save();
        this.hoseGraphics.translateCanvas(targetX, targetY);
        this.hoseGraphics.rotateCanvas(angle);
        this.hoseGraphics.fillStyle(0x334155, 1);
        this.hoseGraphics.fillRect(-3, -6, 16, 12);
        this.hoseGraphics.fillStyle(0x1e293b, 1);
        this.hoseGraphics.fillRect(11, -4, 7, 8);
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
                // Generar partículas visuales de espuma desde la boquilla hacia la dirección del apuntado
                for (let i = 0; i < 3; i++) {
                    let speed = Phaser.Math.FloatBetween(750, 1150);
                    let spreadAngle = this.boquillaAngulo + Phaser.Math.FloatBetween(-0.16, 0.16);
                    let vx = Math.cos(spreadAngle) * speed;
                    let vy = Math.sin(spreadAngle) * speed;
                    
                    let p = this.foamGroup.create(this.boquillaPuntaX, this.boquillaPuntaY, 'foam')
                        .setVisible(true)
                        .setScale(Phaser.Math.FloatBetween(0.5, 0.9))
                        .setAlpha(Phaser.Math.FloatBetween(0.85, 1))
                        .setDepth(3); // Detrás del resplandor/núcleo del fuego (depth 4-5)
                    
                    p.body.setSize(40, 40);
                    p.body.setVelocity(vx, vy);
                    p.body.setGravityY(220);
                    
                    // Animación visual de expansión y desvanecimiento durante el vuelo
                    this.tweens.add({
                        targets: p,
                        scale: 2.8,
                        alpha: 0,
                        duration: 700,
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
                    let tocaFuego = intersecciones.length > 0 || this.fuegoHitRect.contains(this.boquillaPuntaX, this.boquillaPuntaY);

                    if (tocaFuego) {
                        // Punto de impacto (para chispas/vapor): el primer punto donde
                        // el chorro entra en la zona del fuego, o la boquilla si ya
                        // está directamente dentro de la zona.
                        let impacto = intersecciones.length > 0
                            ? intersecciones[0]
                            : { x: this.boquillaPuntaX, y: this.boquillaPuntaY };
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

        // Daño por segundo (con fuegoSaludMaxima=250, ~2.5s de rociado directo apaga el fuego)
        const dañoPorSegundo = 100;
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

        // TAMAÑO DEL FUEGO PROPORCIONAL A LA SALUD RESTANTE: se encoge mientras
        // se rocía (scaleFactor baja) y vuelve a su tamaño original (scaleFactor
        // = 1) al recuperarse si se deja de aplicar polvo.
        let scaleFactor = (this.fuegoSalud / this.fuegoSaludMaxima);
        this.coreEmitter.setScale({ start: 1.3 * scaleFactor, end: 0 });
        this.glowEmitter.setScale({ start: 1.6 * scaleFactor, end: 0 });
        this.smokeEmitter.setScale({ start: scaleFactor, end: 4.5 * scaleFactor });
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
                text: "En el Extintor PQS, el seguro bloquea la palanca de percusión. Al quitarlo, se rompe el precinto y se habilita la descarga del polvo químico.",
                tooltip: "👆 Haz clic en el SEGURO AMARILLO",
                target: "bubble"
            },
            1.5: {
                title: "💡 ¿Por qué tomar la manguera?",
                text: "Sujetar firmemente la boquilla permite dirigir el chorro de polvo con precisión hacia la base del fuego.",
                tooltip: "🖐️ Haz clic en la MANGUERA para tomarla",
                target: "bubble"
            },
            2: {
                title: "💡 ¿Por qué Apuntar a la base del fuego?",
                text: "La base es la raíz química de la combustión. El polvo químico seco debe cubrir el combustible directamente, no las llamas superiores.",
                tooltip: "🎯 Apunta el cursor a la BASE del fuego",
                target: "banner"
            },
            3: {
                title: "💡 ¿Por qué Apretar la palanca?",
                text: "Mantiene abierta la válvula para expulsar el polvo químico seco (PQS) con flujo continuo, impulsado por el gas presurizado interno.",
                tooltip: "🖐️ MANTÉN PRESIONADO EL CLIC para liberar el polvo",
                target: "banner"
            },
            4: {
                title: "💡 ¿Por qué Barrer de lado a lado?",
                text: "Crea un manto de polvo uniforme sobre toda la superficie del combustible, interrumpiendo la reacción química en cadena del fuego.",
                tooltip: "↔️ BARRER de lado a lado manteniendo presionado el clic",
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
// (ver pygame.html), llamando a startPqsSimulator().
let game = null;

function startPqsSimulator() {
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
        scene: SimulatorScene
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
        q: "1. ¿Qué significa PQS y de qué está compuesto principalmente el agente extintor?",
        options: [
            "Polvo Químico Seco, a base de fosfato monoamónico u otros compuestos químicos",
            "Presión Química Sintética, a base de agua carbonatada",
            "Producto Químico Sólido, a base de espuma mecánica"
        ],
        answer: 0,
        explanation: "Correcto: PQS es Polvo Químico Seco, un agente en polvo (frecuentemente fosfato monoamónico) de uso múltiple."
    },
    {
        q: "2. ¿Para qué clases de fuego es eficaz el Extintor PQS?",
        options: [
            "Solo fuegos de origen eléctrico (Clase C)",
            "Fuegos Clase A (sólidos), B (líquidos inflamables) y C (eléctricos)",
            "Únicamente fuegos de metales (Clase D)"
        ],
        answer: 1,
        explanation: "Correcto: El PQS es un agente multipropósito, eficaz en fuegos Clase A, B y C."
    },
    {
        q: "3. Antes de accionar el Extintor PQS, ¿por qué es recomendable agitarlo?",
        options: [
            "Para enfriar el gas propulsor interno",
            "Para evitar que el polvo se compacte y asegurar una descarga uniforme",
            "Para verificar el color de la etiqueta"
        ],
        answer: 1,
        explanation: "Correcto: Agitarlo evita que el polvo se asiente y compacte, garantizando un flujo parejo al descargarlo."
    },
    {
        q: "4. ¿Por qué es fundamental Tirar (T) del seguro antes de intentar accionar el extintor PQS?",
        options: [
            "Para permitir la salida del gas propulsor del tanque",
            "Porque desengancha la palanca de percusión y rompe el precinto de seguridad",
            "Para verificar la fecha de vencimiento del extintor"
        ],
        answer: 1,
        explanation: "Correcto: El seguro bloquea mecánicamente la palanca para evitar descargas accidentales durante el transporte o almacenamiento."
    },
    {
        q: "5. En el paso final 'B' (Barrer), ¿por qué es necesario mover la manguera del PQS horizontalmente?",
        options: [
            "Para evitar que el operador se fatigue",
            "Para crear una capa uniforme de polvo que cubra todo el frente del fuego y prevenga la reignición",
            "Para despejar el humo del camino de evacuación"
        ],
        answer: 1,
        explanation: "Correcto: El movimiento de barrido extiende la cobertura del polvo químico sobre toda la superficie del fuego."
    }
];

let currentQ = 0;
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
        score += 20; // 20 puntos por respuesta correcta (5 preguntas = 100 pts)
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
    if (finalScoreEl) finalScoreEl.innerText = `${score}%`;
}

function saveAndReturn(targetUrl) {
    let metrics = JSON.parse(localStorage.getItem('omniTrainMetrics')) || {
        scenariosCompleted: 0,
        moduleProgress: 0,
        bestScore: 0,
        quiz1Score: 0,
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

    // Puntaje específico de este cuestionario (Extintor PQS), usado para
    // decidir si se desbloquea el siguiente escenario (Extintor CO₂)
    if (score > (metrics.quiz1Score || 0)) {
        metrics.quiz1Score = score;
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