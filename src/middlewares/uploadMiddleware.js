const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ============================================================
// إنشاء المجلدات إذا لم تكن موجودة
// Create folders if they don't exist
// ============================================================
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir('uploads/avatars');       // صور المستخدمين     / user avatars
ensureDir('uploads/thumbnails');    // صور غلاف الكورس    / course thumbnails
ensureDir('uploads/videos');        // فيديوهات الدروس    / lesson videos
ensureDir('uploads/pdfs');          // ملفات PDF للدروس   / lesson PDFs

// ============================================================
// إعداد التخزين المحلي
// Configure local storage
// ============================================================
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        let uploadPath = 'uploads/';

        if (file.fieldname === 'avatar') {
            // صورة المستخدم (feature/auth)
            uploadPath += 'avatars';

        } else if (file.fieldname === 'thumbnail') {
            // صورة غلاف الكورس (feature/courses)
            uploadPath += 'thumbnails';

        } else if (file.fieldname === 'content') {
            // محتوى الدرس — فيديو أو PDF (feature/courses)
            if (file.mimetype.startsWith('video/')) {
                uploadPath += 'videos';
            } else if (file.mimetype === 'application/pdf') {
                uploadPath += 'pdfs';
            } else {
                uploadPath += 'misc';
                ensureDir(uploadPath);
            }

        } else {
            uploadPath += 'misc';
            ensureDir(uploadPath);
        }

        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname).toLowerCase();

        if (file.fieldname === 'avatar') {
            // اسم الملف = user_id + timestamp (feature/auth style — predictable, easy to find)
            // filename = user_id + timestamp
            // مثال / example: 278c6451_1741939456123.jpg
            const filename = `${req.user.id}_${Date.now()}${ext}`;
            cb(null, filename);

        } else {
            // اسم فريد عام: fieldname + timestamp + random (feature/courses style)
            // Generic unique name: fieldname + timestamp + random
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
    }
});

// ============================================================
// فلترة أنواع الملفات المسموحة
// Filter allowed file types
// ============================================================
const fileFilter = (req, file, cb) => {

    const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideos = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    const allowedPdfs   = ['application/pdf'];

    if (file.fieldname === 'avatar') {
        // feature/auth: JPG و PNG فقط (webp added for consistency)
        if (allowedImages.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(
            new Error('يجب أن يكون الملف صورة JPG أو PNG أو WEBP / File must be JPG, PNG, or WEBP'),
            false
        );
    }

    if (file.fieldname === 'thumbnail') {
        // feature/courses: صورة غلاف الكورس
        if (allowedImages.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(
            new Error('صورة الغلاف يجب أن تكون JPEG أو PNG أو WEBP / Thumbnail must be JPEG, PNG, or WEBP'),
            false
        );
    }

    if (file.fieldname === 'content') {
        // feature/courses: فيديو أو PDF فقط
        if ([...allowedVideos, ...allowedPdfs].includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(
            new Error('محتوى الدرس يجب أن يكون فيديو أو PDF / Lesson content must be a video or PDF'),
            false
        );
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
        fileSize: 500 * 1024 * 1024     // 500MB — covers both avatars and course videos
    }
});

// ============================================================
// Middlewares جاهزة للاستخدام
// Ready-to-use Middlewares
// ============================================================

/**
 * رفع الصورة الشخصية للمستخدم
 * Upload user avatar
 * POST /api/profile/avatar
 */
const uploadAvatar = upload.single('avatar');

/**
 * رفع صورة غلاف الكورس
 * Upload course thumbnail
 * POST /api/courses/:id/thumbnail
 */
const uploadThumbnail = upload.single('thumbnail');

/**
 * رفع محتوى الدرس (فيديو أو PDF)
 * Upload lesson content (video or PDF)
 * POST /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId/content
 */
const uploadLessonContent = upload.single('content');

/**
 * معالج أخطاء Multer — يُوضع بعد أي upload middleware في الـ route
 * Multer error handler — place after any upload middleware in the route
 *
 * مثال / example:
 *   router.post('/avatar', authMiddleware, uploadAvatar, handleUploadError, profileController.uploadAvatar)
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
    uploadAvatar,
    uploadThumbnail,
    uploadLessonContent,
    handleUploadError
};