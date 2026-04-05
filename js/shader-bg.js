(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof THREE === 'undefined') return;

    var INSET = 6;
    var BORDER = 1;

    var canvas = document.createElement('canvas');
    canvas.id = 'shader-bg';
    canvas.style.cssText =
        'position:fixed;top:' + INSET + 'px;left:' + INSET + 'px;' +
        'width:calc(100% - ' + (INSET * 2) + 'px);' +
        'height:calc(100% - ' + (INSET * 2) + 'px);' +
        'z-index:-1;pointer-events:none;will-change:auto;' +
        'border:' + BORDER + 'px solid #2a2a2a;';
    document.body.prepend(canvas);
    document.body.style.backgroundColor = 'transparent';

    function isDark() {
        return document.body.classList.contains('dark');
    }

    function updateFrameColors() {
        var dark = isDark();
        canvas.style.borderColor = dark ? '#2a2a2a' : '#d0d0d0';
        document.documentElement.style.backgroundColor = dark ? '#0f0f0f' : '#f5f5f5';
    }
    updateFrameColors();

    // --- Three.js setup ---
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var vert = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }';

    var frag = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform float uTime;',
        'uniform vec2 uResolution;',
        'uniform float uDark;',
        '',
        'float hash(vec2 p){',
        '  p = fract(p * vec2(127.1, 311.7));',
        '  p += dot(p, p + 19.19);',
        '  return fract(p.x * p.y);',
        '}',
        '',
        'float noise(vec2 p){',
        '  vec2 i = floor(p);',
        '  vec2 f = fract(p);',
        '  vec2 u = f*f*(3.0-2.0*f);',
        '  return mix(',
        '    mix(hash(i), hash(i+vec2(1,0)), u.x),',
        '    mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x),',
        '    u.y',
        '  );',
        '}',
        '',
        'float fbm(vec2 p){',
        '  float v=0.0, a=0.5;',
        '  for(int i=0;i<6;i++){',
        '    v += a*noise(p);',
        '    p = p*2.03 + vec2(1.7,9.2);',
        '    a *= 0.5;',
        '  }',
        '  return v;',
        '}',
        '',
        'void main(){',
        '  vec2 uv = vUv;',
        '  vec2 aspect = vec2(uResolution.x/uResolution.y, 1.0);',
        '  vec2 aUv = uv * aspect;',
        '  float t = uTime * 0.13;',
        '',
        '  float p1 = fbm(uv * 1.8 + vec2(t * 0.3, t * 0.17));',
        '  float p2 = fbm(uv * 2.4 + vec2(-t * 0.2 + 3.1, t * 0.25 + 1.7));',
        '  float patches = p1 * p2;',
        '  patches = smoothstep(0.20, 0.42, patches);',
        '',
        '  float angleField = fbm(uv * 2.2 + vec2(t * 0.15, t * 0.1)) * 6.2832 * 2.0;',
        '  vec2 dir = vec2(cos(angleField), sin(angleField));',
        '  vec2 perp = vec2(-dir.y, dir.x);',
        '',
        '  vec2 sUv = vec2(dot(aUv * 5.5, dir) + t * 1.4, dot(aUv * 5.5, perp) * 3.8);',
        '  float streak = fbm(sUv);',
        '  streak = pow(streak, 2.8);',
        '',
        '  vec2 grainUv = uv * 55.0 + vec2(t * 1.8, t * 1.1);',
        '  float grain = noise(grainUv);',
        '  grain = pow(grain, 5.5);',
        '',
        '  float grain2 = noise(uv * 28.0 + vec2(-t*0.9, t*1.3));',
        '  grain2 = pow(grain2, 4.2);',
        '',
        '  float combined = streak * 0.35 + grain * 0.30 + grain2 * 0.12;',
        '  combined *= patches;',
        '  combined = pow(combined, 1.1);',
        '  combined = clamp(combined * 2.2, 0.0, 1.0);',
        '',
        '  vec2 edgeDist = abs(uv - 0.5) * 2.0;',
        '  float vignette = 1.0 - smoothstep(0.55, 1.0, max(edgeDist.x, edgeDist.y));',
        '',
        '  vec3 darkBg    = vec3(0.05, 0.05, 0.06);',
        '  vec3 darkGrain = vec3(0.62, 0.60, 0.56);',
        '  vec3 lightBg   = vec3(0.96, 0.95, 0.93);',
        '  vec3 lightGrain = vec3(0.28, 0.26, 0.24);',
        '',
        '  vec3 bg       = mix(lightBg,    darkBg,    uDark);',
        '  vec3 grainCol = mix(lightGrain, darkGrain, uDark);',
        '',
        '  vec3 col = mix(bg, grainCol, combined * vignette);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
    ].join('\n');

    var material = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
            uTime:       { value: 0 },
            uResolution: { value: new THREE.Vector2() },
            uDark:       { value: isDark() ? 1.0 : 0.0 },
        },
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    var targetDark = isDark() ? 1.0 : 0.0;

    // --- Theme observer ---
    var themeObserver = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].attributeName === 'class') {
                targetDark = isDark() ? 1.0 : 0.0;
                updateFrameColors();
                if (!loopRunning) scheduleFrame();
                break;
            }
        }
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // --- Resize ---
    function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        material.uniforms.uResolution.value.set(w, h);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Render loop ---
    var loopRunning = false;
    var visible = !document.hidden;
    var last = 0;

    function animate(ts) {
        if (!visible) {
            loopRunning = false;
            return;
        }
        loopRunning = true;
        material.uniforms.uTime.value += Math.min((ts - last) / 1000, 0.05);
        last = ts;
        material.uniforms.uDark.value += (targetDark - material.uniforms.uDark.value) * 0.06;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    function scheduleFrame() {
        if (!loopRunning && visible) {
            loopRunning = true;
            requestAnimationFrame(animate);
        }
    }

    document.addEventListener('visibilitychange', function () {
        visible = !document.hidden;
        if (visible) {
            last = performance.now();
            scheduleFrame();
        }
    });

    scheduleFrame();
})();
