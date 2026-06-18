// 观小远赛龙舟 - 网页版游戏
// 浏览器直接运行

const GAME_CONFIG = {
    INITIAL_SPEED: 3,
    MAX_SPEED: 10,
    SPAWN_RATE_INITIAL: 60,
    SPAWN_RATE_MIN: 15,
    GRAVITY: 0.5,
    JUMP_POWER: -10,
    
    PHASES: {
        EASY: { time: 0, speed: 1, spawnRate: 60, label: '简单', color: '#90EE90' },
        MEDIUM: { time: 30, speed: 1.5, spawnRate: 40, label: '中等', color: '#FFD700' },
        HARD: { time: 60, speed: 2, spawnRate: 25, label: '困难', color: '#FF8C00' },
        INSANE: { time: 90, speed: 2.8, spawnRate: 18, label: '极限', color: '#FF4500' }
    }
};

class DragonBoatGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布尺寸
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 游戏状态
        this.state = 'MENU';
        this.score = 0;
        this.gameTime = 0;
        this.frameCount = 0;
        this.speed = GAME_CONFIG.INITIAL_SPEED;
        
        // 玩家
        this.player = {
            x: 80,
            y: 0,
            width: 60,
            height: 40,
            velocity: 0,
            shield: false,
            shieldTime: 0
        };
        
        // 游戏对象
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.bgOffset = 0;
        this.riverOffset = 0;
        
        // 最高分
        this.highScore = parseInt(localStorage.getItem('dragonBoatHighScore')) || 0;
        
        this.bindEvents();
        this.loop();
    }
    
    resize() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 重置玩家位置
        if (this.state === 'MENU') {
            this.player.y = this.height / 2;
        }
    }
    
    bindEvents() {
        // 鼠标点击
        this.canvas.addEventListener('mousedown', (e) => this.handleInput(e));
        
        // 触摸
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput(e);
        }, { passive: false });
        
        // 键盘
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });
        
        // 开始界面点击
        document.getElementById('startOverlay').addEventListener('click', () => {
            if (this.state === 'MENU') {
                this.start();
            }
        });
    }
    
    handleInput(e) {
        if (this.state === 'PLAYING') {
            this.jump();
        } else if (this.state === 'MENU') {
            this.start();
        }
    }
    
    start() {
        this.state = 'PLAYING';
        this.score = 0;
        this.gameTime = 0;
        this.frameCount = 0;
        this.speed = GAME_CONFIG.INITIAL_SPEED;
        this.player.y = this.height / 2;
        this.player.velocity = 0;
        this.player.shield = false;
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        
        document.getElementById('startOverlay').classList.add('hidden');
        document.getElementById('gameOverOverlay').style.display = 'none';
    }
    
    restart() {
        this.start();
    }
    
    jump() {
        this.player.velocity = GAME_CONFIG.JUMP_POWER;
        this.createSplash(this.player.x + this.player.width/2, this.player.y + this.player.height);
    }
    
    update() {
        if (this.state !== 'PLAYING') return;
        
        this.frameCount++;
        this.gameTime = this.frameCount / 60;
        
        this.updateDifficulty();
        this.updatePlayer();
        this.spawnObjects();
        this.updateObstacles();
        this.updateItems();
        this.updateParticles();
        this.checkCollisions();
        
        this.bgOffset += this.speed * 0.3;
        this.riverOffset += this.speed;
        
        // 更新UI
        this.updateUI();
    }
    
    updateDifficulty() {
        const t = this.gameTime;
        let phase = GAME_CONFIG.PHASES.EASY;
        
        if (t >= GAME_CONFIG.PHASES.INSANE.time) {
            phase = GAME_CONFIG.PHASES.INSANE;
        } else if (t >= GAME_CONFIG.PHASES.HARD.time) {
            phase = GAME_CONFIG.PHASES.HARD;
        } else if (t >= GAME_CONFIG.PHASES.MEDIUM.time) {
            phase = GAME_CONFIG.PHASES.MEDIUM;
        }
        
        const targetSpeed = GAME_CONFIG.INITIAL_SPEED * phase.speed;
        this.speed += (targetSpeed - this.speed) * 0.01;
        
        this.currentPhase = phase;
    }
    
    updatePlayer() {
        this.player.velocity += GAME_CONFIG.GRAVITY;
        this.player.y += this.player.velocity;
        
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocity = 0;
        }
        if (this.player.y > this.height - this.player.height) {
            this.player.y = this.height - this.player.height;
            this.player.velocity = 0;
        }
        
        if (this.player.shield) {
            this.player.shieldTime--;
            if (this.player.shieldTime <= 0) {
                this.player.shield = false;
            }
        }
    }
    
    spawnObjects() {
        const spawnRate = Math.max(
            GAME_CONFIG.SPAWN_RATE_MIN,
            GAME_CONFIG.SPAWN_RATE_INITIAL - Math.floor(this.gameTime * 0.5)
        );
        
        if (this.frameCount % spawnRate === 0) {
            const type = Math.random();
            if (type < 0.6) {
                this.spawnObstacle();
            } else {
                this.spawnItem();
            }
        }
    }
    
    spawnObstacle() {
        const types = ['ROCK', 'WHIRLPOOL', 'WOOD'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.obstacles.push({
            x: this.width,
            y: Math.random() * (this.height - 100) + 50,
            width: 45,
            height: 45,
            type: type,
            rotation: 0
        });
    }
    
    spawnItem() {
        const types = [
            { type: 'ZONGZI', score: 10, chance: 0.6, emoji: '🎁' },
            { type: 'CHART', score: 50, chance: 0.25, emoji: '📊' },
            { type: 'AMULET', score: 0, chance: 0.15, emoji: '🧧' }
        ];
        
        const rand = Math.random();
        let cumulative = 0;
        let selected = types[0];
        
        for (const item of types) {
            cumulative += item.chance;
            if (rand < cumulative) {
                selected = item;
                break;
            }
        }
        
        this.items.push({
            x: this.width,
            y: Math.random() * (this.height - 100) + 50,
            width: 40,
            height: 40,
            ...selected
        });
    }
    
    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;
            obs.rotation += 0.05;
            
            if (obs.x < -obs.width) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    updateItems() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.x -= this.speed;
            
            if (item.x < -item.width) {
                this.items.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    createSplash(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * -4,
                life: 25,
                maxLife: 25,
                alpha: 1,
                color: '#4FC3F7',
                size: Math.random() * 5 + 2
            });
        }
    }
    
    createSparkle(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 35,
                maxLife: 35,
                alpha: 1,
                color: color,
                size: Math.random() * 4 + 1
            });
        }
    }
    
    checkCollisions() {
        const p = this.player;
        const playerRect = {
            x: p.x + 10,
            y: p.y + 5,
            width: p.width - 20,
            height: p.height - 10
        };
        
        for (const obs of this.obstacles) {
            if (this.isColliding(playerRect, obs)) {
                if (p.shield) {
                    p.shield = false;
                    this.createSparkle(obs.x, obs.y, '#FFD700');
                } else {
                    this.gameOver();
                    return;
                }
            }
        }
        
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (this.isColliding(playerRect, item)) {
                this.collectItem(item);
                this.items.splice(i, 1);
            }
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    collectItem(item) {
        if (item.type === 'ZONGZI') {
            this.score += item.score;
            this.createSparkle(item.x, item.y, '#8B4513');
        } else if (item.type === 'CHART') {
            this.score += item.score;
            this.createSparkle(item.x, item.y, '#00CED1');
        } else if (item.type === 'AMULET') {
            this.player.shield = true;
            this.player.shieldTime = 360;
            this.createSparkle(item.x, item.y, '#FFD700');
        }
    }
    
    gameOver() {
        this.state = 'GAMEOVER';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('dragonBoatHighScore', this.highScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('highScoreValue').textContent = this.highScore;
        document.getElementById('gameOverOverlay').style.display = 'flex';
    }
    
    updateUI() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('timeValue').textContent = Math.floor(this.gameTime);
        
        const diffEl = document.getElementById('difficultyValue');
        if (this.currentPhase) {
            diffEl.textContent = this.currentPhase.label;
            diffEl.style.color = this.currentPhase.color;
        }
    }
    
    draw() {
        const ctx = this.ctx;
        
        // 清空画布
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawBackground(ctx);
        this.drawRiver(ctx);
        this.drawParticles(ctx);
        this.drawObstacles(ctx);
        this.drawItems(ctx);
        this.drawPlayer(ctx);
    }
    
    drawBackground(ctx) {
        // 天空渐变 - 观远科技蓝风格
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.4, '#B0E0E6');
        gradient.addColorStop(0.7, '#E0F6FF');
        gradient.addColorStop(1, '#F0F8FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 太阳
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.width - 60, 60, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // 云朵
        this.drawCloud(ctx, 100 - (this.bgOffset * 0.1) % (this.width + 200), 80);
        this.drawCloud(ctx, 300 - (this.bgOffset * 0.15) % (this.width + 200), 120);
        
        // 远山
        ctx.fillStyle = '#90EE90';
        const mountainOffset = this.bgOffset * 0.2 % this.width;
        for (let i = -1; i <= 2; i++) {
            this.drawMountain(ctx, i * this.width - mountainOffset, this.height * 0.45);
        }
        
        // 观远数据 - 背景水印文字
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = '#00CED1';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.rotate(-Math.PI / 6);
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.fillText('观远数据', i * 200 - 100, j * 200 + 100);
            }
        }
        ctx.restore();
    }
    
    drawCloud(ctx, x, y) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 30, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawMountain(ctx, x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.width * 0.15, y - this.height * 0.12);
        ctx.lineTo(x + this.width * 0.3, y - this.height * 0.06);
        ctx.lineTo(x + this.width * 0.45, y - this.height * 0.15);
        ctx.lineTo(x + this.width * 0.6, y - this.height * 0.08);
        ctx.lineTo(x + this.width * 0.75, y - this.height * 0.18);
        ctx.lineTo(x + this.width, y);
        ctx.closePath();
        ctx.fill();
    }
    
    drawRiver(ctx) {
        // 河水
        const riverGradient = ctx.createLinearGradient(0, this.height * 0.4, 0, this.height);
        riverGradient.addColorStop(0, '#4FC3F7');
        riverGradient.addColorStop(1, '#0288D1');
        ctx.fillStyle = riverGradient;
        ctx.fillRect(0, this.height * 0.4, this.width, this.height * 0.6);
        
        // 水波纹
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const y = this.height * 0.5 + i * (this.height * 0.08);
            const offset = (this.riverOffset + i * 80) % 150;
            ctx.beginPath();
            for (let x = -50; x < this.width + 50; x += 80) {
                ctx.moveTo(x - offset, y);
                ctx.quadraticCurveTo(x + 40 - offset, y + 12, x + 80 - offset, y);
            }
            ctx.stroke();
        }
    }
    
    drawPlayer(ctx) {
        const p = this.player;
        
        // 护盾效果
        if (p.shield) {
            const pulse = 0.5 + Math.sin(this.frameCount * 0.15) * 0.3;
            ctx.beginPath();
            ctx.arc(p.x + p.width/2, p.y + p.height/2, 40, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(p.x + p.width/2, p.y + p.height/2, 35, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // 龙舟主体
        ctx.fillStyle = '#D2691E';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width/2, p.y + p.height/2 + 5, p.width/2, p.height/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 龙舟纹理
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 10, p.y + p.height/2);
        ctx.lineTo(p.x + p.width - 10, p.y + p.height/2);
        ctx.stroke();
        
        // 龙舟头部（龙头简化版）
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(p.x + p.width, p.y + p.height/2 - 5);
        ctx.lineTo(p.x + p.width + 20, p.y + p.height/2 - 15);
        ctx.lineTo(p.x + p.width + 15, p.y + p.height/2);
        ctx.lineTo(p.x + p.width + 20, p.y + p.height/2 + 15);
        ctx.lineTo(p.x + p.width, p.y + p.height/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // 龙角
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x + p.width + 5, p.y + p.height/2 - 10);
        ctx.lineTo(p.x + p.width + 10, p.y + p.height/2 - 20);
        ctx.moveTo(p.x + p.width + 10, p.y + p.height/2 - 8);
        ctx.lineTo(p.x + p.width + 18, p.y + p.height/2 - 18);
        ctx.stroke();
        
        // 龙眼睛
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(p.x + p.width + 8, p.y + p.height/2 - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(p.x + p.width + 9, p.y + p.height/2 - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 观小远（观远数据吉祥物）
        // 身体
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.ellipse(p.x + 25, p.y + 15, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 观远蓝马甲
        ctx.fillStyle = '#00CED1';
        ctx.beginPath();
        ctx.ellipse(p.x + 25, p.y + 15, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 头
        ctx.fillStyle = '#FFC0CB';
        ctx.beginPath();
        ctx.arc(p.x + 25, p.y + 5, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(p.x + 22, p.y + 3, 2, 0, Math.PI * 2);
        ctx.arc(p.x + 28, p.y + 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 微笑
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x + 25, p.y + 5, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        // 观远logo简化 - 胸前小图标
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 6px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('G', p.x + 25, p.y + 17);
        
        // 船桨动画
        const paddleAngle = Math.sin(this.frameCount * 0.25) * 0.6;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x + 35, p.y + 20);
        ctx.lineTo(
            p.x + 35 + Math.sin(paddleAngle) * 20,
            p.y + 40 + Math.cos(paddleAngle) * 10
        );
        ctx.stroke();
        
        // 桨叶
        ctx.fillStyle = '#654321';
        const paddleX = p.x + 35 + Math.sin(paddleAngle) * 20;
        const paddleY = p.y + 40 + Math.cos(paddleAngle) * 10;
        ctx.beginPath();
        ctx.ellipse(paddleX, paddleY, 8, 4, paddleAngle, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            if (obs.type === 'ROCK') {
                // 礁石
                ctx.fillStyle = '#696969';
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2.2, 0, Math.PI * 2);
                ctx.fill();
                
                // 高光
                ctx.fillStyle = '#808080';
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2 - 5, obs.y + obs.height/2 - 5, obs.width/6, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'WHIRLPOOL') {
                // 漩涡
                ctx.strokeStyle = '#1565C0';
                ctx.lineWidth = 3;
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        obs.x + obs.width/2,
                        obs.y + obs.height/2,
                        8 + i * 8,
                        obs.rotation + i * 0.5,
                        obs.rotation + i * 0.5 + Math.PI * 1.3
                    );
                    ctx.stroke();
                }
                
                // 中心
                ctx.fillStyle = '#0D47A1';
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'WOOD') {
                // 浮木
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(obs.x, obs.y + obs.height/3, obs.width, obs.height/3);
                
                // 木纹
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 1;
                for (let i = 1; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(obs.x + i * 10, obs.y + obs.height/3);
                    ctx.lineTo(obs.x + i * 10, obs.y + obs.height * 2/3);
                    ctx.stroke();
                }
            }
        }
    }
    
    drawItems(ctx) {
        for (const item of this.items) {
            const centerX = item.x + item.width/2;
            const centerY = item.y + item.height/2;
            
            // 漂浮动画
            const float = Math.sin(this.frameCount * 0.1) * 3;
            
            if (item.type === 'ZONGZI') {
                // 粽子
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 15 + float);
                ctx.lineTo(centerX + 15, centerY + float);
                ctx.lineTo(centerX, centerY + 15 + float);
                ctx.lineTo(centerX - 15, centerY + float);
                ctx.closePath();
                ctx.fill();
                
                // 绳子
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 15 + float);
                ctx.lineTo(centerX, centerY + 15 + float);
                ctx.moveTo(centerX - 15, centerY + float);
                ctx.lineTo(centerX + 15, centerY + float);
                ctx.stroke();
            } else if (item.type === 'CHART') {
                // 观远数据图表道具
                // 背景板
                ctx.fillStyle = '#FFF';
                ctx.fillRect(centerX - 18, centerY - 18 + float, 36, 36);
                ctx.strokeStyle = '#00CED1';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 18, centerY - 18 + float, 36, 36);
                
                // 柱状图 - 观远蓝色系
                const barColors = ['#00CED1', '#20B2AA', '#48D1CC', '#5F9EA0'];
                const barWidth = 6;
                const barGap = 2;
                const bars = [0.5, 0.8, 1.0, 0.7];
                
                bars.forEach((h, i) => {
                    const barHeight = 22 * h;
                    ctx.fillStyle = barColors[i];
                    ctx.fillRect(
                        centerX - 14 + i * (barWidth + barGap),
                        centerY + 10 - barHeight + float,
                        barWidth,
                        barHeight
                    );
                });
                
                // "数"字标识
                ctx.fillStyle = '#00CED1';
                ctx.font = 'bold 8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('数', centerX, centerY - 22 + float);
                
                // 星星装饰
                ctx.fillStyle = '#FFD700';
                for (let i = 0; i < 3; i++) {
                    const sx = centerX + (i - 1) * 20;
                    const sy = centerY - 25 + float + Math.sin(this.frameCount * 0.2 + i) * 3;
                    this.drawStar(ctx, sx, sy, 4, 3);
                }
            } else if (item.type === 'AMULET') {
                // 香囊
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(centerX, centerY + float, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // 边框
                ctx.strokeStyle = '#FF6347';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 福字
                ctx.fillStyle = '#FF6347';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('福', centerX, centerY + 1 + float);
                
                // 流苏
                ctx.strokeStyle = '#FF6347';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY + 15 + float);
                ctx.lineTo(centerX, centerY + 25 + float);
                ctx.stroke();
            }
        }
    }
    
    drawStar(ctx, x, y, radius, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const r = i % 2 === 0 ? radius : radius / 2;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// 启动游戏
let game;
window.onload = () => {
    game = new DragonBoatGame();
};