function detectCategory(text) {
    const t = text.toLowerCase();
    // Soups (checked before main to avoid misclassification)
    if (t.includes('شوربة') || t.includes('حساء') || t.includes('مرق')) return 'soups';
    if (t.includes('سكر') || t.includes('حلى') || t.includes('كيك') || t.includes('شوكول') || t.includes('creamy') || t.includes('baking') || t.includes('بسكويت') || t.includes('كريم')) return 'sweets';
    if (t.includes('عصير') || t.includes('سموثي') || t.includes('قهوة') || t.includes('شاي') || t.includes('drink') || t.includes('latte') || t.includes('mojito')) return 'drinks';
    if (t.includes('سلطة') || t.includes('مقبلات') || t.includes('بطاطس') || t.includes('fingers') || t.includes('snack')) return 'snacks';
    return 'main'; // Default
}

export const magicParser = async (text) => {
    if (!text) return null;

    // --- 1. Filter & Cleaning ---
    let clean = text.replace(/This message was sent automatically with n8n/g, '');
    clean = clean.replace(/\*\*/g, '')
        .replace(/---/g, '')
        .trim();

    let cleanedText = clean;
    const category = detectCategory(cleanedText);

    const result = {
        name: '',
        ingredients: '',
        method: '',
        video_url: '',
        image_url: '',
        category: category
    };

    // --- 2. Extract Links (Video/Image) ---
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let textWithoutLinks = cleanedText;

    const foundUrls = cleanedText.match(urlRegex) || [];
    for (const url of foundUrls) {
        const lowerUrl = url.toLowerCase();
        if (/\.(jpeg|jpg|png|webp)$/i.test(lowerUrl)) {
            result.image_url = url;
            textWithoutLinks = textWithoutLinks.replace(url, '');
        } else if (/tiktok|instagram|fb\.com|vt\./.test(lowerUrl)) {
            result.video_url = url;
            textWithoutLinks = textWithoutLinks.replace(url, '');
        }
    }

    // --- 3. Smart Logic: Keywords Mapping ---
    const lines = textWithoutLinks.split('\n').map(l => l.trim()).filter(l => l);

    let currentSection = 'unknown';
    let ingredientsBuffer = [];
    let methodBuffer = [];

    // Flexible keyword regex — supports ###, **, :, and mixed Arabic variants
    const nameKeywords = /^([#*]+)?\s*(اسم الأكلة|اسم الطبخة|اسم الطبق|الوصفة)[\s*:]*/i;
    // FIX: Added "المكونات والمقادير" which was in test data but missing from parser
    const ingredientsKeywords = /^([#*]+)?\s*(المكونات والمقادير|المكونات|المقادير)[\s*:]*/i;
    const methodKeywords = /^([#*]+)?\s*(طريقة التحضير|التحضير|الخطوات|طريقة)[\s*:]*/i;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (nameKeywords.test(line)) {
            const val = line.replace(nameKeywords, '').trim();
            if (val) result.name = val;
            currentSection = 'name';
            continue;
        }
        if (ingredientsKeywords.test(line)) {
            currentSection = 'ingredients';
            continue;
        }
        if (methodKeywords.test(line)) {
            currentSection = 'method';
            continue;
        }

        if (currentSection === 'ingredients') {
            ingredientsBuffer.push(line);
        } else if (currentSection === 'method') {
            methodBuffer.push(line);
        } else if (currentSection === 'name') {
            if (!result.name) result.name = line;
        } else {
            if (!result.name) result.name = line;
        }
    }

    result.ingredients = ingredientsBuffer.join('\n');
    result.method = methodBuffer.join('\n');

    // --- 4. TikTok Thumbnail with Timeout ---
    if (!result.image_url && result.video_url && result.video_url.includes('tiktok')) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const oembed = `https://www.tiktok.com/oembed?url=${result.video_url}`;
            const res = await fetch(oembed, { signal: controller.signal });
            clearTimeout(timeout);
            const json = await res.json();
            if (json.thumbnail_url) result.image_url = json.thumbnail_url;
        } catch (e) {
            // Timed out or network error — silently ignore
        }
    }

    return result;
};
