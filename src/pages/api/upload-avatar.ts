import type { NextApiRequest, NextApiResponse } from 'next';
import { default as nextConnect } from 'next-connect';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Cloudinary config from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|webp)/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, or WEBP image files are allowed!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error, req, res) {
    res.status(501).json({ error: `Upload error: ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('avatar'));

apiRoute.post(async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    // Upload to Cloudinary from buffer
    const streamUpload = (fileBuffer: Buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'avatars',
            transformation: [{ width: 800, height: 800, crop: 'limit' }],
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };
    const result: any = await streamUpload(req.file.buffer);
    res.status(200).json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed. Please try again.' });
  }
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false,
  },
}; 