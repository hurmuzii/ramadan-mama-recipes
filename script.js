// إعدادات الاتصال بـ Supabase
// ستحصل على هذه القيم من إعدادات مشروعك في Supabase (Settings > API)
const SUPABASE_URL = 'https://epzlgnvdquiifulgprox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwemxnbnZkcXVpaWZ1bGdwcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTUxNjksImV4cCI6MjA4MzI5MTE2OX0.P8MnSSVb8agPffKJ_mlK3I5czTs7Rg0BbYWQIgJhE-Y';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. تعريف العناصر من الـ HTML
const recipeForm = document.getElementById('recipeForm');
const recipeGrid = document.getElementById('recipeGrid');
const modal = document.getElementById('recipeModal');
const toggleFormBtn = document.getElementById('toggleFormBtn'); // هذا السطر الذي كان ناقصاً

let allRecipes = [];
let editingRecipeId = null;

// 3. وظيفة زر "إضافة وصفة جديدة +" (إظهار وإخفاء الفورم)
if (toggleFormBtn) {
    toggleFormBtn.addEventListener('click', () => {
        editingRecipeId = null; 
        recipeForm.reset();
        recipeForm.querySelector('button').innerText = "حفظ الأكلة ✨";
        recipeForm.classList.toggle('hidden'); // يظهر الفورم أو يخفيه
    });
}

// 4. جلب البيانات من Supabase
async function fetchRecipes() {
    try {
        const { data, error } = await _supabase.from('recipes').select('*');
        if (error) throw error;
        allRecipes = data;
        renderRecipes(data);
    } catch (err) { console.error('خطأ في الجلب:', err.message); }
}

// 5. إضافة أكلة جديدة أو تحديثها
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = prompt("الرمز السري مطلوب:");
    if (password !== "22694") return alert("الرمز خاطئ!");

    const recipeData = {
        name: document.getElementById('recipeName').value,
        image_url: document.getElementById('recipeImg').value,
        category: document.getElementById('recipeCategory').value,
        ingredients: document.getElementById('recipeIngredients').value,
        method: document.getElementById('recipeMethod').value
    };

    try {
        if (editingRecipeId) {
            const { error } = await _supabase.from('recipes').update(recipeData).eq('id', editingRecipeId);
            if (error) throw error;
            alert("تم التعديل بنجاح!");
        } else {
            const { error } = await _supabase.from('recipes').insert([recipeData]);
            if (error) throw error;
            alert("تمت الإضافة بنجاح!");
        }
        
        recipeForm.reset();
        recipeForm.classList.add('hidden');
        editingRecipeId = null;
        fetchRecipes();
    } catch (err) { alert("خطأ: " + err.message); }
});

// 6. عرض البطاقات في الصفحة
function renderRecipes(data) {
    recipeGrid.innerHTML = '';
    data.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.onclick = () => openModal(recipe);
        card.innerHTML = `
            <img src="${recipe.image_url}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة+مفقودة'">
            <div class="recipe-info">
                <span class="category-tag">${recipe.category}</span>
                <h3>${recipe.name}</h3>
                <p style="color: #888; font-size: 12px;">اضغط للتفاصيل</p>
            </div>
        `;
        recipeGrid.appendChild(card);
    });
}

// 7. نافذة التفاصيل (الحذف والتعديل)
function openModal(recipe) {
    document.getElementById('modalImg').src = recipe.image_url;
    document.getElementById('modalName').innerText = recipe.name;
    document.getElementById('modalIngredients').innerText = recipe.ingredients;
    document.getElementById('modalMethod').innerText = recipe.method;
    modal.style.display = "block";

    document.getElementById('deleteBtn').onclick = async () => {
        const password = prompt("رمز الحذف:");
        if (password === "22694") {
            const { error } = await _supabase.from('recipes').delete().eq('id', recipe.id);
            if (!error) {
                modal.style.display = "none";
                fetchRecipes();
            }
        }
    };

    document.getElementById('editBtn').onclick = () => {
        modal.style.display = "none";
        editingRecipeId = recipe.id;
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeImg').value = recipe.image_url;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('recipeIngredients').value = recipe.ingredients;
        document.getElementById('recipeMethod').value = recipe.method;
        recipeForm.querySelector('button').innerText = "تحديث الوصفة";
        recipeForm.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// 8. إغلاق النافذة والفلترة
const closeBtn = document.querySelector('.close-btn');
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

window.filterRecipes = (cat) => renderRecipes(cat === 'الكل' ? allRecipes : allRecipes.filter(r => r.category === cat));

// تشغيل الجلب عند التحميل
fetchRecipes();