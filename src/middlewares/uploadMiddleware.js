const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// إنشاء المجلدات إذا لم تكن موجودة
// Create folders if they don't exist
// ============================================================
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir('uploads/thumbnails');    // صور خلفية الكورس / course thumbnails
ensureDir('uploads/videos');        // فيديوهات الدروس / lesson videos
ensureDir('uploads/pdfs');          // ملفات PDF للدروس / lesson PDFs
ensureDir('uploads/avatars');       // صور المستخدمين / user avatars

// ============================================================
// إعداد التخزين المحلي
// Configure local storage
// ============================================================
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        // نحدد المجلد حسب نوع الملف / determine folder based on file type
        let uploadPath = 'uploads/';

        if (file.fieldname === 'thumbnail') {
            uploadPath += 'thumbnails';
        } else if (file.mimetype.startsWith('video/')) {
            uploadPath += 'videos';
        } else if (file.mimetype === 'application/pdf') {
            uploadPath += 'pdfs';
        } else {
            uploadPath += 'misc';
            ensureDir(uploadPath);
        }

        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        // اسم فريد: timestamp + اسم أصلي آمن
        // Unique name: timestamp + safe original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// ============================================================
// فلترة أنواع الملفات المسموحة
// Filter allowed file types
// ============================================================
const fileFilter = (req, file, cb) => {

    const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideos = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    const allowedPdfs  = ['application/pdf'];

    if (file.fieldname === 'thumbnail') {
        // صورة الغلاف: JPEG, PNG, WEBP فقط
        if (allowedImages.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error('صورة الغلاف يجب أن تكون JPEG أو PNG أو WEBP / Thumbnail must be JPEG, PNG, or WEBP'), false);
    }

    if (file.fieldname === 'content') {
        // محتوى الدرس: فيديو أو PDF فقط
        if ([...allowedVideos, ...allowedPdfs].includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error('محتوى الدرس يجب أن يكون فيديو أو PDF / Lesson content must be a video or PDF'), false);
    }

    cb(new Error('نوع الملف غير مسموح / File type not allowed'), false);
};

// ============================================================
// إعداد Multer الرئيسي
// Main Multer configuration
// ============================================================
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024  // حد أقصى 500MB / max 500MB
    }
});

// ============================================================
// Middlewares جاهزة للاستخدام
// Ready-to-use Middlewares
// ============================================================

/**
 * رفع صورة غلاف الكورس فقط
 * Upload course thumbnail only
 * POST /api/courses/:id/thumbnail
 */
const uploadThumbnail = upload.single('thumbnail');

/**
 * رفع محتوى الدرس (فيديو أو PDF) فقط
 * Upload lesson content (video or PDF) only
 * POST /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId/content
 */
const uploadLessonContent = upload.single('content');

/**
 * معالج أخطاء Multer
 * Multer error handler
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'حجم الملف كبير جداً، الحد الأقصى 500MB / File too large, max size is 500MB'
            });
        }
        return res.status(400).json({ success: false, message: err.message });
    }

    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }

    next();
};

module.exports = {
    uploadThumbnail,
    uploadLessonContent,
    handleUploadError
};
