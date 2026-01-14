// إعدادات الاتصال بـ Supabase
// ستحصل على هذه القيم من إعدادات مشروعك في Supabase (Settings > API)
const SUPABASE_URL = 'https://epzlgnvdquiifulgprox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwemxnbnZkcXVpaWZ1bGdwcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTUxNjksImV4cCI6MjA4MzI5MTE2OX0.P8MnSSVb8agPffKJ_mlK3I5czTs7Rg0BbYWQIgJhE-Y';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. تعريف العناصر
const recipeForm = document.getElementById('recipeForm');
const recipeGrid = document.getElementById('recipeGrid');
const modal = document.getElementById('recipeModal');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeBtn = document.querySelector('.close-btn');

let allRecipes = [];
let userSession = null;
let editingRecipeId = null;

// 1. ربط العناصر الجديدة
const magicPasteArea = document.getElementById('magicPasteArea');
const magicParseBtn = document.getElementById('magicParseBtn');
const magicParserSection = document.getElementById('magicParserSection');
// 2. دالة استخراج البيانات من النص
magicParseBtn.addEventListener('click', () => {
    let text = magicPasteArea.value;
    if (!text) return alert("الرجاء لصق نص أولاً!");

    // دالة التنظيف الأساسية (النجوم والخطوط)
    const clean = (str) => str ? str.replace(/\*\*|---|__/g, '').trim() : "";

    // 1. استخراج الروابط أولاً (صورة أو فيديو)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const allUrls = text.match(urlRegex) || [];
    
    // تحديد رابط الصورة (ينتهي بـ jpg/png) ورابط الفيديو (tiktok/insta/fb)
    const foundImageUrl = allUrls.find(url => /\.(jpg|jpeg|png|webp)/i.test(url));
    const videoUrl = allUrls.find(url => /tiktok|instagram|facebook|fb|vt\./i.test(url));

    // 2. دالة إضافية لحذف الروابط وأي جمل مرافقة لها من النصوص
    const removeUrlsAndLabels = (str) => {
        if (!str) return "";
        // حذف الروابط نفسها
        let cleaned = str.replace(urlRegex, '');
        // حذف العبارات التوضيحية التي قد تسبق الرابط
        cleaned = cleaned.replace(/(رابط فيديو الأكلة|رابط الصورة|رابط الفيديو|فيديو الوصفة)[:：]/g, '');
        return clean(cleaned);
    };

    // 3. استخراج البيانات (الاسم، المكونات، الطريقة)
    const nameMatch = text.match(/(?:اسم الأكلة|اسم الطبخة|اسم الطبق|الوصفة)[:：]\s*(.*)/i);
    const recipeName = clean(nameMatch ? nameMatch[1] : "");

    const ingredientsMatch = text.match(/(?:المكونات والمقادير|المكونات|المقادير)[:：]([\s\S]*?)(?=طريقة التحضير|التحضير:)/i);
    let ingredients = removeUrlsAndLabels(ingredientsMatch ? ingredientsMatch[1] : "");

    const methodMatch = text.match(/(?:طريقة التحضير|التحضير)[:：]([\s\S]*?)(?=نصيحة|رابط فيديو|بالهناء|$)/i);
    let method = removeUrlsAndLabels(methodMatch ? methodMatch[1] : "");

    // 4. تعبئة الحقول في الفورم
    document.getElementById('recipeName').value = recipeName;
    document.getElementById('recipeIngredients').value = ingredients;
    
    // نضع الطريقة نظيفة، ونضيف رابط الفيديو في سطر منفصل في النهاية إذا وجد
    document.getElementById('recipeMethod').value = method + (videoUrl ? `\n\n📺 فيديو الوصفة: ${videoUrl}` : "");
    
    // تعبئة رابط الصورة
    if (foundImageUrl) {
        document.getElementById('recipeImg').value = foundImageUrl;
    } else if (videoUrl && videoUrl.includes('tiktok')) {
        getTikTokThumbnail(videoUrl);
    }

    recipeForm.classList.remove('hidden');
    alert("تم التحليل! الروابط وُضعت في مكانها الصحيح وتم تنظيف الخطوات. ✨");
});
// 3. فحص الجلسة (هل ماما مسجلة دخولها؟)
async function checkUser() {
    const { data } = await _supabase.auth.getSession();
    userSession = data.session;
    
    if (userSession) {
        // إذا سجلت ماما دخولها: تظهر كل أدوات التحكم
        if (toggleFormBtn) toggleFormBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (magicParserSection) magicParserSection.classList.remove('hidden'); // إظهار أداة اللصق
        if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
    } else {
        // إذا كان زائراً: تختفي كل أدوات التحكم
        if (toggleFormBtn) toggleFormBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (magicParserSection) magicParserSection.classList.add('hidden'); // إخفاء أداة اللصق
        if (adminLoginBtn) adminLoginBtn.classList.remove('hidden');
    }
}

