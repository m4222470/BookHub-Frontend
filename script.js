/*
 * BookHub Frontend JavaScript - الملف النهائي والمحدث
 * يتضمن: I18N، الوضع المظلم، قائمة الهاتف، ومنطق تحميل الكتب والدورات من ملف واحد (all_content.json).
 */

document.addEventListener('DOMContentLoaded', function() {

    // ---------------------------------------------------
    // I18N (تعدد اللغات) LOGIC
    // ---------------------------------------------------
    const langSelector = document.getElementById('language-selector');
    const defaultLang = 'ar';
    let currentLang = localStorage.getItem('lang') || defaultLang;
    
    // 1. وظيفة تحميل ملف الترجمة الثابتة (للنصوص العامة)
    async function fetchLanguageData(lang) {
        try {
            const response = await fetch(`./languages/${lang}.json`); 
            if (!response.ok) {
                console.error(`Could not load language file: ${lang}. Status: ${response.status}`);
                // Fallback to default language
                const fallbackResponse = await fetch(`./languages/${defaultLang}.json`);
                return fallbackResponse.json();
            }
            return response.json();
        } catch (error) {
            console.error('Error loading language data. Falling back to default:', error);
            const fallbackResponse = await fetch(`./languages/${defaultLang}.json`);
            return fallbackResponse.json();
        }
    }

    // 2. وظيفة تطبيق الترجمة واتجاه القراءة (تُستدعى عند تغيير اللغة)
    async function setLanguage(lang) {
        const translations = await fetchLanguageData(lang);
        
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[key]) {
                element.setAttribute('placeholder', translations[key]);
            }
        });
        if (translations['title_main']) {
             document.title = translations['title_main'];
        }
        
        const html = document.documentElement;
        if (lang === 'ar') {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'ar');
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', lang); 
        }
        
        localStorage.setItem('lang', lang);
        currentLang = lang;
        if (langSelector && langSelector.value !== lang) {
             langSelector.value = lang; 
        }

        // 3. إعادة تحميل المحتوى الديناميكي باللغة الجديدة
        loadContent(); // تحديث ليقوم بتحميل الكل مرة واحدة
    }

    // تطبيق اللغة عند تحميل الصفحة
    setLanguage(currentLang);
    if (langSelector) {
        langSelector.addEventListener('change', (event) => {
            setLanguage(event.target.value);
        });
    }

    // ---------------------------------------------------
    // CORE CONTENT LOADING LOGIC (منطق تحميل المحتوى)
    // ---------------------------------------------------

    const booksContainer = document.getElementById('latest-books-container');
    const coursesContainer = document.getElementById('courses-container');
    
    // دالة مساعدة للحصول على الحقل الصحيح بناءً على اللغة
    function getLocalizedField(item, fieldName) {
        const langCode = currentLang === 'ar' ? '_ar' : (currentLang === 'fr' ? '_fr' : '_en');
        const key = fieldName + langCode;
        // حاول الحصول على الحقل الخاص باللغة، وإذا لم يتوفر، ارجع للحقل الأساسي
        return item[key] || item[fieldName] || item[fieldName + '_en'] || 'N/A';
    }

    // دالة توليد بطاقة الكتاب
    function createBookCard(book) {
        // نصوص ثابتة تحتاج ترجمة
        const translations = JSON.parse(localStorage.getItem('translations') || '{}');
        const bestsellerText = translations['badge_bestseller'] || 'الأكثر مبيعًا'; 
        const newText = translations['badge_new'] || 'جديد';
        
        const badgeText = book.badge && book.badge.key === 'badge_bestseller' ? bestsellerText : 
                          (book.badge && book.badge.key === 'badge_new' ? newText : '');
        
        const badgeHTML = book.badge ? 
            `<div class="book-badge">${badgeText}</div>` : 
            '';

        // نستخدم getLocalizedField للحصول على العنوان والتصنيف المناسب
        const title = getLocalizedField(book, 'title');
        const category = getLocalizedField(book, 'category');


        return `
            <div class="book-card">
                <div class="book-cover">
                    <img src="${book.cover_url}" alt="${title}">
                    ${badgeHTML}
                </div>
                <div class="book-info">
                    <h3 class="book-title">${title}</h3>
                    <p class="book-author">${book.author}</p>
                    <div class="book-meta">
                        <span>${category}</span>
                        <div class="book-rating">
                            <i class="fas fa-star"></i>
                            <span>${book.rating.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="book-price">
                        <div>
                            <span class="price">$${book.price.toFixed(2)}</span>
                            ${book.old_price ? `<span class="price-old">$${book.old_price.toFixed(2)}</span>` : ''}
                        </div>
                        <div class="book-actions">
                            <button class="action-btn" title="Add to Cart"><i class="fas fa-shopping-cart"></i></button>
                            <button class="action-btn" title="Add to Wishlist"><i class="fas fa-heart"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // دالة توليد بطاقة الدورة
    function createCourseCard(course, translations) {
        
        const buttonTextKey = course.isFree ? 'course_btn_start' : 'course_btn_buy';
        const typeTextKey = course.isFree ? 'course_type_free' : 'course_type_paid';
        
        const buttonText = translations[buttonTextKey] || buttonTextKey;
        const typeText = translations[typeTextKey] || typeTextKey;
        const freeText = translations['course_free'] || 'مجاني';

        const priceText = course.isFree ? 
            `<span class="price price-free">${freeText}</span>` : 
            `<span class="price">$${course.price.toFixed(2)}</span>`;
        
        const buttonClass = course.isFree ? 'btn-success' : 'btn-outline';

        // استخدام getLocalizedField للعنوان والوصف
        const title = getLocalizedField(course, 'title');
        const description = getLocalizedField(course, 'description');
        
        // تقصير الوصف
        const shortDescription = description.length > 80 ? description.substring(0, 80) + '...' : description;

        return `
            <div class="book-card course-card">
                <div class="book-cover" style="background-color: var(--primary-light);">
                    <i class="fas fa-terminal" style="font-size: 80px; color: var(--primary);"></i>
                </div>
                <div class="book-info">
                    <h3 class="book-title">${title}</h3>
                    <p class="book-author">${shortDescription}</p>
                    <div class="book-meta">
                        <span>${typeText}</span> 
                        <div class="book-rating">
                            <i class="fas fa-star"></i>
                            <span>${course.rating.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="book-price">
                        <div>
                            ${priceText}
                        </div>
                        <div class="book-actions">
                            <a href="${course.url}" target="_blank" class="btn ${buttonClass}" style="font-size: 0.9rem; padding: 8px 15px;">
                                ${buttonText}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // دالة تحميل المحتوى الرئيسي (الكتب والدورات)
    async function loadContent() {
        if (!booksContainer || !coursesContainer) return;

        try {
            // 1. جلب ملف المحتوى الموحد
            const response = await fetch('./data/all_content.json');
            if (!response.ok) {
                // إذا فشل تحميل ملف المحتوى، أظهر رسالة خطأ
                throw new Error('Failed to load all_content.json data.');
            }
            const data = await response.json();
            const books = data.latest_books || [];
            const courses = data.educational_courses || [];
            
            // 2. جلب ملف الترجمة الثابتة للنصوص العامة (مثل "مجاني")
            const translations = await fetchLanguageData(currentLang);
            
            // 3. عرض الكتب
            let booksHtml = '';
            books.forEach(book => {
                booksHtml += createBookCard(book);
            });
            booksContainer.innerHTML = booksHtml || '<p style="text-align: center; color: var(--secondary);">لا توجد كتب لعرضها حالياً.</p>';

            // 4. عرض الدورات
            let coursesHtml = '';
            courses.slice(0, 8).forEach(course => { 
                coursesHtml += createCourseCard(course, translations);
            });
            coursesContainer.innerHTML = coursesHtml || '<p style="text-align: center; color: var(--secondary);">لا توجد دورات لعرضها حالياً.</p>';

            // 5. تفعيل مراقب التفاعل
            initializeIntersectionObserver();

        } catch (error) {
            console.error('Error in loading content:', error);
            // إظهار رسالة الخطأ للمستخدم
            booksContainer.innerHTML = '<p style="text-align: center; color: var(--secondary);">تعذر تحميل قائمة الكتب حالياً.</p>';
            coursesContainer.innerHTML = '<p style="text-align: center; color: var(--secondary);">تعذر تحميل قائمة الدورات حالياً.</p>';
        }
    }


    // ---------------------------------------------------
    // UI SCRIPTS (الوضع المظلم، قائمة الهاتف، التفاعلات)
    // ---------------------------------------------------

    // 1. Mobile Menu Toggle 
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('main-nav');
    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', function() {
            nav.classList.toggle('active');
            const icon = this.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // 2. Dark/Light Mode Toggle & Local Storage
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark-mode') {
        body.classList.add('dark-mode');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            body.classList.toggle('dark-mode');
            const icon = this.querySelector('i');

            if (body.classList.contains('dark-mode')) {
                icon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'dark-mode');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'light-mode');
            }
        });
    }

    // 3. Simple Animation on Scroll (Intersection Observer)
    function initializeIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1, 
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.feature-card, .book-card, .category-card, .testimonial-card');

        animatedElements.forEach(el => {
            el.style.opacity = '0'; 
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }
    
    // تشغيل تحميل المحتوى الديناميكي عند انتهاء تحميل الصفحة
    loadContent(); 
});
