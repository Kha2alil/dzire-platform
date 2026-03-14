const multer  = require('multer');
const path    = require('path');

// ═══════════════════════════════
// أين نحفظ الملف + ما اسمه
// Where to save the file + what to name it
// ═══════════════════════════════
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/');
    },

    filename: (req, file, cb) => {
        // اسم الملف = user_id + timestamp + extension
        // filename = user_id + timestamp + extension
        // مثال / example: 278c6451_1741939456123.jpg
        const ext      = path.extname(file.originalname).toLowerCase();
        const filename = `${req.user.id}_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

// ═══════════════════════════════
// فلتر — فقط صور JPG و PNG
// Filter — only JPG and PNG images
// ═══════════════════════════════
const fileFilter = (req, file, cb) => {

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);     // ✅ اقبل الملف / accept the file
    } else {
        cb(new Error('يجب أن يكون الملف صورة JPG أو PNG / File must be JPG or PNG'), false);
    }
};

// ═══════════════════════════════
// إعداد Multer
// Multer config
// ═══════════════════════════════
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024   // 2MB max
    }
});

module.exports = upload;