// 4. تسجيل الدخول والخروج
if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', async () => {
        const email = prompt("أدخلي البريد الإلكتروني:");
        const password = prompt("أدخلي كلمة السر:");
        if (email && password) {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert("خطأ: " + error.message);
            else location.reload();
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        location.reload();
    });
}

// 5. فتح وإغلاق الفورم (Add Recipe)
if (toggleFormBtn) {
    toggleFormBtn.addEventListener('click', () => {
        editingRecipeId = null;
        recipeForm.reset();
        recipeForm.querySelector('button').innerText = "حفظ الأكلة ✨";
        recipeForm.classList.toggle('hidden');
        recipeForm.classList.remove('edit-mode-active');
    });
}

// 6. جلب الأكلات وعرضها
async function fetchRecipes() {
    try {
        const { data, error } = await _supabase.from('recipes').select('*');
        if (error) throw error;
        allRecipes = data;
        renderRecipes(data);
    } catch (err) { console.error(err.message); }
}

function renderRecipes(data) {
    recipeGrid.innerHTML = '';
    data.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.onclick = () => openModal(recipe);
        card.innerHTML = `
            <img src="${recipe.image_url}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="recipe-info">
                <span class="category-tag">${recipe.category}</span>
                <h3>${recipe.name}</h3>
            </div>
        `;
        recipeGrid.appendChild(card);
    });
}

// 7. نافذة التفاصيل (المودال) - حل مشكلة الأزرار والإغلاق
function openModal(recipe) {
    document.getElementById('modalImg').src = recipe.image_url;
    document.getElementById('modalName').innerText = recipe.name;
    document.getElementById('modalIngredients').innerText = recipe.ingredients;
    document.getElementById('modalMethod').innerText = recipe.method;
    
    const footer = document.querySelector('.modal-footer');
    // إظهار أزرار التحكم فقط إذا كانت ماما مسجلة دخولها
    if (footer) footer.style.display = userSession ? "flex" : "none";

    modal.style.display = "block";

    // زر الحذف
    document.getElementById('deleteBtn').onclick = async () => {
        if (confirm("هل أنت متأكد من حذف هذه الوصفة؟")) {
            const { error } = await _supabase.from('recipes').delete().eq('id', recipe.id);
            if (!error) {
                modal.style.display = "none";
                fetchRecipes();
            } else { alert("حدث خطأ في الحذف"); }
        }
    };

    // زر التعديل
    document.getElementById('editBtn').onclick = () => {
        modal.style.display = "none";
        editingRecipeId = recipe.id;
        
        // تعبئة الفورم بالبيانات القديمة
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeImg').value = recipe.image_url;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('recipeIngredients').value = recipe.ingredients;
        document.getElementById('recipeMethod').value = recipe.method;
        
        recipeForm.querySelector('button').innerText = "تحديث الوصفة 🔄";
        recipeForm.classList.remove('hidden');
        recipeForm.classList.add('edit-mode-active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// 8. حل مشكلة إغلاق المودال
if (closeBtn) {
    closeBtn.onclick = () => { modal.style.display = "none"; };
}
window.onclick = (e) => { 
    if (e.target == modal) modal.style.display = "none"; 
};

// 9. إضافة أو تحديث الوصفة في السيرفر
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recipeData = {
        name: document.getElementById('recipeName').value,
        image_url: document.getElementById('recipeImg').value,
        category: document.getElementById('recipeCategory').value,
        ingredients: document.getElementById('recipeIngredients').value,
        method: document.getElementById('recipeMethod').value
    };

    try {
        let error;
        if (editingRecipeId) {
            const result = await _supabase.from('recipes').update(recipeData).eq('id', editingRecipeId);
            error = result.error;
        } else {
            const result = await _supabase.from('recipes').insert([recipeData]);
            error = result.error;
        }

        if (error) throw error;
        
        alert("تم الحفظ بنجاح!");

        // --- التعديل هنا ---
        recipeForm.reset(); // مسح فورم الإدخال
        if (magicPasteArea) magicPasteArea.value = ''; // مسح صندوق اللصق السحري
        // ------------------

        recipeForm.classList.add('hidden');
        editingRecipeId = null;
        fetchRecipes();
    } catch (err) { alert("خطأ: " + err.message); }
});

// 10. الفلترة
window.filterRecipes = (cat) => {
    renderRecipes(cat === 'الكل' ? allRecipes : allRecipes.filter(r => r.category === cat));
};

// تشغيل عند التحميل
checkUser();
fetchRecipes();