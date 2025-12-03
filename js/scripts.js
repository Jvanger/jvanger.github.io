// ===== Navigation & Theme Toggle =====
document.addEventListener('DOMContentLoaded', function() {
    // Navigation section switching
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const body = document.body;

    // Set initial state
    updateLogoState();

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Update active section with smooth transition
            sections.forEach(section => {
                if (section.id === targetSection) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Update logo state based on section
            updateLogoState();
        });
    });

    function updateLogoState() {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'about') {
            body.classList.add('home-page');
        } else {
            body.classList.remove('home-page');
        }
    }

    // Logo click handler
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            const activeSection = document.querySelector('.content-section.active');

            // Only navigate if not already on About section
            if (!activeSection || activeSection.id !== 'about') {
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                const aboutNavItem = document.querySelector('[data-section="about"]');
                if (aboutNavItem) {
                    aboutNavItem.classList.add('active');
                }

                // Update active section
                sections.forEach(section => {
                    if (section.id === 'about') {
                        section.classList.add('active');
                    } else {
                        section.classList.remove('active');
                    }
                });

                // Update logo state
                updateLogoState();
            }
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');

    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.classList.toggle('dark', savedTheme === 'dark');

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark');
        const theme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });

    // Initialize scroll animations for projects and blogs
    initScrollAnimations('projectsContainer');
    initScrollAnimations('blogsContainer');
});

// ===== Scroll Animations =====
function initScrollAnimations(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const viewport = container.querySelector('.cards-viewport');
    const cards = Array.from(viewport.querySelectorAll('.card'));
    const topIndicator = document.getElementById(containerId.replace('Container', 'ScrollTop'));
    const bottomIndicator = document.getElementById(containerId.replace('Container', 'ScrollBottom'));
    const scrollHint = container.querySelector('.scroll-hint');

    let lastScrollTop = 0;
    let ticking = false;

    // Calculate which cards should be visible (3 at a time)
    function updateCardVisibility() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const viewportRect = viewport.getBoundingClientRect();
                const scrollTop = viewport.scrollTop;
                const viewportHeight = viewport.clientHeight;
                const cardHeight = cards[0] ? cards[0].offsetHeight + parseFloat(getComputedStyle(cards[0]).marginBottom) : 0;

                // Calculate which cards should be visible
                const scrollProgress = scrollTop / cardHeight;
                const firstVisibleIndex = Math.floor(scrollProgress);
                const maxVisibleCards = 3;

                cards.forEach((card, index) => {
                    const cardRect = card.getBoundingClientRect();
                    const relativeTop = cardRect.top - viewportRect.top;
                    const relativeBottom = cardRect.bottom - viewportRect.top;

                    // Calculate opacity based on position
                    let opacity = 1;

                    // Card exiting from top
                    if (index === firstVisibleIndex - 1 && relativeTop < viewportRect.height) {
                        const fadeProgress = 1 - (Math.abs(relativeTop) / cardHeight);
                        opacity = Math.max(0, fadeProgress);
                    }
                    // Card entering from bottom
                    else if (index === firstVisibleIndex + maxVisibleCards) {
                        const fadeProgress = (viewportRect.height - relativeTop) / cardHeight;
                        opacity = Math.max(0, Math.min(1, fadeProgress));
                    }
                    // Cards in visible range
                    else if (index >= firstVisibleIndex && index < firstVisibleIndex + maxVisibleCards) {
                        opacity = 1;
                    }
                    // Cards outside range
                    else {
                        opacity = 0;
                    }

                    // Apply opacity smoothly
                    card.style.opacity = opacity;
                    card.style.transform = `translateY(0)`;
                });

                // Update scroll indicators
                const scrollHeight = viewport.scrollHeight;
                const clientHeight = viewport.clientHeight;

                // Show top indicator if scrolled down
                if (scrollTop > 20) {
                    topIndicator.classList.add('visible');
                } else {
                    topIndicator.classList.remove('visible');
                }

                // Show bottom indicator if not at bottom
                if (scrollTop < scrollHeight - clientHeight - 20) {
                    bottomIndicator.classList.add('visible');
                } else {
                    bottomIndicator.classList.remove('visible');
                }

                // Hide scroll hint when scrolling
                if (scrollHint) {
                    if (scrollTop > 50) {
                        scrollHint.style.opacity = '0';
                    } else {
                        scrollHint.style.opacity = '';
                    }
                }

                lastScrollTop = scrollTop;
                ticking = false;
            });

            ticking = true;
        }
    }

    // Add scroll event listener
    viewport.addEventListener('scroll', updateCardVisibility);

    // Initial check
    setTimeout(() => {
        updateCardVisibility();
    }, 100);

    // Update on window resize
    window.addEventListener('resize', updateCardVisibility);
}

