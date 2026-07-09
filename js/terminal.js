/* ============================================================
   jsh — the jonathan-fang shell
   A portfolio disguised as a machine.
   ============================================================ */

(function () {
    'use strict';

    // ---------- DOM ----------
    const term = document.getElementById('terminal');
    const output = document.getElementById('output');
    const promptLine = document.getElementById('promptLine');
    const promptLabel = document.getElementById('promptLabel');
    const typedEl = document.getElementById('typed');
    const cursorEl = document.getElementById('cursor');
    const afterEl = document.getElementById('typedAfter');
    const kbd = document.getElementById('kbd');
    const fx = document.getElementById('fx');
    const trainEl = document.getElementById('train');
    const vimEl = document.getElementById('vim');
    const vimBody = document.getElementById('vimBody');
    const vimStatus = document.getElementById('vimStatus');
    const vimCmd = document.getElementById('vimCmd');

    // ---------- state ----------
    let user = 'guest';
    const host = 'jonathan-fang';
    let cwd = '/home/guest';
    let mode = 'boot'; // boot | shell | vim | matrix | busy
    const history = [];
    let histIdx = 0;
    let histStash = '';
    let sudoCount = 0;
    const bootTime = Date.now();
    let matrixTimer = null;
    let vimHintTimer = null;

    // ---------- helpers ----------
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const span = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
    const cmdLink = c => `<span class="cmd" data-cmd="${esc(c)}">${esc(c)}</span>`;
    const link = url => `<a class="t-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;

    function print(html = '') {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = html || '&nbsp;';
        output.appendChild(div);
        return div;
    }

    function printBlock(text, cls = '') {
        const pre = document.createElement('pre');
        pre.className = 'block ' + cls;
        pre.textContent = text;
        output.appendChild(pre);
        return pre;
    }

    function printBanner(text, cls = '') {
        const pre = document.createElement('pre');
        pre.className = 'banner ' + cls;
        pre.textContent = text;
        output.appendChild(pre);
        return pre;
    }

    function scrollBottom() {
        term.scrollTop = term.scrollHeight;
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ---------- banner ----------
    const BANNER_TOP = [
        '     ██╗ ██████╗ ███╗   ██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗',
        '     ██║██╔═══██╗████╗  ██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║',
        '     ██║██║   ██║██╔██╗ ██║███████║   ██║   ███████║███████║██╔██╗ ██║',
        '██   ██║██║   ██║██║╚██╗██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║',
        '╚█████╔╝╚██████╔╝██║ ╚████║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║',
        ' ╚════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝'
    ].join('\n');

    const BANNER_BOTTOM = [
        '███████╗ █████╗ ███╗   ██╗ ██████╗ ',
        '██╔════╝██╔══██╗████╗  ██║██╔════╝ ',
        '█████╗  ███████║██╔██╗ ██║██║  ███╗',
        '██╔══╝  ██╔══██║██║╚██╗██║██║   ██║',
        '██║     ██║  ██║██║ ╚████║╚██████╔╝',
        '╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ '
    ].join('\n');

    // ---------- virtual filesystem ----------
    function file(content, opts = {}) {
        return Object.assign({ type: 'file', content }, opts);
    }
    function dir(children, opts = {}) {
        return Object.assign({ type: 'dir', children }, opts);
    }

    const projectMeta = {
        'media-bias-lab.txt': { slug: 'media-bias-lab', size: '2.4K', date: 'Aug 12  2025' },
        'strava-mule.txt': { slug: 'strava-mule', size: '2.1K', date: 'Jun 20  2025' },
        'partial-scan-optimization.txt': { slug: 'partial-scan-test-design-optimization', size: '1.9K', date: 'May  9  2025' },
        'github-backfill.txt': { slug: 'github-contribution-backfill', size: '2.2K', date: 'Apr 17  2025' },
        'campus-digital-id.txt': { slug: 'campus-digital-id-platform', size: '2.0K', date: 'Dec  8  2024' },
        'infrared-sensor-fusion.txt': { slug: 'infrared-sensor-fusion', size: '1.8K', date: 'Nov 21  2023' },
        'psoc6-console.txt': { slug: 'psoc6-embedded-console-board', size: '1.7K', date: 'Nov  4  2023' }
    };

    const FS = dir({
        bin: dir({}, { size: '4.0K', date: 'Jul  6 08:00' }),
        etc: dir({
            hostname: file('jonathan-fang\n', { size: '14', date: 'Jul  6 08:00' }),
            motd: file(
                'welcome to jonathan-fang.\n' +
                'a portfolio disguised as a machine.\n\n' +
                'be kind to the filesystem. it is read-only,\n' +
                'but it has feelings.\n',
                { size: '138', date: 'Jul  6 08:00' })
        }, { size: '4.0K', date: 'Jul  6 08:00' }),
        home: dir({
            guest: dir({
                'README.md': file(
                    '# jonathan-fang\n\n' +
                    'hardware × software engineer, san francisco.\n\n' +
                    '  about.txt      who i am\n' +
                    '  projects/      selected work, 2023 — 2025\n' +
                    '  thoughts/      essays from substack\n' +
                    '  contact/       where to find me\n' +
                    '  resume.pdf     the formal version\n\n' +
                    'cat a file to read it here. open a file for the GUI.\n',
                    { size: '412', date: 'Jul  6 08:00' }),
                'about.txt': file(
                    'ABOUT — JONATHAN FANG\n' +
                    '────────────────────────────────────────────────────\n' +
                    'ece grad from uw-madison, now in the bay area as a\n' +
                    'test development engineer at cisco — modernizing\n' +
                    'manufacturing diagnostics for catalyst 9400\n' +
                    'switches, plus product operations for supply chain\n' +
                    'at international sites. also an ai engineering\n' +
                    'research fellow at handshake ai (analog circuits ×\n' +
                    'llms). starting an mscs at georgia tech this fall.\n\n' +
                    'the throughline is hardware × software: spi\n' +
                    'controllers and fpga timing constraints on one end,\n' +
                    'full-stack apps with oauth and stripe on the other.\n' +
                    'i get restless when projects stay theoretical.\n\n' +
                    'free time: prototyping things i probably won\'t\n' +
                    'finish, writing on substack, photoshop composites\n' +
                    'when i need a different part of my brain.\n\n' +
                    'previous lives in hospitality: see ~/.past-lives\n',
                    { size: '812', date: 'Jul  6 08:00', gui: 'home.html#about' }),
                projects: dir({
                    'media-bias-lab.txt': file(
                        'MEDIA BIAS LAB                                aug \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'full-stack app that analyzes news articles across\n' +
                        'five bias dimensions with gpt-4 — political bias,\n' +
                        'emotional tone, factual accuracy, sensationalism,\n' +
                        'and source credibility — with interactive\n' +
                        'visualizations and keyword analysis.\n\n' +
                        'stack : react · vite · express · openai · gcp nlp\n' +
                        'demo  : https://bias-frontend-deploy.vercel.app/\n',
                        { gui: 'home.html?p=media-bias-lab' }),
                    'strava-mule.txt': file(
                        'STRAVA MULE                                   jun \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'gpx activity simulator generating biometrically\n' +
                        'accurate fitness data — realistic elevation,\n' +
                        'fatigue modeling, pace variation. the generated\n' +
                        'activities are indistinguishable from real ones.\n\n' +
                        'stack : javascript · node · leaflet · postgresql\n' +
                        'demo  : https://www.stravamule.app/\n',
                        { gui: 'home.html?p=strava-mule' }),
                    'partial-scan-optimization.txt': file(
                        'PARTIAL SCAN TEST DESIGN OPTIMIZATION         may \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'optimized partial scan testing architecture:\n' +
                        '46% efficiency improvement, 80% shorter chains vs.\n' +
                        'full scan, strategic flip-flop selection with\n' +
                        'maintained fault coverage.\n\n' +
                        'stack : systemverilog · synopsys · jtag · tetramax\n' +
                        'code  : https://github.com/Jvanger/b14-scan-design\n',
                        { gui: 'home.html?p=partial-scan-test-design-optimization' }),
                    'github-backfill.txt': file(
                        'GITHUB CONTRIBUTION BACKFILL                  apr \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'saas platform for github contribution backfilling.\n' +
                        'oauth flows, stripe subscription tiers, supabase\n' +
                        'backend — no command line required.\n\n' +
                        'stack : react · next.js · supabase · stripe\n' +
                        'demo  : https://backfill-contribution.vercel.app/\n',
                        { gui: 'home.html?p=github-contribution-backfill' }),
                    'campus-digital-id.txt': file(
                        'CAMPUS DIGITAL ID PLATFORM                    dec \'24\n' +
                        '────────────────────────────────────────────────────\n' +
                        'digital student id for uw madison — class\n' +
                        'navigation, peer matching, assignment tracking,\n' +
                        'nfc-enabled instant profile sharing. actually got\n' +
                        'deployed.\n\n' +
                        'stack : react native · firebase · nfc · maps api\n' +
                        'code  : https://github.com/Jvanger/Wisc-Wallet\n',
                        { gui: 'home.html?p=campus-digital-id-platform' }),
                    'infrared-sensor-fusion.txt': file(
                        'INFRARED SENSOR FUSION                        nov \'23\n' +
                        '────────────────────────────────────────────────────\n' +
                        'autonomous maze-solving robot. custom spi\n' +
                        'controller for a 6-axis imu, real-time sensor\n' +
                        'fusion on fpga, python path planning. sub-5%\n' +
                        'positioning error.\n\n' +
                        'stack : systemverilog · python · fpga · rtl sim\n' +
                        'code  : https://github.com/Jvanger/MazeSolver\n',
                        { gui: 'home.html?p=infrared-sensor-fusion' }),
                    'psoc6-console.txt': file(
                        'PSOC6 EMBEDDED MULTIPLAYER CONSOLE            nov \'23\n' +
                        '────────────────────────────────────────────────────\n' +
                        'modular game console on the cypress psoc6.\n' +
                        'freertos task management, hot-swappable game\n' +
                        'modules, custom 16-bit spi lcd drivers, i2c/uart\n' +
                        'peripherals, gpio interrupt input handling.\n\n' +
                        'stack : c · freertos · psoc6 · spi · i2c · uart\n' +
                        'code  : https://github.com/Jvanger/Cortex-Board\n',
                        { gui: 'home.html?p=psoc6-embedded-console-board' })
                }, { size: '4.0K', date: 'Aug 12  2025' }),
                thoughts: dir({
                    'emergency-contact.md': file(
                        'EMERGENCY CONTACT                             jun \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'on what it means to matter.\n\n' +
                        'full essay lives on substack:\n' +
                        'https://jonathanfang.substack.com/p/emergency-contact\n',
                        { size: '96', date: 'Jun 14  2025', gui: 'https://jonathanfang.substack.com/p/emergency-contact', external: true }),
                    'midwestern-ache.md': file(
                        'MIDWESTERN ACHE                               may \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'reflections in the 608.\n\n' +
                        'full essay lives on substack:\n' +
                        'https://jonathanfang.substack.com/p/midwestern-ache\n',
                        { size: '88', date: 'May 10  2025', gui: 'https://jonathanfang.substack.com/p/midwestern-ache', external: true }),
                    'bruise-colored-memories.md': file(
                        'BRUISE COLORED MEMORIES                       mar \'25\n' +
                        '────────────────────────────────────────────────────\n' +
                        'corner store confessions & tender severance.\n\n' +
                        'full essay lives on substack:\n' +
                        'https://jonathanfang.substack.com/p/bruise-colored-memories\n',
                        { size: '104', date: 'Mar 22  2025', gui: 'https://jonathanfang.substack.com/p/bruise-colored-memories', external: true }),
                    'indifference-or-insecurity.md': file(
                        'INDIFFERENCE OR INSECURITY                    sep \'24\n' +
                        '────────────────────────────────────────────────────\n' +
                        'and what it means for relationships.\n\n' +
                        'full essay lives on substack:\n' +
                        'https://jonathanfang.substack.com/p/indifference-or-security\n',
                        { size: '92', date: 'Sep 28  2024', gui: 'https://jonathanfang.substack.com/p/indifference-or-security', external: true })
                }, { size: '4.0K', date: 'Jun 14  2025' }),
                contact: dir({
                    'github.url': file('https://github.com/jvanger\n',
                        { size: '27', date: 'Jul  6 08:00', gui: 'https://github.com/jvanger', external: true }),
                    'linkedin.url': file('https://www.linkedin.com/in/jfangg/\n',
                        { size: '36', date: 'Jul  6 08:00', gui: 'https://www.linkedin.com/in/jfangg/', external: true }),
                    'substack.url': file('https://jonathanfang.substack.com\n',
                        { size: '34', date: 'Jul  6 08:00', gui: 'https://jonathanfang.substack.com', external: true })
                }, { size: '4.0K', date: 'Jul  6 08:00' }),
                'resume.pdf': file(null,
                    { size: '115K', date: 'Jul  6 08:00', gui: 'Resume.pdf', external: true, binary: true }),
                '.past-lives': file(
                    'PAST LIVES — THE THIRD-SPACE RÉSUMÉ\n' +
                    '────────────────────────────────────────────────────\n' +
                    'before (and between) the engineering:\n\n' +
                    '  * server @ ettan, palo alto — michelin-starred,\n' +
                    '    multi-course tasting menus, craft cocktail lounge\n' +
                    '  * server & barista @ sardine, madison — lakefront\n' +
                    '    french bistro. daily tastings, sommelier training.\n' +
                    '    will absolutely suggest a pairing if you let him\n' +
                    '  * barista @ colectivo coffee — 300+ cups a day,\n' +
                    '    opened and closed the café solo\n' +
                    '  * store supervisor @ leap, palo alto — two\n' +
                    '    sustainable brands, a team of four, weekly KPIs\n' +
                    '  * wedding bartender — private events up to 150 guests\n' +
                    '  * academic tutor — 15 students, algebra 2 → calculus\n\n' +
                    'certifications: food handler\'s license.\n' +
                    'fluent in toast, square, and micros POS. yes, really.\n\n' +
                    'related commands: coffee, wine\n',
                    { size: '742', date: 'Nov  4  2024' }),
                '.secrets': file(
                    'you weren\'t supposed to find this. but since you\'re here:\n\n' +
                    '  * this site has no framework. view-source and weep.\n' +
                    '  * undocumented: sl, cmatrix, fortune, vim, sudo su,\n' +
                    '    coffee, wine, make me a sandwich, rm -rf /\n' +
                    '  * i play minecraft, rotmg, and yearn for my ex(es)\n' +
                    '  * the engineer who built this once ran a michelin\n' +
                    '    section. details: cat ~/.past-lives\n' +
                    '  * if you\'re hiring: open resume.pdf\n',
                    { size: '404', date: 'Jul  6 03:17' })
            }, { size: '4.0K', date: 'Jul  6 08:00' })
        }, { size: '4.0K', date: 'Jul  6 08:00' }),
        tmp: dir({}, { size: '4.0K', date: 'Jul  6 08:00' }),
        usr: dir({}, { size: '4.0K', date: 'Jul  6 08:00' }),
        var: dir({
            log: dir({
                'visitors.log': file(
                    '[03:12:44] recruiter connected. ran ls twice. left.\n' +
                    '[04:37:02] someone typed "hello?" — the machine did not answer.\n' +
                    '[06:15:58] vim opened. session still active. send help.\n' +
                    '[08:00:00] system rebooted for you specifically.\n',
                    { size: '244', date: 'Jul  6 08:00' })
            }, { size: '4.0K', date: 'Jul  6 08:00' })
        }, { size: '4.0K', date: 'Jul  6 08:00' })
    });

    // apply project metadata (sizes/dates) and default file attrs
    (function annotate() {
        const proj = FS.children.home.children.guest.children.projects.children;
        for (const name of Object.keys(proj)) {
            const meta = projectMeta[name];
            if (meta) {
                proj[name].size = meta.size;
                proj[name].date = meta.date;
            }
        }
        (function walk(node) {
            if (node.type === 'dir') {
                node.size = node.size || '4.0K';
                node.date = node.date || 'Jul  6 08:00';
                for (const k of Object.keys(node.children)) walk(node.children[k]);
            } else {
                node.size = node.size || String((node.content || '').length);
                node.date = node.date || 'Jul  6 08:00';
            }
        })(FS);
    })();

    // ---------- path resolution ----------
    function normalize(path) {
        if (!path || path === '~') path = '/home/guest';
        if (path.startsWith('~/')) path = '/home/guest/' + path.slice(2);
        if (!path.startsWith('/')) path = cwd + '/' + path;
        const parts = [];
        for (const seg of path.split('/')) {
            if (seg === '' || seg === '.') continue;
            if (seg === '..') parts.pop();
            else parts.push(seg);
        }
        return '/' + parts.join('/');
    }

    function resolve(path) {
        const norm = normalize(path);
        if (norm === '/') return FS;
        let node = FS;
        for (const seg of norm.split('/').slice(1)) {
            if (!node || node.type !== 'dir' || !node.children[seg]) return null;
            node = node.children[seg];
        }
        return node;
    }

    function displayPath(p) {
        if (p === '/home/guest') return '~';
        if (p.startsWith('/home/guest/')) return '~' + p.slice('/home/guest'.length);
        return p;
    }

    // ---------- prompt ----------
    function promptHtml() {
        const u = user === 'root' ? span('c-red c-bold', 'root') : span('c-green c-bold', user);
        const sigil = user === 'root' ? '#' : '$';
        return u + span('c-dim', '@') + span('c-green c-bold', host) +
            span('c-dim', ':') + span('c-blue', displayPath(cwd)) +
            span('c-dim', `${sigil} `);
    }

    function refreshPrompt() {
        promptLabel.innerHTML = promptHtml();
    }

    function renderInput() {
        const v = kbd.value;
        const caret = kbd.selectionStart == null ? v.length : kbd.selectionStart;
        typedEl.textContent = v.slice(0, caret);
        cursorEl.textContent = v[caret] || ' ';
        afterEl.textContent = v.slice(caret + 1);
    }

    function setInput(v) {
        kbd.value = v;
        kbd.setSelectionRange(v.length, v.length);
        renderInput();
    }

    function echoCommand(raw) {
        print(promptHtml() + esc(raw));
    }

    function showPrompt(show) {
        promptLine.style.display = show ? 'block' : 'none';
    }

    // ---------- command registry ----------
    const MAN = {
        help: 'help — list available commands. you are reading about the command that tells you about commands. very meta.',
        ls: 'ls [-l] [-a] [path] — list directory contents. -l long format, -a include hidden files. hidden files are hidden for a reason, usually a bad one.',
        cd: 'cd <dir> — change the working directory. cd with no argument returns home, like all of us eventually.',
        pwd: 'pwd — print working directory. for when you are lost, which is a valid state of being.',
        cat: 'cat <file> — print file contents to the terminal. the plain-text truth.',
        open: 'open <file> — open a file in GUI mode. this is where the terminal admits the web version is prettier.',
        tree: 'tree [path] — display the directory tree. like ls, but with ambition.',
        clear: 'clear — clear the screen. ctrl+l works too.',
        echo: 'echo <text> — print text. supports $USER, $HOME, $SHELL, and your hopes.',
        whoami: 'whoami — print the current user. existentially, you are on your own.',
        date: 'date — print the current date and time.',
        uptime: 'uptime — how long this session has been alive.',
        history: 'history — list previously executed commands. no judgment.',
        neofetch: 'neofetch — display system information with unnecessary flair.',
        man: 'man <command> — show the manual page. you found this one, so it works.',
        exit: 'exit — leave the terminal and switch to the web version of this portfolio.',
        sudo: 'sudo <cmd> — execute a command as another user. you will not be that user.',
        fortune: 'fortune — print a pseudorandom, allegedly wise quotation.',
        sl: 'sl — you meant ls. everyone means ls.',
        cmatrix: 'cmatrix — follow the white rabbit. any key exits.',
        vim: 'vim — a modal text editor. entering is easy.',
        coffee: 'coffee — brew a double shot. the operator is a former colectivo barista; quality is guaranteed.',
        wine: 'wine — run Windows applications on Linux. or, on this machine, a sommelier consultation. one of those.',
        jonathan: 'jonathan — see about.txt. or better: open about.txt'
    };

    const FORTUNES = [
        'there are only two hard things in computer science:\ncache invalidation, naming things, and off-by-one errors.',
        'hardware eventually fails. software eventually works.',
        'it works on my machine. — everyone, always',
        'the best way to predict the future is to implement it.',
        'weeks of coding can save you hours of planning.',
        'a fpga is just a breadboard with commitment issues.',
        'any sufficiently advanced portfolio is indistinguishable\nfrom a terminal emulator.',
        'first, solve the problem. then, write the code.\nthen, rewrite the code. then, question the problem.',
        'espresso and test suites share a failure mode:\nrushed extraction.',
        'a michelin-starred service and a clean CI run feel\nexactly the same. do not let anyone tell you otherwise.'
    ];

    const COMMANDS = [
        'help', 'ls', 'cd', 'pwd', 'cat', 'open', 'tree', 'clear', 'echo',
        'whoami', 'hostname', 'uname', 'date', 'uptime', 'history', 'neofetch',
        'man', 'exit', 'sudo', 'su', 'fortune', 'sl', 'cmatrix', 'vim', 'vi',
        'nano', 'emacs', 'rm', 'touch', 'mkdir', 'mv', 'cp', 'chmod', 'which',
        'head', 'tail', 'less', 'more', 'ping', 'ssh', 'git', 'make', 'curl',
        'wget', 'id', 'logout', 'coffee', 'wine'
    ];

    // populate /bin with the commands
    for (const c of COMMANDS) {
        FS.children.bin.children[c] = file(null, { size: '14K', date: 'Jul  6 08:00', exec: true, binary: true });
    }

    // ---------- ls ----------
    function fmtPerms(node) {
        if (node.type === 'dir') return 'drwxr-xr-x';
        if (node.exec) return '-rwxr-xr-x';
        return '-rw-r--r--';
    }

    function lsName(name, node) {
        if (node.type === 'dir') return span('c-dir', name + '/');
        if (node.exec) return span('c-exec', name);
        if (name.startsWith('.')) return span('c-hidden', name);
        return esc(name);
    }

    function doLs(args) {
        let showAll = false, long = false;
        const paths = [];
        for (const a of args) {
            if (a.startsWith('-')) {
                if (a.includes('a')) showAll = true;
                if (a.includes('l')) long = true;
            } else paths.push(a);
        }
        const target = paths[0] || '.';
        const node = resolve(target);
        if (!node) return print(`ls: cannot access '${esc(target)}': No such file or directory`);
        if (node.type === 'file') {
            return print(long ? `${fmtPerms(node)}  1 jonathan jonathan ${node.size.padStart(6)} ${node.date} ${esc(target)}` : esc(target));
        }
        let names = Object.keys(node.children).sort();
        if (showAll) names = ['.', '..', ...names];
        else names = names.filter(n => !n.startsWith('.'));
        if (long) {
            print(span('c-dim', `total ${names.length}`));
            for (const n of names) {
                const child = n === '.' ? node : n === '..' ? node : node.children[n];
                print(`${fmtPerms(child)}  1 ${'jonathan'} ${'jonathan'} ${String(child.size).padStart(6)} ${child.date}  ${lsName(n, n === '.' || n === '..' ? { type: 'dir' } : child)}`);
            }
        } else {
            print(names.map(n => lsName(n, n === '.' || n === '..' ? { type: 'dir' } : node.children[n])).join('  '));
        }
    }

    // ---------- tree ----------
    function doTree(args) {
        const target = args[0] || '.';
        const node = resolve(target);
        if (!node) return print(`tree: '${esc(target)}': No such file or directory`);
        if (node.type !== 'dir') return print(esc(target));
        print(span('c-dir', displayPath(normalize(target))));
        let dirs = 0, files = 0;
        (function walk(n, prefix) {
            const names = Object.keys(n.children).filter(x => !x.startsWith('.')).sort();
            names.forEach((name, i) => {
                const child = n.children[name];
                const last = i === names.length - 1;
                const branch = last ? '└── ' : '├── ';
                print(span('c-dim', prefix + branch) + lsName(name, child));
                if (child.type === 'dir') {
                    dirs++;
                    walk(child, prefix + (last ? '    ' : '│   '));
                } else files++;
            });
        })(node, '');
        print(span('c-dim', `${dirs} directories, ${files} files`));
    }

    // ---------- cat / open ----------
    function doCat(args, cmdName = 'cat') {
        if (!args.length) return print(`${cmdName}: missing operand`);
        for (const a of args) {
            const node = resolve(a);
            if (!node) { print(`${cmdName}: ${esc(a)}: No such file or directory`); continue; }
            if (node.type === 'dir') { print(`${cmdName}: ${esc(a)}: Is a directory`); continue; }
            if (node.binary) { print(`${cmdName}: ${esc(a)}: binary file — try ${cmdLink('open ' + a)}`); continue; }
            printBlock(node.content);
            if (node.gui && !node.external) {
                print(span('c-dim', '→ ') + cmdLink('open ' + a) + span('c-dim', '  # view in GUI mode'));
            }
        }
        print();
    }

    async function doOpen(args) {
        if (!args.length) return print('open: missing operand — open <file>');
        const target = args[0];
        const node = resolve(target);
        if (!node) return print(`open: ${esc(target)}: No such file or directory`);
        if (node.type === 'dir') return print(`open: ${esc(target)}: is a directory (try ${cmdLink('cd ' + target)})`);
        if (!node.gui) {
            return print(`open: ${esc(target)}: no GUI handler registered — try ${cmdLink('cat ' + target)}`);
        }
        if (node.external) {
            window.open(node.gui, '_blank', 'noopener');
            print(span('c-dim', '→ opened in new tab: ') + link(node.gui));
            print();
            return;
        }
        await launchGui(target, node.gui);
    }

    async function launchGui(name, url) {
        mode = 'busy';
        showPrompt(false);
        print(span('c-dim', `opening ${name} in GUI mode...`));
        scrollBottom();
        await sleep(280);
        print(span('c-dim', 'starting X server on display :0 ... ') + span('c-green', 'ok'));
        scrollBottom();
        await sleep(240);
        print(span('c-dim', 'handing off to the pretty version ... ') + span('c-green', 'ok'));
        scrollBottom();
        await sleep(320);
        crtOff(url);
    }

    function crtOff(url) {
        document.body.classList.add('crt-off');
        setTimeout(() => {
            document.body.classList.add('crt-done');
            window.location.href = url;
        }, 560);
    }

    // ---------- neofetch ----------
    function doNeofetch() {
        const up = uptimeString();
        const logo = [
            '     ██╗███████╗',
            '     ██║██╔════╝',
            '     ██║█████╗  ',
            '██   ██║██╔══╝  ',
            '╚█████╔╝██║     ',
            ' ╚════╝ ╚═╝     ',
            '                '
        ];
        const info = [
            span('c-green c-bold', `${user}@${host}`),
            span('c-dim', '──────────────────'),
            span('c-accent', 'OS       ') + 'JonathanOS 26.04 LTS (Fang Edition)',
            span('c-accent', 'Host     ') + 'portfolio v3.0 — san francisco, ca',
            span('c-accent', 'Kernel   ') + '6.2.0-hardware-software',
            span('c-accent', 'Uptime   ') + up,
            span('c-accent', 'Shell    ') + 'jsh 5.2',
            span('c-accent', 'Day job  ') + 'test dev engineer @ cisco',
            span('c-accent', 'Also     ') + 'ai research fellow @ handshake ai',
            span('c-accent', 'Fall     ') + 'mscs @ georgia tech',
            span('c-accent', 'Ex       ') + 'michelin server · barista · wedding bartender',
            span('c-accent', 'CPU      ') + 'dual-core caffeine @ 3.2GHz (colectivo-trained)',
            span('c-accent', 'Editor   ') + 'whichever one lets me exit'
        ];
        print();
        const rows = Math.max(logo.length, info.length);
        for (let i = 0; i < rows; i++) {
            const l = logo[i] || ' '.repeat(16);
            print(span('c-purple', l) + '   ' + (info[i] || ''));
        }
        print();
    }

    function uptimeString() {
        const s = Math.floor((Date.now() - bootTime) / 1000);
        const m = Math.floor(s / 60);
        return m > 0 ? `${m} min${m === 1 ? '' : 's'}, ${s % 60} secs` : `${s} secs`;
    }

    // ---------- help ----------
    function doHelp() {
        print();
        print(span('c-bold c-accent', 'jsh 5.2') + span('c-dim', ' — the jonathan-fang shell. commands:'));
        print();
        print(span('c-yellow', '  navigation'));
        print(`    ${cmdLink('ls')} [-la]         list directory contents`);
        print(`    ${cmdLink('cd')} &lt;dir&gt;         change directory`);
        print(`    ${cmdLink('pwd')}              where am i`);
        print(`    ${cmdLink('tree')}             the whole map at once`);
        print();
        print(span('c-yellow', '  files'));
        print(`    ${cmdLink('cat')} &lt;file&gt;       read a file right here`);
        print(`    ${cmdLink('open')} &lt;file&gt;      open it in GUI mode (the pretty version)`);
        print();
        print(span('c-yellow', '  system'));
        print(`    ${cmdLink('whoami')} · ${cmdLink('date')} · ${cmdLink('uptime')} · ${cmdLink('history')} · ${cmdLink('clear')} · ${cmdLink('neofetch')} · ${cmdLink('man')} &lt;cmd&gt;`);
        print();
        print(span('c-yellow', '  session'));
        print(`    ${cmdLink('exit')}             switch to the web version`);
        print();
        print(span('c-dim', '  tab completes. ↑/↓ recall history. a few commands are undocumented.'));
        print();
    }

    // ---------- easter eggs ----------
    async function doMeltdown() {
        mode = 'busy';
        showPrompt(false);
        const victims = [
            '/usr/bin', '/usr/lib', '/etc/passwd', '/etc/hostname', '/var/log',
            '/home/guest/projects', '/home/guest/thoughts', '/home/guest/about.txt',
            '/home/guest/resume.pdf', '/boot/vmlinuz', '/bin/sh'
        ];
        document.body.classList.add('meltdown');
        for (const v of victims) {
            print(span('c-red', `rm: removing ${v} ...`));
            scrollBottom();
            await sleep(90);
        }
        await sleep(300);
        print();
        printBlock(
            '██╗  ██╗███████╗██████╗ ███╗   ██╗███████╗██╗     \n' +
            '██║ ██╔╝██╔════╝██╔══██╗████╗  ██║██╔════╝██║     \n' +
            '█████╔╝ █████╗  ██████╔╝██╔██╗ ██║█████╗  ██║     \n' +
            '██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝  ██║     \n' +
            '██║  ██╗███████╗██║  ██║██║ ╚████║███████╗███████╗\n' +
            '╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝\n' +
            'PANIC: attempted to kill init! exitcode=0x0000000b',
            'c-red');
        scrollBottom();
        await sleep(1400);
        document.body.classList.remove('meltdown');
        print();
        print(span('c-green', '...kidding.') + ' this filesystem is read-only. nothing was harmed.');
        print(span('c-dim', 'bold of you to try it, though. jonathan respects that.'));
        print();
        mode = 'shell';
        showPrompt(true);
        scrollBottom();
    }

    function doSudo(args) {
        const rest = args.join(' ');
        if (rest === 'su' || rest === 'su -' || rest === '-i') {
            user = 'root';
            refreshPrompt();
            print('you are now root. with great power comes the same read-only filesystem.');
            print();
            return;
        }
        if (rest === 'make me a sandwich') {
            print('okay.');
            print(span('c-dim', '(xkcd 149 compliance module loaded)'));
            print();
            return;
        }
        sudoCount++;
        if (sudoCount === 1) {
            print(`${user} is not in the sudoers file. This incident will be reported.`);
        } else if (sudoCount === 2) {
            print(`${user} is still not in the sudoers file. This incident has also been reported.`);
        } else {
            print('fine. persistence acknowledged. the incidents were reported to jonathan.');
            print('he says hi. he also says try ' + cmdLink('sudo su') + '.');
        }
        print();
    }

    function startMatrix() {
        mode = 'matrix';
        document.body.classList.add('fx-on');
        const ctx = fx.getContext('2d');
        fx.width = window.innerWidth;
        fx.height = window.innerHeight;
        const fontSize = 15;
        const cols = Math.floor(fx.width / fontSize);
        const drops = new Array(cols).fill(1);
        const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789JONATHANFANG';
        ctx.fillStyle = '#050506';
        ctx.fillRect(0, 0, fx.width, fx.height);
        matrixTimer = setInterval(() => {
            ctx.fillStyle = 'rgba(5, 5, 6, 0.08)';
            ctx.fillRect(0, 0, fx.width, fx.height);
            ctx.font = fontSize + 'px monospace';
            for (let i = 0; i < drops.length; i++) {
                const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
                ctx.fillStyle = Math.random() > 0.975 ? '#e9e7e2' : '#a3be8c';
                ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > fx.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }, 50);
    }

    function stopMatrix() {
        clearInterval(matrixTimer);
        document.body.classList.remove('fx-on');
        mode = 'shell';
        print(span('c-dim', 'you took the terracotta pill. back to reality.'));
        print();
        showPrompt(true);
        scrollBottom();
        kbd.focus();
    }

    async function doTrain() {
        mode = 'busy';
        showPrompt(false);
        trainEl.style.display = 'block';
        trainEl.textContent =
            '      ====        ________                ___________ \n' +
            '  _D _|  |_______/        \\__I_I_____===__|_________| \n' +
            '   |(_)---  |   H\\________/ |   |        =|___ ___|   \n' +
            '   /     |  |   H  |  |     |   |         ||_| |_||   \n' +
            '  |      |  |   H  |__--------------------| [___] |   \n' +
            '  | ________|___H__/__|_____/[][]~\\_______|       |   \n' +
            '  |/ |   |-----------I_____I [][] []  D   |=======|__ \n' +
            '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ \n' +
            ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        \n' +
            '  \\_/      \\O=====O=====O=====O_/      \\_/            ';
        const start = performance.now();
        const dur = 4200;
        const width = window.innerWidth + 700;
        await new Promise(res => {
            (function frame(t) {
                const p = (t - start) / dur;
                if (p >= 1) { res(); return; }
                trainEl.style.left = (window.innerWidth - p * width) + 'px';
                requestAnimationFrame(frame);
            })(start);
        });
        trainEl.style.display = 'none';
        trainEl.style.left = '100vw';
        print(span('c-dim', 'you have been visited by the steam locomotive of typos.'));
        print(span('c-dim', 'you probably meant ') + cmdLink('ls') + span('c-dim', '.'));
        print();
        mode = 'shell';
        showPrompt(true);
        scrollBottom();
    }

    function startVim(args) {
        mode = 'vim';
        document.body.classList.add('vim-on');
        const fname = args[0] || '[No Name]';
        const rows = Math.max(8, Math.floor(window.innerHeight / 21) - 4);
        vimBody.innerHTML = '';
        for (let i = 0; i < rows; i++) {
            const d = document.createElement('div');
            d.innerHTML = '<span class="tilde">~</span>';
            vimBody.appendChild(d);
        }
        vimStatus.textContent = `  "${fname}" [readonly]  0L, 0B`;
        vimCmd.textContent = '';
        vimHintTimer = setTimeout(() => {
            vimCmd.innerHTML = span('c-dim', 'stuck? everyone is. type ') + span('c-yellow', ':q') + span('c-dim', ' then Enter.');
        }, 9000);
        kbd.value = '';
        kbd.focus();
    }

    function vimKey(e) {
        if (e.key === 'Enter') {
            const cmd = (vimCmd.dataset.buf || '').trim();
            if ([':q', ':q!', ':wq', ':x', ':qa', ':wq!'].includes(cmd)) {
                exitVim();
            } else {
                vimCmd.dataset.buf = '';
                vimCmd.innerHTML = span('c-red', `E492: Not an editor command: ${esc(cmd.replace(/^:/, ''))}`) +
                    span('c-dim', '  (hint: :q)');
            }
            e.preventDefault();
            return;
        }
        if (e.key === 'Escape') {
            vimCmd.dataset.buf = '';
            vimCmd.textContent = '';
            e.preventDefault();
            return;
        }
        if (e.key === 'Backspace') {
            vimCmd.dataset.buf = (vimCmd.dataset.buf || '').slice(0, -1);
            vimCmd.textContent = vimCmd.dataset.buf;
            e.preventDefault();
            return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            vimCmd.dataset.buf = (vimCmd.dataset.buf || '') + e.key;
            vimCmd.textContent = vimCmd.dataset.buf;
            if (vimCmd.dataset.buf === 'ZZ') exitVim();
            e.preventDefault();
        }
    }

    function exitVim() {
        clearTimeout(vimHintTimer);
        vimCmd.dataset.buf = '';
        document.body.classList.remove('vim-on');
        mode = 'shell';
        print(span('c-green', 'you escaped vim.') + ' that alone qualifies you for the projects/ directory.');
        print();
        showPrompt(true);
        scrollBottom();
        kbd.focus();
    }

    async function doPing(args) {
        const target = args[0] || 'jonathan-fang';
        mode = 'busy';
        showPrompt(false);
        print(`PING ${esc(target)} (127.0.0.1): 56 data bytes`);
        for (let i = 1; i <= 3; i++) {
            await sleep(420);
            print(`64 bytes from 127.0.0.1: icmp_seq=${i} ttl=42 time=0.0${Math.floor(Math.random() * 9) + 1}2 ms`);
            scrollBottom();
        }
        await sleep(300);
        print('^C');
        print(span('c-dim', `--- ${esc(target)} ping statistics --- everything is fine. it's all local.`));
        print();
        mode = 'shell';
        showPrompt(true);
        scrollBottom();
    }

    // ---------- exit ----------
    async function doExit() {
        mode = 'busy';
        showPrompt(false);
        print('logout');
        scrollBottom();
        await sleep(250);
        print(span('c-dim', `Connection to ${host} closed.`));
        scrollBottom();
        await sleep(400);
        crtOff('home.html');
    }

    // ---------- dispatcher ----------
    async function run(raw) {
        const input = raw.trim();
        echoCommand(raw);
        if (input) {
            history.push(input);
            histIdx = history.length;
        }
        if (!input) { scrollBottom(); return; }

        const parts = input.split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);

        switch (cmd) {
            case 'help': case '?': doHelp(); break;
            case 'ls': case 'll': case 'dir': doLs(cmd === 'll' ? ['-l', ...args] : args); break;
            case 'cd': {
                const target = args[0] || '~';
                const node = resolve(target);
                if (!node) print(`cd: no such file or directory: ${esc(target)}`);
                else if (node.type !== 'dir') print(`cd: not a directory: ${esc(target)}`);
                else { cwd = normalize(target); refreshPrompt(); }
                break;
            }
            case 'pwd': print(cwd); break;
            case 'cat': doCat(args); break;
            case 'head': case 'tail': case 'less': case 'more': doCat(args, cmd); break;
            case 'open': case 'xdg-open': await doOpen(args); break;
            case 'tree': doTree(args); break;
            case 'clear': output.innerHTML = ''; break;
            case 'echo': {
                const expanded = args.join(' ')
                    .replace(/\$USER/g, user).replace(/\$HOME/g, '/home/guest')
                    .replace(/\$SHELL/g, '/bin/jsh').replace(/\$HOSTNAME/g, host)
                    .replace(/^["'](.*)["']$/, '$1');
                print(esc(expanded));
                break;
            }
            case 'whoami': print(user); break;
            case 'id': print(`uid=1000(${user}) gid=1000(${user}) groups=1000(${user}),27(fans-of-terminals)`); break;
            case 'hostname': print(host); break;
            case 'uname': print(args.includes('-a')
                ? `JonathanOS ${host} 6.2.0-hardware-software #1 SMP x86_64 GNU/Linux`
                : 'JonathanOS'); break;
            case 'date': print(new Date().toString()); break;
            case 'uptime': print(` ${new Date().toTimeString().slice(0, 8)} up ${uptimeString()},  1 user,  load average: 0.42, 0.42, 0.42`); break;
            case 'history': history.forEach((h, i) => print(span('c-dim', String(i + 1).padStart(5) + '  ') + esc(h))); break;
            case 'neofetch': case 'screenfetch': doNeofetch(); break;
            case 'man': {
                const page = args[0];
                if (!page) print('What manual page do you want?\nFor example, try: man ls');
                else if (MAN[page]) { print(); print(span('c-yellow c-bold', page.toUpperCase() + '(1)') + span('c-dim', ' — jsh manual')); print(esc(MAN[page])); print(); }
                else print(`No manual entry for ${esc(page)}`);
                break;
            }
            case 'which': {
                const c = args[0];
                if (c && COMMANDS.includes(c)) print(`/bin/${esc(c)}`);
                else print(`which: no ${esc(c || '')} in (/bin:/usr/bin:/home/guest/.dreams)`);
                break;
            }
            case 'exit': case 'logout': case 'quit': await doExit(); return;
            case 'sudo': doSudo(args); break;
            case 'su': print(`su: Authentication failure\n${span('c-dim', '(hint: sudo su)')}`); break;
            case 'rm': {
                const joined = args.join(' ');
                if (/-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r/.test(joined) && /( \/$| \/\*| ~| \*)/.test(' ' + joined)) {
                    await doMeltdown();
                    return;
                }
                print(`rm: cannot remove '${esc(args.filter(a => !a.startsWith('-'))[0] || '')}': Read-only file system`);
                print(span('c-dim', 'this is a portfolio, not prod.'));
                break;
            }
            case 'touch': case 'mkdir': case 'mv': case 'cp': case 'chmod': case 'chown':
                print(`${cmd}: Read-only file system — the museum does not allow exhibits to be rearranged`);
                break;
            case 'vim': case 'vi': startVim(args); return;
            case 'nano': case 'emacs': case 'ed':
                print(`${cmd}: command not found`);
                print(span('c-dim', `this machine only has vim. yes, it's a statement. try `) + cmdLink('vim') + span('c-dim', '.'));
                break;
            case 'cmatrix': case 'matrix': startMatrix(); showPrompt(false); return;
            case 'sl': await doTrain(); return;
            case 'fortune': print(); printBlock(FORTUNES[Math.floor(Math.random() * FORTUNES.length)], 'c-purple'); print(); break;
            case 'ping': await doPing(args); return;
            case 'ssh': print('ssh: connect to host ' + esc(args[0] || 'jonathan') + ' port 22: Connection refused'); print(span('c-dim', 'jonathan only accepts connections over coffee. see contact/')); break;
            case 'git': print('fatal: not a git repository (or any of the parent directories)'); print(span('c-dim', 'but his repos are real: ') + cmdLink('open contact/github.url')); break;
            case 'make': {
                if (args.join(' ') === 'me a sandwich') print('what? make it yourself.');
                else print(`make: *** No rule to make target '${esc(args[0] || '')}'. Stop.`);
                break;
            }
            case 'curl': case 'wget': print(`${cmd}: outbound network disabled — this machine only serves vibes`); break;
            case 'coffee': case 'espresso': case 'brew':
                print();
                printBlock(
                    '      ) )\n' +
                    '     ( (\n' +
                    '      ) )\n' +
                    '   ..........\n' +
                    '   |        |]\n' +
                    '   \\        /\n' +
                    '    `------\'',
                    'c-yellow');
                print('double shot, pulled clean. jonathan ran a 300-cup-a-day');
                print('espresso bar at colectivo — this one\'s on the house.');
                print(span('c-dim', 'full barista lore: ') + cmdLink('cat ~/.past-lives'));
                print();
                break;
            case 'wine':
                print('wine: cannot find C:\\windows\\system32\\ — wrong wine.');
                print(span('c-dim', 'the other kind: sommelier-trained at a french bistro,'));
                print(span('c-dim', 'served at a michelin-starred restaurant. pairings on request.'));
                print(span('c-dim', 'details: ') + cmdLink('cat ~/.past-lives'));
                break;
            case 'hack': case 'hackerman': print(span('c-green', 'ACCESS GRANTED.') + ' just kidding. but ' + cmdLink('cmatrix') + ' feels close.'); break;
            case 'jonathan': print('yes?'); print(span('c-dim', 'try ') + cmdLink('cat about.txt') + span('c-dim', ' or ') + cmdLink('open about.txt')); break;
            case 'hello': case 'hi': case 'hey': print(`hi. i'm a terminal, not a chatbot. try ${cmdLink('help')}.`); break;
            default:
                print(`jsh: command not found: ${esc(cmd)}`);
                print(span('c-dim', 'try ') + cmdLink('help') + span('c-dim', ' — or tab completion, it knows things.'));
        }
        scrollBottom();
    }

    // ---------- tab completion ----------
    function complete() {
        const v = kbd.value;
        const parts = v.split(/\s+/);
        const isFirst = parts.length <= 1;
        const frag = parts[parts.length - 1] || '';

        let candidates = [];
        let prefix = '';
        if (isFirst) {
            candidates = COMMANDS.filter(c => c.startsWith(frag));
        } else {
            const slash = frag.lastIndexOf('/');
            const dirPart = slash >= 0 ? frag.slice(0, slash + 1) : '';
            const base = slash >= 0 ? frag.slice(slash + 1) : frag;
            const node = resolve(dirPart || '.');
            if (!node || node.type !== 'dir') return;
            prefix = dirPart;
            candidates = Object.keys(node.children)
                .filter(n => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.')))
                .map(n => n + (node.children[n].type === 'dir' ? '/' : ''));
        }
        if (!candidates.length) return;
        if (candidates.length === 1) {
            parts[parts.length - 1] = prefix + candidates[0] + (isFirst || candidates[0].endsWith('/') ? '' : ' ');
            setInput(parts.join(' ') + (isFirst ? ' ' : ''));
            return;
        }
        // common prefix
        let common = candidates[0];
        for (const c of candidates) {
            while (!c.startsWith(common)) common = common.slice(0, -1);
        }
        if (common.length > (prefix + fragBase(frag)).length - prefix.length) {
            parts[parts.length - 1] = prefix + common;
            setInput(parts.join(' '));
        }
        echoCommand(v);
        print(candidates.map(c => c.endsWith('/') ? span('c-dir', c) : esc(c)).join('  '));
        scrollBottom();
    }
    function fragBase(frag) {
        const slash = frag.lastIndexOf('/');
        return slash >= 0 ? frag.slice(slash + 1) : frag;
    }

    // ---------- input handling ----------
    document.addEventListener('keydown', e => {
        if (mode === 'matrix') {
            stopMatrix();
            e.preventDefault();
            return;
        }
        if (mode === 'vim') { vimKey(e); return; }
        if (mode === 'busy' || mode === 'boot') return;

        if (document.activeElement !== kbd &&
            !e.metaKey && !e.ctrlKey && e.key.length === 1) {
            kbd.focus();
        }

        if (e.key === 'Enter') {
            const v = kbd.value;
            setInput('');
            run(v);
            e.preventDefault();
        } else if (e.key === 'Tab') {
            complete();
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            if (histIdx > 0) {
                if (histIdx === history.length) histStash = kbd.value;
                histIdx--;
                setInput(history[histIdx]);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (histIdx < history.length) {
                histIdx++;
                setInput(histIdx === history.length ? histStash : history[histIdx]);
            }
            e.preventDefault();
        } else if (e.key === 'c' && e.ctrlKey) {
            echoCommand(kbd.value + '^C');
            setInput('');
            scrollBottom();
            e.preventDefault();
        } else if (e.key === 'l' && e.ctrlKey) {
            output.innerHTML = '';
            e.preventDefault();
        } else if (e.key === 'u' && e.ctrlKey) {
            setInput('');
            e.preventDefault();
        }
    });

    // right-click is disabled site-wide; here it at least talks back
    let lastCtxMenu = 0;
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (mode === 'shell' && Date.now() - lastCtxMenu > 4000) {
            lastCtxMenu = Date.now();
            print(span('c-dim', 'right-click is disabled. this is a terminal — use your words.'));
            print();
            scrollBottom();
        }
    });

    kbd.addEventListener('input', renderInput);
    kbd.addEventListener('keyup', renderInput);
    kbd.addEventListener('click', renderInput);

    // keep focus on the terminal; allow real link clicks through
    document.addEventListener('mousedown', e => {
        if (e.target.closest('a, .cmd')) return;
        if (window.getSelection && String(window.getSelection())) return;
        setTimeout(() => kbd.focus(), 0);
    });

    // clickable commands in output
    document.addEventListener('click', e => {
        const el = e.target.closest('.cmd');
        if (!el || mode !== 'shell') return;
        setInput('');
        run(el.dataset.cmd);
        kbd.focus();
    });

    window.addEventListener('resize', () => {
        if (mode === 'matrix') {
            fx.width = window.innerWidth;
            fx.height = window.innerHeight;
        }
    });

    // Returning via the back button: the page is usually restored from the
    // back-forward cache mid-CRT-collapse. Undo the shutdown and hand the
    // session back, scrollback intact.
    window.addEventListener('pageshow', e => {
        if (!document.body.classList.contains('crt-off') && !e.persisted) return;
        document.body.classList.remove('crt-off', 'crt-done');
        if (mode === 'busy' || mode === 'shell') {
            mode = 'shell';
            print(span('c-dim', 'GUI session ended. welcome back to the real interface.'));
            print();
            refreshPrompt();
            showPrompt(true);
            scrollBottom();
            kbd.focus();
        }
    });

    // ---------- boot sequence ----------
    async function boot() {
        showPrompt(false);
        const lines = [
            ['FANG BIOS v4.2 — initializing', 'c-dim'],
            ['CPU: dual-core caffeine @ 3.2GHz .............. OK', 'c-dim'],
            ['MEM: 640K (ought to be enough for anybody) .... OK', 'c-dim'],
            ['Mounting /dev/portfolio ....................... OK', 'c-dim'],
            ['Starting jsh 5.2 .............................. OK', 'c-dim']
        ];
        for (const [text, cls] of lines) {
            print(span(cls, text));
            scrollBottom();
            await sleep(110);
        }
        await sleep(320);
        output.innerHTML = '';

        printBanner(BANNER_TOP);
        printBanner(BANNER_BOTTOM);
        print();
        print(`Welcome. Jonathan is an engineer in San Francisco — test development at Cisco, MSCS at Georgia Tech`);
        print();
        print(`Type ${cmdLink('help')} to get started, or type ${cmdLink('exit')} to switch to the web version.`);
        print();
        mode = 'shell';
        refreshPrompt();
        renderInput();
        showPrompt(true);
        scrollBottom();
        kbd.focus();
    }

    boot();
})();
