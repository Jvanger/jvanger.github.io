// ===== Section navigation, theme, frame chrome =====
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const body = document.body;
    const frameSection = document.getElementById('frameSection');

    const sectionLabels = {
        about: '01 / about',
        projects: '02 / projects',
        blogs: '03 / thoughts'
    };

    function showSection(id) {
        navItems.forEach(nav =>
            nav.classList.toggle('active', nav.getAttribute('data-section') === id));
        sections.forEach(section => {
            const active = section.id === id;
            section.classList.toggle('active', active);
            if (active) section.scrollTop = 0;
        });
        if (frameSection) frameSection.textContent = sectionLabels[id] || '';
    }

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            showSection(this.getAttribute('data-section'));
        });
    });

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function (e) {
            e.preventDefault();
            showSection('about');
        });
    }

    // Theme toggle (persisted)
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.classList.toggle('dark', savedTheme === 'dark');

    themeToggle.addEventListener('click', function () {
        body.classList.toggle('dark');
        localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
    });

    // Live clock in the frame (his local time)
    const clock = document.getElementById('frameClock');
    if (clock) {
        const fmt = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'America/Los_Angeles'
        });
        function tick() {
            clock.textContent = fmt.format(new Date());
        }
        tick();
        setInterval(tick, 1000);
    }

    // Deep links from the terminal (index.html):
    //   home.html#projects        → open a section
    //   home.html?p=<slug>        → open a project modal
    const params = new URLSearchParams(window.location.search);
    const projectSlug = params.get('p');
    const hash = window.location.hash.replace('#', '');

    if (projectSlug && typeof projectData !== 'undefined' && projectData[projectSlug]) {
        showSection('projects');
        setTimeout(() => openModal(projectSlug), 350);
    } else if (sectionLabels[hash]) {
        showSection(hash);
    } else {
        showSection('about');
    }
});

