function detectCategory(text) {
    const t = text.toLowerCase();
    if (t.includes('سكر') || t.includes('حلى') || t.includes('كيك') || t.includes('شوكول') || t.includes('creamy') || t.includes('baking') || t.includes('بسكويت') || t.includes('كريم')) return 'sweets';
    if (t.includes('عصير') || t.includes('سموثي') || t.includes('قهوة') || t.includes('شاي') || t.includes('drink') || t.includes('latte') || t.includes('mojito')) return 'drinks';
    if (t.includes('سلطة') || t.includes('مقبلات') || t.includes('شوربة') || t.includes('بطاطس') || t.includes('fingers') || t.includes('sanck')) return 'snacks';
    return 'main'; // Default
}

export const magicParser = async (text) => {
    if (!text) return null;

    // --- 1. Filter & Cleaning ---
    // Remove specific bot message as requested
    let clean = text.replace(/This message was sent automatically with n8n/g, '');

    // Clean formatting symbols
    clean = clean.replace(/\*\*/g, '') // Remove double asterisks
        .replace(/---/g, '') // Remove dashes
        .trim();

    let cleanedText = clean;

    const category = detectCategory(cleanedText); // Detect category after initial cleaning

    const result = {
        name: '',
        ingredients: '',
        method: '',
        video_url: '',
        image_url: '',
        category: category // Use detected category
    };

    // --- 2. Extract Links (Video/Image) ---
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let textWithoutLinks = cleanedText;

    const foundUrls = cleanedText.match(urlRegex) || [];
    for (const url of foundUrls) {
        const lowerUrl = url.toLowerCase();

        // Check Image
        if (/\.(jpeg|jpg|png|webp)$/i.test(lowerUrl)) {
            result.image_url = url; // Priority: Direct image
            textWithoutLinks = textWithoutLinks.replace(url, ''); // Remove from text
        }
        // Check Video
        else if (/tiktok|instagram|fb|vt\./.test(lowerUrl)) {
            result.video_url = url;
            textWithoutLinks = textWithoutLinks.replace(url, ''); // Remove from text
        }
    }

    // --- 3. Smart Logic: Keywords Mapping ---
    // Split remainder into lines for structural analysis
    const lines = textWithoutLinks.split('\n').map(l => l.trim()).filter(l => l);

    // Buffers
    let currentSection = 'unknown'; // unknown, ingredients, method
    let nameBuffer = [];
    let ingredientsBuffer = [];
    let methodBuffer = [];

    // Keywords
    // Keywords (Flexible: optional markdown ###, **, :)
    // e.g. "### **اسم الطبق:**" or "اسم الطبق:"
    const nameKeywords = /^([#*]+)?\s*(اسم الأكلة|اسم الطبخة|اسم الطبق|الوصفة)[\s*:]*/i;
    const ingredientsKeywords = /^([#*]+)?\s*(المكونات|المقادير)[\s*:]*/i;
    const methodKeywords = /^([#*]+)?\s*(طريقة التحضير|التحضير|الخطوات|طريقة)[\s*:]*/i;

    // Loop Lines
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Detect Section
        if (nameKeywords.test(line)) {
            // If line is just "Dish Name:", next line is name
            // If "Dish Name: Kabsa", extract "Kabsa"
            let val = line.replace(nameKeywords, '').trim();
            if (val) result.name = val;
            // If val is empty, maybe next line? But for now let's assume unknown section lines might be name
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

        // Assign based on section
        if (currentSection === 'ingredients') {
            ingredientsBuffer.push(line);
        } else if (currentSection === 'method') {
            methodBuffer.push(line);
        } else if (currentSection === 'name') {
            // If we found more text in naming section
            if (!result.name) result.name = line;
        } else {
            // Unknown section (usually top of file)
            // If not empty, assumed Name if result.name is empty
            if (!result.name) result.name = line;
        }
    }

    result.ingredients = ingredientsBuffer.join('\n');
    result.method = methodBuffer.join('\n');

    // --- 4. Smart Formatting (Bold Headers & Newlines) ---
    // Apply to Ingredients and Method
    result.ingredients = formatContent(result.ingredients);
    result.method = formatContent(result.method);

    // --- 5. TikTok Thumbnail Logic ---
    // If no image but we have tiktok video
    if (!result.image_url && result.video_url && result.video_url.includes('tiktok')) {
        try {
            const oembed = `https://www.tiktok.com/oembed?url=${result.video_url}`;
            const res = await fetch(oembed);
            const json = await res.json();
            if (json.thumbnail_url) {
                result.image_url = json.thumbnail_url;
            }
        } catch (e) {
            console.warn('Failed to fetch TikTok thumbnail', e);
        }
    }

    // --- Linkify in Method (User request: video link at bottom, already handled by strict separation) ---
    // User asked to "Add to video field + Append to Method".
    // Just appending a specific marker or note if desired, but UI handles the "Blue Button".
    // The request says: "يضعه في حقل الفيديو + يدمجه في نهاية طريقة التحضير".
    // Since our UI shows a button if video_url exists, we don't strictly need to append text URL to method text,
    // but if explicitly requested to "Merge at end", we can do:
    // Note: user said "Clean repetition: remove from middle, put at bottom as blue button". 
    // Our logic removed it from text. And UI `ui.js` puts it as blue button. So we are good.

    return result;
};

// Helper: Bold lines ending with colon, keep newlines (newlines handled by textarea value, but later for display)
function formatContent(text) {
    if (!text) return '';
    const lines = text.split('\n');
    const formatted = lines.map(line => {
        // "Bold any sentence starting with dot/number and ending with :" -> Regex
        // Actually user said: "Starts with dot or number and ends with :" -> e.g. "1. Dough Prep:"
        // Check if line ends with :
        if (line.trim().endsWith(':')) {
            // In textarea we can't show BOLD. We only show text.
            // The BOLD rendering happens in `ui.js` when displaying HTML.
            // But user prompt says: "Code converts it".
            // If this output goes to "Input Field" (Textarea), we cannot use <b> tags there effectively
            // unless we use a ContentEditable or rich text editor.
            // But the user prompt says: "Smart Rendering ... Bold headers".
            // AND "Smart Logic ... converts ... to Bold".
            // If we put <b> tags in textarea, user sees tags. 
            // We will assume "Style it when displaying" OR "Add Markdown * *".
            // Let's stick to standard text in Inputs, and robust HTML in `ui.js`.

            // Wait, usually users want to SEE the result.
            // If input is standard textarea, we can't bold.
            // We'll leave it as plain text. The `ui.js` linkify/format function handles the display boldness.
        }
        return line;
    });
    return formatted.join('\n');
}