// ===== Keyboard Navigation =====
document.addEventListener('keydown', function(e) {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;

    const viewport = activeSection.querySelector('.cards-viewport');
    if (!viewport) return;

    // Arrow key navigation for scrolling within viewports
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        viewport.scrollBy({ top: 150, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        viewport.scrollBy({ top: -150, behavior: 'smooth' });
    }
});

// ===== Animation on Section Change =====
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList.contains('active') && target.classList.contains('content-section')) {
                // Re-initialize scroll animations when section becomes active
                const scrollContainer = target.querySelector('.scroll-container');
                if (scrollContainer) {
                    const viewport = scrollContainer.querySelector('.cards-viewport');
                    if (viewport) {
                        viewport.scrollTop = 0; // Reset scroll position
                        // Trigger visibility update
                        const containerId = scrollContainer.id;
                        if (containerId) {
                            setTimeout(() => {
                                initScrollAnimations(containerId);
                            }, 150);
                        }
                    }
                }
            }
        }
    });
});

// Observe all sections for class changes
document.querySelectorAll('.content-section').forEach(section => {
    observer.observe(section, { attributes: true });
});

// ===== Project Modal System =====
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
        techStack: ['SystemVerilog', 'Python', 'FPGA','RTL Simulation'],
        media: [],
        github: 'https://github.com/Jvanger/MazeSolver',
        demo: null
    },
    'psoc6-embedded-console-board': {
        title: 'PSoC6 Embedded Console Board',
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

// Modal functionality
const modal = document.getElementById('projectModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDescription = document.getElementById('modalDescription');
const modalTechStack = document.getElementById('modalTechStack');
const modalMedia = document.getElementById('modalMedia');
const modalGithub = document.getElementById('modalGithub');
const modalDemo = document.getElementById('modalDemo');

// Convert project titles to slugs for lookup
function titleToSlug(title) {
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Open modal
function openModal(projectSlug) {
    const project = projectData[projectSlug];
    if (!project) return;

    // Populate modal content
    modalTitle.textContent = project.title;
    modalDate.textContent = project.date;
    modalDescription.innerHTML = project.description;

    // Tech stack
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

    // Media (images/iframe/link/placeholder)
    if (project.media && project.media.length > 0) {
        const mediaHTML = `
            <h3>Preview</h3>
            <div class="media-carousel">
                <div class="carousel-items">
                    ${project.media.map(item => {
                        if (item.type === 'link') {
                            return `<div class="carousel-item"><a href="${item.src}" target="_blank" rel="noopener noreferrer" class="media-link-preview"><iframe src="${item.src}" loading="lazy"></iframe></a></div>`;
                        } else if (item.type === 'iframe') {
                            return `<div class="carousel-item"><iframe src="${item.src}" loading="lazy"></iframe></div>`;
                        } else if (item.type === 'placeholder') {
                            return `<div class="carousel-item"><div class="media-placeholder ${item.category}">${item.text}</div></div>`;
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
        modalMedia.innerHTML = mediaHTML;

        // Setup carousel if multiple items
        if (project.media.length > 1) {
            setupCarousel();
        }
    } else {
        modalMedia.innerHTML = '';
    }

    // Links
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

    // Show modal
    document.body.style.overflow = 'hidden';
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Setup carousel navigation
function setupCarousel() {
    const carouselItems = document.querySelector('.carousel-items');
    const dots = document.querySelectorAll('.carousel-dot');
    let currentIndex = 0;

    dots.forEach(dot => {
        dot.addEventListener('click', function() {
            currentIndex = parseInt(this.dataset.index);
            updateCarousel();
        });
    });

    function updateCarousel() {
        carouselItems.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
}

// Event listeners
modalClose.addEventListener('click', closeModal);

// Close on overlay click
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        closeModal();
    }
});

// Close on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Attach click handlers to project cards
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', function(e) {
        e.preventDefault();
        const title = this.querySelector('.card-title').textContent;
        const slug = titleToSlug(title);
        openModal(slug);
    });
});
