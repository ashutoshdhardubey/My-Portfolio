/**
 * Anti-Gravity Portfolio — Interaction Layer
 * Handles: scroll animations, parallax, orbit system, navigation, forms, cursor effects
 */

(function () {
    'use strict';

    // ──────────────────────────────────────────────
    // CONFIGURATION
    // ──────────────────────────────────────────────
    const CONFIG = {
        parallaxIntensity: 0.02,
        scrollRevealThreshold: 0.15,
        orbitBaseRadius: [140, 220, 300], // px for orbit rings 1, 2, 3
        cursorGlowSize: 400,
        lerpSpeed: 0.08,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    // ──────────────────────────────────────────────
    // STATE
    // ──────────────────────────────────────────────
    const state = {
        mouseX: 0,
        mouseY: 0,
        targetMouseX: 0,
        targetMouseY: 0,
        scrollY: 0,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        orbitAngleOffset: 0,
        activeSection: 'hero',
        isMenuOpen: false,
    };

    // ──────────────────────────────────────────────
    // DOM CACHE
    // ──────────────────────────────────────────────
    const dom = {
        nav: document.getElementById('main-nav'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileToggle: document.getElementById('mobile-menu-toggle'),
        cursorGlow: document.getElementById('cursor-glow'),
        sections: document.querySelectorAll('.section'),
        floatingCodes: document.querySelectorAll('.floating-code'),
        heroContent: document.querySelector('.hero-content'),
        heroElements: document.querySelectorAll('[data-float-delay]'),
        skillPlanets: document.querySelectorAll('.skill-planet'),
        orbitRings: document.querySelectorAll('.orbit-ring'),
        projectCards: document.querySelectorAll('.project-card'),
        timelineNodes: document.querySelectorAll('.timeline-node'),
        contactForm: document.getElementById('contact-form'),
        skillDetail: document.getElementById('skill-detail'),
        skillDetailName: document.getElementById('skill-detail-name'),
        skillDetailDesc: document.getElementById('skill-detail-desc'),
        skillBarFill: document.getElementById('skill-bar-fill'),
    };

    // ──────────────────────────────────────────────
    // SKILL DATA
    // ──────────────────────────────────────────────
    const skillData = {
        java: { name: 'Java', desc: 'Enterprise-grade backend development with Spring Boot, microservices architecture, and robust OOP design patterns.', level: 90 },
        python: { name: 'Python', desc: 'Machine learning pipelines with TensorFlow & OpenCV, automation scripts, and Django/Flask web services.', level: 88 },
        react: { name: 'ReactJS', desc: 'Dynamic single-page applications with hooks, context API, state management, and modern component architecture.', level: 85 },
        php: { name: 'PHP', desc: 'Full-stack web development with Laravel, API integrations, and database-driven content management systems.', level: 80 },
        sql: { name: 'SQL', desc: 'Complex query optimization, database design & normalization, stored procedures, and data analytics with MySQL/PostgreSQL.', level: 85 },
        cpp: { name: 'C++', desc: 'Systems programming, data structures & algorithms, competitive programming, and performance-critical applications.', level: 78 },
        aws: { name: 'AWS', desc: 'Cloud infrastructure with EC2, S3, Lambda, RDS, and deployment pipelines for scalable, production-ready applications.', level: 72 },
    };

    // ──────────────────────────────────────────────
    // UTILITIES
    // ──────────────────────────────────────────────
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function mapRange(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    }

    // ──────────────────────────────────────────────
    // 1. CURSOR GLOW
    // ──────────────────────────────────────────────
    function initCursorGlow() {
        if (CONFIG.reducedMotion || !dom.cursorGlow) return;
        // Only show on non-touch devices
        if ('ontouchstart' in window) {
            dom.cursorGlow.style.display = 'none';
            return;
        }

        document.addEventListener('mousemove', (e) => {
            state.targetMouseX = e.clientX;
            state.targetMouseY = e.clientY;
        });
    }

    function updateCursorGlow() {
        if (CONFIG.reducedMotion || !dom.cursorGlow) return;
        state.mouseX = lerp(state.mouseX, state.targetMouseX, CONFIG.lerpSpeed);
        state.mouseY = lerp(state.mouseY, state.targetMouseY, CONFIG.lerpSpeed);

        const halfSize = CONFIG.cursorGlowSize / 2;
        dom.cursorGlow.style.transform = `translate(${state.mouseX - halfSize}px, ${state.mouseY - halfSize}px)`;
    }

    // ──────────────────────────────────────────────
    // 2. NAVIGATION
    // ──────────────────────────────────────────────
    function initNavigation() {
        // Smooth scroll for nav links
        dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                    // Close mobile menu if open
                    if (state.isMenuOpen) toggleMobileMenu();
                }
            });
        });

        // CTA buttons smooth scroll
        document.querySelectorAll('.cta-primary, .cta-secondary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('href').substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Mobile menu toggle
        if (dom.mobileToggle) {
            dom.mobileToggle.addEventListener('click', toggleMobileMenu);
        }

        // Nav scroll effect
        window.addEventListener('scroll', updateNavOnScroll, { passive: true });
    }

    function toggleMobileMenu() {
        state.isMenuOpen = !state.isMenuOpen;
        dom.mobileToggle.classList.toggle('active', state.isMenuOpen);
        dom.mobileToggle.setAttribute('aria-expanded', state.isMenuOpen);
        dom.nav.classList.toggle('nav-open', state.isMenuOpen);
    }

    function updateNavOnScroll() {
        const scrollY = window.scrollY;

        // Nav background on scroll
        if (scrollY > 80) {
            dom.nav.classList.add('nav-scrolled');
        } else {
            dom.nav.classList.remove('nav-scrolled');
        }

        // Active section detection
        let currentSection = 'hero';
        dom.sections.forEach(section => {
            const top = section.offsetTop - state.viewportH * 0.4;
            if (scrollY >= top) {
                currentSection = section.id;
            }
        });

        if (currentSection !== state.activeSection) {
            state.activeSection = currentSection;
            dom.navLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.section === currentSection);
            });
        }
    }

    // ──────────────────────────────────────────────
    // 3. SCROLL REVEAL ANIMATIONS
    // ──────────────────────────────────────────────
    function initScrollReveal() {
        if (CONFIG.reducedMotion) {
            // Show everything immediately
            document.querySelectorAll('.section-header, .project-card, .timeline-node, .contact-container, .footer').forEach(el => {
                el.classList.add('revealed');
            });
            return;
        }

        const observerOptions = {
            threshold: CONFIG.scrollRevealThreshold,
            rootMargin: '0px 0px -50px 0px',
        };

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.floatDelay || '0', 10);
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements
        document.querySelectorAll('.section-header, .project-card, .timeline-node, .contact-container, .footer, .hero-greeting, .hero-name, .hero-title-wrapper, .hero-cta-group, .hero-scroll-indicator, .contact-card, .terminal-window').forEach(el => {
            el.classList.add('reveal-target');
            revealObserver.observe(el);
        });
    }

    // ──────────────────────────────────────────────
    // 4. PARALLAX ON FLOATING CODE SNIPPETS
    // ──────────────────────────────────────────────
    function initParallax() {
        if (CONFIG.reducedMotion) return;

        document.addEventListener('mousemove', (e) => {
            const nx = (e.clientX / state.viewportW - 0.5) * 2;
            const ny = (e.clientY / state.viewportH - 0.5) * 2;

            dom.floatingCodes.forEach(el => {
                const intensity = parseFloat(el.dataset.parallax || CONFIG.parallaxIntensity);
                const moveX = nx * intensity * 100;
                const moveY = ny * intensity * 100;
                el.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }

    // ──────────────────────────────────────────────
    // 5. SKILL ORBIT SYSTEM
    // ──────────────────────────────────────────────
    function initSkillOrbit() {
        const container = document.querySelector('.skills-orbit-container');
        if (!container) return;

        // Position planets initially
        positionPlanets();

        // Click handlers
        dom.skillPlanets.forEach(planet => {
            planet.addEventListener('click', () => {
                const skillKey = planet.dataset.skill;
                showSkillDetail(skillKey, planet);
            });
        });

        // Close detail
        const closeBtn = dom.skillDetail?.querySelector('.skill-detail-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                dom.skillDetail.hidden = true;
                dom.skillPlanets.forEach(p => p.classList.remove('planet-active'));
            });
        }

        // Animate orbit if no reduced motion
        if (!CONFIG.reducedMotion) {
            animateOrbit();
        }
    }

    function positionPlanets() {
        const container = document.querySelector('.skills-orbit-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;

        // Adjust orbit radii based on container size
        const scale = Math.min(containerRect.width, containerRect.height) / 700;
        const radii = CONFIG.orbitBaseRadius.map(r => r * Math.max(scale, 0.5));

        dom.skillPlanets.forEach(planet => {
            const orbitIndex = parseInt(planet.dataset.orbit, 10) - 1;
            const baseAngle = parseFloat(planet.dataset.angle);
            const radius = radii[orbitIndex] || radii[0];
            const angle = ((baseAngle + state.orbitAngleOffset * parseFloat(planet.dataset.speed)) * Math.PI) / 180;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius * 0.45; // flatten orbit for perspective

            planet.style.left = `${x}px`;
            planet.style.top = `${y}px`;
            // Apply depth-based scaling for 3D feel
            const depthScale = mapRange(Math.sin(angle), -1, 1, 0.7, 1.1);
            const depthOpacity = mapRange(Math.sin(angle), -1, 1, 0.5, 1);
            planet.style.transform = `translate(-50%, -50%) scale(${depthScale})`;
            planet.style.opacity = depthOpacity;
            planet.style.zIndex = Math.round(depthScale * 10);
        });
    }

    function animateOrbit() {
        let lastTime = 0;

        function tick(time) {
            if (lastTime) {
                const delta = (time - lastTime) / 1000;
                state.orbitAngleOffset += delta * 20; // degrees per second
            }
            lastTime = time;
            positionPlanets();
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    function showSkillDetail(skillKey, planetEl) {
        const data = skillData[skillKey];
        if (!data || !dom.skillDetail) return;

        dom.skillDetailName.textContent = data.name;
        dom.skillDetailDesc.textContent = data.desc;
        dom.skillBarFill.style.width = `${data.level}%`;

        // Highlight active planet
        dom.skillPlanets.forEach(p => p.classList.remove('planet-active'));
        planetEl.classList.add('planet-active');

        dom.skillDetail.hidden = false;
        dom.skillDetail.classList.add('revealed');
    }

    // ──────────────────────────────────────────────
    // 6. PROJECT CARD HOVER EFFECTS
    // ──────────────────────────────────────────────
    function initProjectCards() {
        if (CONFIG.reducedMotion) return;

        dom.projectCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Tilt effect
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / centerY * -8;
                const rotateY = (x - centerX) / centerX * 8;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;

                // Move glow to cursor position
                const glow = card.querySelector('.project-card-glow');
                if (glow) {
                    glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0, 212, 255, 0.15) 0%, transparent 60%)`;
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
                const glow = card.querySelector('.project-card-glow');
                if (glow) glow.style.background = 'none';
            });
        });
    }

    // ──────────────────────────────────────────────
    // 7. TIMELINE SCROLL ANIMATIONS
    // ──────────────────────────────────────────────
    function initTimeline() {
        if (CONFIG.reducedMotion) return;

        const wire = document.querySelector('.timeline-wire-glow');
        if (!wire) return;

        // Animate wire height based on scroll through experience section
        const experienceSection = document.getElementById('experience');
        if (!experienceSection) return;

        window.addEventListener('scroll', () => {
            const rect = experienceSection.getBoundingClientRect();
            const sectionTop = rect.top;
            const sectionHeight = rect.height;
            const viewportMid = state.viewportH / 2;

            if (sectionTop < viewportMid && sectionTop + sectionHeight > 0) {
                const progress = clamp((viewportMid - sectionTop) / sectionHeight, 0, 1);
                wire.style.height = `${progress * 100}%`;
            }
        }, { passive: true });
    }

    // ──────────────────────────────────────────────
    // 8. CONTACT FORM
    // ──────────────────────────────────────────────
    function initContactForm() {
        if (!dom.contactForm) return;

        dom.contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;

            // Simulate sending
            const submitBtn = dom.contactForm.querySelector('.terminal-submit');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>sending...</span><span class="submit-cursor blink">█</span>';
            submitBtn.disabled = true;

            setTimeout(() => {
                // Show success in terminal
                const output = dom.contactForm.closest('.terminal-body').querySelector('.terminal-output');
                const successLine = document.createElement('div');
                successLine.className = 'terminal-line terminal-success';
                successLine.innerHTML = `
                    <span class="terminal-prompt">✓</span>
                    <span class="terminal-command" style="color: #00ff88;">Message sent successfully! I'll get back to you soon, ${name}.</span>
                `;
                output.appendChild(successLine);

                // Reset form
                dom.contactForm.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

                // Scroll terminal to bottom
                const terminalBody = dom.contactForm.closest('.terminal-body');
                terminalBody.scrollTop = terminalBody.scrollHeight;
            }, 1500);
        });
    }

    // ──────────────────────────────────────────────
    // 9. TYPING EFFECT FOR HERO
    // ──────────────────────────────────────────────
    function initHeroTyping() {
        const subtitle = document.querySelector('.hero-subtitle');
        if (!subtitle || CONFIG.reducedMotion) return;

        const text = subtitle.textContent;
        subtitle.textContent = '';
        subtitle.style.borderRight = '2px solid var(--color-accent)';

        let i = 0;
        function type() {
            if (i < text.length) {
                subtitle.textContent += text.charAt(i);
                i++;
                setTimeout(type, 80 + Math.random() * 40);
            } else {
                // Remove cursor after typing is done
                setTimeout(() => {
                    subtitle.style.borderRight = 'none';
                }, 1500);
            }
        }

        // Delay typing start
        setTimeout(type, 1200);
    }

    // ──────────────────────────────────────────────
    // 10. RESIZE HANDLER
    // ──────────────────────────────────────────────
    function initResize() {
        window.addEventListener('resize', () => {
            state.viewportW = window.innerWidth;
            state.viewportH = window.innerHeight;
            positionPlanets();
        });
    }

    // ──────────────────────────────────────────────
    // 11. MAIN ANIMATION LOOP
    // ──────────────────────────────────────────────
    function mainLoop() {
        updateCursorGlow();
        requestAnimationFrame(mainLoop);
    }

    // ──────────────────────────────────────────────
    // 12. HERO NAME GRADIENT ANIMATION
    // ──────────────────────────────────────────────
    function initNameGradient() {
        if (CONFIG.reducedMotion) return;
        const nameLines = document.querySelectorAll('.name-line');
        let hue = 195; // Start at cyan

        function animateHue() {
            hue = (hue + 0.1) % 360;
            nameLines.forEach((line, i) => {
                const offset = i * 30;
                line.style.backgroundImage = `linear-gradient(135deg, 
                    hsl(${hue + offset}, 100%, 70%), 
                    hsl(${hue + offset + 60}, 80%, 60%),
                    hsl(${hue + offset + 120}, 100%, 70%))`;
            });
            requestAnimationFrame(animateHue);
        }

        animateHue();
    }

    // ──────────────────────────────────────────────
    // INITIALIZATION
    // ──────────────────────────────────────────────
    function init() {
        initCursorGlow();
        initNavigation();
        initScrollReveal();
        initParallax();
        initSkillOrbit();
        initProjectCards();
        initTimeline();
        initContactForm();
        initHeroTyping();
        initNameGradient();
        initResize();

        // Start animation loop
        if (!CONFIG.reducedMotion) {
            mainLoop();
        }

        // Add loaded class for entrance animations
        requestAnimationFrame(() => {
            document.body.classList.add('loaded');
        });

        console.log('%c🚀 Anti-Gravity Portfolio Loaded', 'color: #00d4ff; font-size: 16px; font-weight: bold;');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
