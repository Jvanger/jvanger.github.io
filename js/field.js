// Drifting particle field background.
// Full-bleed canvas; dots wander on a slow flow field, scatter from the
// cursor, and link up with hairline constellation segments near it.
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var canvas = document.createElement('canvas');
    canvas.id = 'field-bg';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.prepend(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var W = 0, H = 0;
    var particles = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var eased = { x: -9999, y: -9999 };

    var LINK_RADIUS = 130;     // px around cursor where constellation lines appear
    var REPEL_RADIUS = 110;
    var DENSITY = 1 / 9000;    // particles per px²

    function isDark() {
        return document.body.classList.contains('dark');
    }

    var colors = { dot: 'rgba(233,231,226,0.5)', link: '233,231,226' };
    function updateColors() {
        if (isDark()) {
            colors.dot = 'rgba(233,231,226,';
            colors.link = '233,231,226';
        } else {
            colors.dot = 'rgba(28,27,24,';
            colors.link = '28,27,24';
        }
    }
    updateColors();

    new MutationObserver(updateColors)
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });

    function spawn(x, y) {
        return {
            x: x, y: y,
            vx: 0, vy: 0,
            // phase offsets make each dot drift on its own slow orbit
            p1: Math.random() * Math.PI * 2,
            p2: Math.random() * Math.PI * 2,
            r: 0.7 + Math.random() * 1.2,
            a: 0.18 + Math.random() * 0.4,
            tw: 0.4 + Math.random() * 0.8 // twinkle speed
        };
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var target = Math.floor(W * H * DENSITY);
        while (particles.length < target) {
            particles.push(spawn(Math.random() * W, Math.random() * H));
        }
        particles.length = target;
    }
    resize();
    window.addEventListener('resize', resize);

    if (window.matchMedia('(hover: hover)').matches) {
        window.addEventListener('pointermove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        });
        document.addEventListener('pointerleave', function () {
            mouse.active = false;
        });
    }

    // flow field: layered sines, cheap and organic
    function flowAngle(x, y, t) {
        return Math.sin(x * 0.0016 + t * 0.18) +
               Math.cos(y * 0.0013 - t * 0.13) +
               Math.sin((x + y) * 0.0008 + t * 0.07);
    }

    var t = Math.random() * 100;
    var last = performance.now();

    function frame(now) {
        var dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        t += dt;

        eased.x += ((mouse.active ? mouse.x : -9999) - eased.x) * 0.08;
        eased.y += ((mouse.active ? mouse.y : -9999) - eased.y) * 0.08;

        ctx.clearRect(0, 0, W, H);

        var near = []; // particles close to cursor, for linking

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            var ang = flowAngle(p.x + Math.sin(p.p1) * 40, p.y + Math.cos(p.p2) * 40, t) * Math.PI;
            p.vx += Math.cos(ang) * 1.6 * dt;
            p.vy += Math.sin(ang) * 1.6 * dt;

            if (mouse.active) {
                var dx = p.x - eased.x;
                var dy = p.y - eased.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
                    var d = Math.sqrt(d2);
                    var f = (1 - d / REPEL_RADIUS) * 22 * dt;
                    p.vx += (dx / d) * f;
                    p.vy += (dy / d) * f;
                }
                if (d2 < LINK_RADIUS * LINK_RADIUS) near.push(p);
            }

            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;

            var alpha = p.a * (0.65 + 0.35 * Math.sin(t * p.tw + p.p1));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = colors.dot + alpha.toFixed(3) + ')';
            ctx.fill();
        }

        // constellation segments between cursor-adjacent dots
        for (var a = 0; a < near.length; a++) {
            for (var b = a + 1; b < near.length; b++) {
                var ddx = near[a].x - near[b].x;
                var ddy = near[a].y - near[b].y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 80 * 80) {
                    var la = (1 - Math.sqrt(dd) / 80) * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(near[a].x, near[a].y);
                    ctx.lineTo(near[b].x, near[b].y);
                    ctx.strokeStyle = 'rgba(' + colors.link + ',' + la.toFixed(3) + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        if (!document.hidden) requestAnimationFrame(frame);
        else running = false;
    }

    function drawStatic() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = colors.dot + p.a.toFixed(3) + ')';
            ctx.fill();
        }
    }

    var running = false;
    function start() {
        if (reduceMotion) { drawStatic(); return; }
        if (!running) {
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }
    }

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) start();
    });

    if (reduceMotion) {
        // re-render static field on theme change / resize
        new MutationObserver(drawStatic)
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('resize', drawStatic);
    }

    start();
})();