// ===== Keyboard navigation =====
document.addEventListener('keydown', function (e) {
    const active = document.querySelector('.content-section.active');
    if (!active) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        active.scrollBy({ top: 150, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active.scrollBy({ top: -150, behavior: 'smooth' });
    }
});

// ===== Project modal =====
const projectData = {
    'media-bias-lab': {
        title: 'Media Bias Lab',
        date: 'aug \'25',
        description: `
            <p>A full-stack web application that analyzes news articles across five bias dimensions using GPT-4, presenting results through interactive visualizations and keyword analysis.</p>
            <p>This project tackles the challenge of media literacy by providing users with AI-powered analysis of news content. The system evaluates articles for political bias, emotional tone, factual accuracy, sensationalism, and source credibility.</p>
            <p>Built with a focus on user experience, the application features real-time analysis, interactive data visualizations, and detailed breakdowns of bias indicators to help readers make more informed decisions about the news they consume.</p>
        `,
        techStack: ['React', 'Vite', 'Express', 'OpenAI', 'Google Cloud NLP', 'Recharts', 'Vercel'],
        media: [
            { type: 'link', src: 'https://bias-frontend-deploy.vercel.app/' }
        ],
        github: null,
        demo: 'https://bias-frontend-deploy.vercel.app/'
    },
    'strava-mule': {
        title: 'Strava Mule',
        date: 'jun \'25',
        description: `
            <p>An intelligent GPX activity simulator that generates biometrically accurate fitness tracking data with realistic elevation changes, fatigue modeling, and pace variations for testing and visualization.</p>
            <p>This tool was created to solve the problem of testing fitness applications without needing real workout data. It simulates realistic running and cycling activities with accurate GPS coordinates, elevation profiles, heart rate variations, and speed changes that mirror actual human performance patterns.</p>
            <p>The system uses advanced algorithms to model fatigue accumulation, terrain-based pace adjustments, and cardiovascular responses, making the generated data indistinguishable from real activities.</p>
        `,
        techStack: ['JavaScript', 'Node.js', 'Leaflet.js', 'PostgreSQL', 'Vercel Functions'],
        media: [
            { type: 'link', src: 'https://www.stravamule.app/' }
        ],
        github: null,
        demo: 'https://www.stravamule.app/'
    },
    'partial-scan-test-design-optimization': {
        title: 'Partial Scan Test Design Optimization',
        date: 'may \'25',
        description: `
            <p>An optimized partial scan testing architecture that achieved 46% efficiency improvement and 80% reduction in chain length compared to traditional full scan implementations.</p>
            <p>This project addresses the challenges of VLSI testing by implementing a partial scan methodology that strategically selects flip-flops for scan chain insertion. The result is significantly reduced test time and silicon area overhead while maintaining comprehensive fault coverage.</p>
            <p>The implementation leverages advanced circuit analysis techniques to identify critical paths and optimize scan chain configuration, demonstrating practical applications of design-for-testability principles in modern digital systems.</p>
        `,
        techStack: ['SystemVerilog', 'Synopsys', 'JTAG', 'TetraxMax'],
        media: [],
        github: 'https://github.com/Jvanger/b14-scan-design',
        demo: null
    },
    'github-contribution-backfill': {
        title: 'GitHub Contribution Backfill',
        date: 'apr \'25',
        description: `
            <p>A full-stack SaaS platform that streamlines GitHub contribution backfilling through OAuth authentication, featuring Stripe-integrated subscription tiers and Supabase backend for seamless commit management without command-line requirements.</p>
            <p>This project solves a common problem for developers who want to properly represent their contribution history on GitHub. The platform provides an intuitive interface for backdating commits and managing contribution graphs without requiring technical command-line knowledge.</p>
            <p>Built with scalability in mind, the application handles OAuth flows, payment processing, and database operations while maintaining security best practices and a smooth user experience.</p>
        `,
        techStack: ['React', 'Next.js', 'Supabase', 'Stripe', 'GitHub API'],
        media: [
            { type: 'link', src: 'https://backfill-contribution.vercel.app/' }
        ],
        github: null,
        demo: 'https://backfill-contribution.vercel.app'
    },
    'campus-digital-id-platform': {
        title: 'Campus Digital ID Platform',
        date: 'dec \'24',
        description: `
            <p>A comprehensive digital student ID system for UW Madison featuring class navigation, peer matching, assignment tracking, and NFC-enabled instant profile sharing.</p>
            <p>This mobile application reimagines the traditional student ID by integrating academic tools and social features into a single platform. Students can navigate campus, track assignments, connect with classmates, and share contact information through NFC technology.</p>
            <p>The system emphasizes privacy and security while providing seamless integration with university systems for class schedules, building access, and campus services.</p>
        `,
        techStack: ['React Native', 'Firebase', 'NFC', 'Google Maps API'],
        media: [],
        github: 'https://github.com/Jvanger/Wisc-Wallet',
        demo: null
    },
    'infrared-sensor-fusion': {
        title: 'Infrared Sensor Fusion',
        date: 'nov \'23',
        description: `
            <p>An autonomous maze-solving robot utilizing IMU sensor fusion and real-time path planning to navigate complex environments with sub-5% positioning error, designed in Verilog and Python.</p>
            <p>I designed a custom SPI controller for 6 axis sensor which provides continuous measurements of acceleration and angular velocity/rotation to estimate current pose and motion.
              The robot uses multiple infrared sensors combined with an IMU to build a real-time map while determining its optimal path through unknown environments.</p>
            <p>The hardware-software co-design approach leverages FPGA-based processing for real-time sensor fusion and Python for high-level path planning algorithms, achieving impressive accuracy and navigation performance.</p>
        `,
        techStack: ['SystemVerilog', 'Python', 'FPGA', 'RTL Simulation'],
        media: [],
        github: 'https://github.com/Jvanger/MazeSolver',
        demo: null
    },
    'psoc6-embedded-console-board': {
        title: 'PSoC6 Embedded Multiplayer Console',
        date: 'nov \'23',
        description: `
            <p>Modular multiplayer game console platform built on the Cypress PSoC6. The system enables hot-swappable game modules via a standardized firmware interface, providing modularity and ease of extension for different game peripherals.</p>
            <p>Firmware leverages FreeRTOS for task management alongside a hardware abstraction layer to isolate drivers and enable concurrent, reliable operation of display, input, and communication subsystems.
            I implemented low-level device drivers for a 16-bit SPI LCD and peripheral interfaces (I2C, UART), and integrated GPIO interrupts for precise input handling and responsive UI behavior.</p>
        `,
        techStack: ['C', 'FreeRTOS', 'PSoC6', 'SPI', 'I2C', 'UART', 'GPIO'],
        media: [],
        github: 'https://github.com/Jvanger/Cortex-Board',
        demo: null
    }
};

const modal = document.getElementById('projectModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDescription = document.getElementById('modalDescription');
const modalTechStack = document.getElementById('modalTechStack');
const modalMedia = document.getElementById('modalMedia');
const modalGithub = document.getElementById('modalGithub');
const modalDemo = document.getElementById('modalDemo');

function openModal(projectSlug) {
    const project = projectData[projectSlug];
    if (!project) return;

    modalTitle.textContent = project.title;
    modalDate.textContent = project.date;
    modalDescription.innerHTML = project.description;

    if (project.techStack && project.techStack.length > 0) {
        modalTechStack.innerHTML = `
            <h3>Tech Stack</h3>
            <div class="tech-tags">
                ${project.techStack.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
        `;
    } else {
        modalTechStack.innerHTML = '';
    }

    if (project.media && project.media.length > 0) {
        modalMedia.innerHTML = `
            <h3>Preview</h3>
            <div class="media-carousel">
                <div class="carousel-items">
                    ${project.media.map(item => {
                        if (item.type === 'link') {
                            return `<div class="carousel-item"><a href="${item.src}" target="_blank" rel="noopener noreferrer" class="media-link-preview"><div class="iframe-skeleton"></div><iframe src="${item.src}" loading="lazy" onload="this.previousElementSibling.classList.add('loaded')"></iframe></a></div>`;
                        } else if (item.type === 'iframe') {
                            return `<div class="carousel-item"><div class="iframe-skeleton"></div><iframe src="${item.src}" loading="lazy" onload="this.previousElementSibling.classList.add('loaded')"></iframe></div>`;
                        } else {
                            return `<div class="carousel-item"><img src="${item.src}" alt="${project.title}" loading="lazy"></div>`;
                        }
                    }).join('')}
                </div>
                ${project.media.length > 1 ? `
                    <div class="carousel-controls">
                        ${project.media.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        if (project.media.length > 1) setupCarousel();
    } else {
        modalMedia.innerHTML = '';
    }

    if (project.github) {
        modalGithub.href = project.github;
        modalGithub.classList.remove('hidden');
    } else {
        modalGithub.classList.add('hidden');
    }

    if (project.demo) {
        modalDemo.href = project.demo;
        modalDemo.classList.remove('hidden');
    } else {
        modalDemo.classList.add('hidden');
    }

    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

function setupCarousel() {
    const carouselItems = document.querySelector('.carousel-items');
    const dots = document.querySelectorAll('.carousel-dot');
    let currentIndex = 0;

    dots.forEach(dot => {
        dot.addEventListener('click', function () {
            currentIndex = parseInt(this.dataset.index);
            carouselItems.style.transform = `translateX(-${currentIndex * 100}%)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        });
    });
}

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

document.querySelectorAll('.project-item a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(this.closest('.project-item').dataset.slug);
    });
});
