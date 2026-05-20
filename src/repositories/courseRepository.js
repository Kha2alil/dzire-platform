const courseCrud = require('./course/courseCrud');
const chapterCrud = require('./course/chapterCrud');
const lessonCrud = require('./course/lessonCrud');
const assessmentCrud = require('./course/assessmentCrud');
const questionCrud = require('./course/questionCrud');
const studentProgress = require('./course/studentProgress');
const teacherAnalytics = require('./course/teacherAnalytics');
const studentAssessmentStatus = require('./course/studentAssessmentStatus');
const courseStats = require('./course/courseStats');
const subdomainHelper = require('./course/subdomainHelper');

module.exports = {
    ...courseCrud,
    ...chapterCrud,
    ...lessonCrud,
    ...assessmentCrud,
    ...questionCrud,
    ...studentProgress,
    ...teacherAnalytics,
    ...studentAssessmentStatus,
    ...courseStats,
    ...subdomainHelper
};