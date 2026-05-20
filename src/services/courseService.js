const courseCore = require('./course/courseCore');
const chapterService = require('./course/chapterService');
const lessonService = require('./course/lessonService');
const assessmentService = require('./course/assessmentService');
const questionService = require('./course/questionService');
const progressService = require('./course/progressService');
const searchService = require('./course/searchService');
const subdomainService = require('./course/subdomainService');

module.exports = {
    ...courseCore,
    ...chapterService,
    ...lessonService,
    ...assessmentService,
    ...questionService,
    ...progressService,
    ...searchService,
    ...subdomainService
};