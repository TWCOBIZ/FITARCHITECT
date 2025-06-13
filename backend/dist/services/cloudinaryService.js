"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPublicId = exports.deleteImage = exports.uploadImageBuffer = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Configure multer for memory storage
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
// Upload image buffer directly to Cloudinary
const uploadImageBuffer = async (buffer, filename) => {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.upload_stream({
            folder: 'fitarchitect/avatars',
            public_id: `avatar_${Date.now()}_${filename}`,
            transformation: [
                { width: 200, height: 200, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ],
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve((result === null || result === void 0 ? void 0 : result.secure_url) || '');
            }
        }).end(buffer);
    });
};
exports.uploadImageBuffer = uploadImageBuffer;
// Delete image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};
exports.deleteImage = deleteImage;
// Extract public ID from Cloudinary URL
const extractPublicId = (url) => {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return matches ? matches[1] : '';
};
exports.extractPublicId = extractPublicId;
exports.default = cloudinary_1.v2;
